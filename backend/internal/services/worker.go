package services

import (
	"context"
	"fmt"
	"time"

	"github.com/kreasinusantara/ui-generator-backend/internal/ai"
	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/logger"
	"github.com/kreasinusantara/ui-generator-backend/internal/renderer"
	"github.com/kreasinusantara/ui-generator-backend/internal/schema"
)

// GenerationWorker runs a single generation/refine job in-process (the async
// Redis-queue consumer loop was removed with cmd/worker — generation now runs
// inline via the batch goroutines and this ProcessJob entrypoint).
type GenerationWorker struct {
	log        logger.Logger
	studio     *StudioService
	aiProvider ai.Provider
}

func NewGenerationWorker(log logger.Logger, studio *StudioService, aiProvider ai.Provider) *GenerationWorker {
	return &GenerationWorker{
		log:        log,
		studio:     studio,
		aiProvider: aiProvider,
	}
}

func (w *GenerationWorker) ProcessJob(ctx context.Context, jobID string, userID string, operation string, sectionIndex int) error {
	job, err := w.studio.jobs.FindOwned(ctx, userID, jobID)
	if err != nil {
		return fmt.Errorf("failed to find job: %w", err)
	}

	// Idempotency guard: never reprocess a job that already reached a terminal
	// state. This protects against double execution when both an async worker
	// and an inline processor observe the same job.
	switch job.Status {
	case "succeeded", "failed", "refunded", "canceled", "cancelled":
		return nil
	}

	err = w.studio.jobs.UpdateStatus(ctx, jobID, "processing", "")
	if err != nil {
		w.log.Error("failed to update status to processing", map[string]interface{}{"jobId": jobID, "error": err.Error()})
	}

	var pageSchema schema.PageSchema
	var response ai.GenerateResponse
	var page domain.Page

	page, err = w.studio.pages.FindOwned(ctx, userID, job.PageID)
	if err != nil {
		return w.failJob(ctx, job, "failed to fetch page: "+err.Error())
	}

	if operation == "generate" {
		response, err = w.aiProvider.GenerateSchema(ctx, ai.GenerateRequest{
			Prompt:    job.Prompt,
			PageType:  job.PageType,
			Domain:    job.Domain,
			ThemeSlug: job.ThemeSlug,
		})
		if err != nil {
			return w.failJob(ctx, job, "AI generation failed: "+err.Error())
		}
		pageSchema = response.Schema
	} else if operation == "refine" {
		if page.CurrentVersionID == "" {
			return w.failJob(ctx, job, "page has no active version to refine")
		}
		currentVersion, err := w.studio.versions.FindOwned(ctx, userID, page.ID, page.CurrentVersionID)
		if err != nil {
			return w.failJob(ctx, job, "current version not found: "+err.Error())
		}
		currentSchema, err := fromMap(currentVersion.SchemaJSON)
		if err != nil {
			return w.failJob(ctx, job, "failed to parse current schema: "+err.Error())
		}

		response, err = w.aiProvider.RefineSection(ctx, ai.RefineRequest{
			Prompt:       job.Prompt,
			Schema:       currentSchema,
			SectionIndex: sectionIndex,
		})
		if err != nil {
			return w.failJob(ctx, job, "AI refinement failed: "+err.Error())
		}
		pageSchema = response.Schema
	} else {
		return w.failJob(ctx, job, "unsupported operation: "+operation)
	}

	if err := schema.Validate(pageSchema); err != nil {
		return w.failJob(ctx, job, "invalid generated schema: "+err.Error())
	}

	library := w.studio.themeLibrary(ctx, job.ThemeSlug)
	generatedCode := renderer.Generate(pageSchema, job.OutputMode, library)
	qualityScore := scoreSchema(pageSchema)
	schemaMap, err := toMap(pageSchema)
	if err != nil {
		return w.failJob(ctx, job, "failed to marshal schema: "+err.Error())
	}

	var version domain.PageVersion
	err = w.studio.tx.WithTx(ctx, func(txCtx context.Context) error {
		vNum, err := w.studio.versions.NextVersionNumber(txCtx, page.ID)
		if err != nil {
			return err
		}

		vID, err := newID()
		if err != nil {
			return err
		}

		version = domain.PageVersion{
			ID:            vID,
			PageID:        page.ID,
			VersionNumber: vNum,
			Prompt:        job.Prompt,
			SchemaJSON:    schemaMap,
			GeneratedCode: generatedCode,
			QualityScore:  qualityScore,
			CreatedBy:     job.UserID,
			CreatedAt:     time.Now().UTC(),
		}
		_, err = w.studio.versions.Create(txCtx, version)
		if err != nil {
			return err
		}

		err = w.studio.pages.SetCurrentVersion(txCtx, userID, page.ID, version.ID)
		if err != nil {
			return err
		}

		err = w.studio.jobs.UpdateStatus(txCtx, job.ID, "succeeded", "")
		if err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return w.failJob(ctx, job, "failed to save output in transaction: "+err.Error())
	}

	w.log.Info("job task succeeded", map[string]interface{}{"jobId": job.ID})
	return nil
}

func (w *GenerationWorker) failJob(ctx context.Context, job domain.GenerationJob, errMsg string) error {
	w.log.Error("job failed", map[string]interface{}{"jobId": job.ID, "error": errMsg})

	_ = w.studio.jobs.UpdateStatus(ctx, job.ID, "failed", errMsg)

	err := w.studio.tx.WithTx(ctx, func(txCtx context.Context) error {
		wallet, err := w.studio.wallets.GetForUpdate(txCtx, job.UserID)
		if err != nil {
			return err
		}
		wallet.Balance += 1
		err = w.studio.wallets.Upsert(txCtx, wallet)
		if err != nil {
			return err
		}

		txID, err := newID()
		if err != nil {
			return err
		}
		_, err = w.studio.transactions.Create(txCtx, domain.CreditTransaction{
			ID:            txID,
			UserID:        job.UserID,
			Type:          "refund",
			Amount:        1,
			BalanceAfter:  wallet.Balance,
			ReferenceType: "generation_job",
			ReferenceID:   job.ID,
			Description:   "Refund credit due to failure: " + errMsg,
		})
		return err
	})

	if err != nil {
		w.log.Error("failed to refund credit", map[string]interface{}{"jobId": job.ID, "error": err.Error()})
	}

	return fmt.Errorf("job failed: %s", errMsg)
}
