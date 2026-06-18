package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kreasinusantara/ui-generator-backend/internal/http/middleware"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/services"
)

// idempotencyKey returns the client Idempotency-Key header, falling back to the
// request id so generation always has a stable key.
func idempotencyKey(c *gin.Context) string {
	if key := c.GetHeader("Idempotency-Key"); key != "" {
		return key
	}
	return middleware.RequestIDFrom(c)
}

// ---- Projects (frontend contract: raw camelCase shapes) -------------------

func (h *Handler) FEListProjects(c *gin.Context) {
	projects, err := h.frontend.ListProjects(c.Request.Context(), mustUser(c).ID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, projects)
}

func (h *Handler) FEGetProject(c *gin.Context) {
	project, err := h.frontend.GetProject(c.Request.Context(), mustUser(c).ID, c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, project)
}

func (h *Handler) FECreateProject(c *gin.Context) {
	var input services.CreateProjectFEInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	project, err := h.frontend.CreateProject(c.Request.Context(), mustUser(c).ID, input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, project)
}

func (h *Handler) FEUpdateProject(c *gin.Context) {
	var input services.UpdateProjectFEInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	project, err := h.frontend.UpdateProject(c.Request.Context(), mustUser(c).ID, c.Param("id"), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, project)
}

func (h *Handler) FEDeleteProject(c *gin.Context) {
	if err := h.frontend.DeleteProject(c.Request.Context(), mustUser(c).ID, c.Param("id")); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ---- Versions & generation ------------------------------------------------

func (h *Handler) FEListVersions(c *gin.Context) {
	versions, err := h.frontend.ListVersions(c.Request.Context(), mustUser(c).ID, c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, versions)
}

// FEVersionByID handles GET /projects/:id/versions/:versionId. The special value
// "active" returns the project's currently active version (or null).
func (h *Handler) FEVersionByID(c *gin.Context) {
	userID := mustUser(c).ID
	projectID := c.Param("id")
	versionID := c.Param("versionId")
	if versionID == "active" {
		version, err := h.frontend.ActiveVersion(c.Request.Context(), userID, projectID)
		if err != nil {
			writeServiceError(c, err)
			return
		}
		if version == nil {
			c.JSON(http.StatusOK, nil)
			return
		}
		c.JSON(http.StatusOK, version)
		return
	}
	version, err := h.frontend.GetVersion(c.Request.Context(), userID, projectID, versionID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, version)
}

func (h *Handler) FEVersionFiles(c *gin.Context) {
	files, err := h.frontend.VersionFiles(c.Request.Context(), mustUser(c).ID, c.Param("id"), c.Param("versionId"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, files)
}

func (h *Handler) FERestoreVersion(c *gin.Context) {
	version, err := h.frontend.RestoreVersion(c.Request.Context(), mustUser(c).ID, c.Param("id"), c.Param("versionId"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, version)
}

func (h *Handler) FEGenerate(c *gin.Context) {
	var input services.GenerateFEInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	job, err := h.frontend.Generate(c.Request.Context(), mustUser(c).ID, c.Param("id"), idempotencyKey(c), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, job)
}

func (h *Handler) FEGeneratePages(c *gin.Context) {
	var input services.GenerateAppInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	// Async: kick off generation in the background and return the batch to poll.
	batch, err := h.frontend.StartGenerationBatch(c.Request.Context(), mustUser(c).ID, c.Param("id"), idempotencyKey(c), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, batch)
}

func (h *Handler) FEGetBatch(c *gin.Context) {
	batch, err := h.frontend.GetBatch(mustUser(c).ID, c.Param("batchId"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, batch)
}

// FEBatchEvents streams batch progress as Server-Sent Events so the studio canvas
// updates per-screen in real time (sub-second) instead of polling every 2.5s. The
// server ticks the in-memory batch and pushes a frame only when it changes, until
// the batch reaches a terminal state or the client disconnects.
func (h *Handler) FEBatchEvents(c *gin.Context) {
	userID := mustUser(c).ID
	batchID := c.Param("batchId")

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		writeError(c, apperrors.Internal("streaming unsupported"))
		return
	}

	ctx := c.Request.Context()
	ticker := time.NewTicker(400 * time.Millisecond)
	defer ticker.Stop()

	first := true
	lastCompleted, lastTotal := -1, -1
	lastStatus := ""
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			batch, err := h.frontend.GetBatch(userID, batchID)
			if err != nil {
				fmt.Fprint(c.Writer, "event: error\ndata: {\"error\":\"not found\"}\n\n")
				flusher.Flush()
				return
			}
			if first || batch.Completed != lastCompleted || batch.Status != lastStatus || batch.Total != lastTotal {
				first = false
				lastCompleted, lastTotal, lastStatus = batch.Completed, batch.Total, batch.Status
				if data, mErr := json.Marshal(batch); mErr == nil {
					fmt.Fprintf(c.Writer, "data: %s\n\n", data)
					flusher.Flush()
				}
			}
			if batch.Status == "completed" || batch.Status == "failed" {
				return
			}
		}
	}
}

func (h *Handler) FEProjectPages(c *gin.Context) {
	pages, err := h.frontend.ProjectPages(c.Request.Context(), mustUser(c).ID, c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, pages)
}

// FEProjectExportZip streams a .zip of all generated files for the project.
func (h *Handler) FEProjectExportZip(c *gin.Context) {
	data, filename, err := h.frontend.ExportProjectZip(c.Request.Context(), mustUser(c).ID, c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/zip", data)
}

func (h *Handler) FERefine(c *gin.Context) {
	var input services.RefineFEInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	version, err := h.frontend.Refine(c.Request.Context(), mustUser(c).ID, c.Param("id"), idempotencyKey(c), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, version)
}

// ---- Credits --------------------------------------------------------------

func (h *Handler) FECreditBalance(c *gin.Context) {
	balance, err := h.frontend.CreditBalance(c.Request.Context(), mustUser(c).ID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, balance)
}

func (h *Handler) FECreditTransactions(c *gin.Context) {
	txs, err := h.frontend.CreditTransactions(c.Request.Context(), mustUser(c).ID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, txs)
}

func (h *Handler) FEPreviewCost(c *gin.Context) {
	var body struct {
		ThemeSlug string `json:"themeSlug"`
	}
	_ = c.ShouldBindJSON(&body)
	c.JSON(http.StatusOK, gin.H{"cost": h.frontend.PreviewCost(body.ThemeSlug)})
}

func (h *Handler) FEPurchaseCredits(c *gin.Context) {
	var body struct {
		Amount int `json:"amount"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	balance, err := h.frontend.PurchaseCredits(c.Request.Context(), mustUser(c).ID, body.Amount)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, balance)
}

func (h *Handler) FEDeductCredits(c *gin.Context) {
	var body struct {
		Amount      int    `json:"amount"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	ok, err := h.frontend.DeductCredits(c.Request.Context(), mustUser(c).ID, body.Amount, body.Description)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": ok})
}

// ---- User settings --------------------------------------------------------

func (h *Handler) FEGetSettings(c *gin.Context) {
	settings, err := h.frontend.GetSettings(c.Request.Context(), mustUser(c).ID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) FEUpdateProfile(c *gin.Context) {
	var patch map[string]interface{}
	if err := c.ShouldBindJSON(&patch); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	settings, err := h.frontend.UpdateProfile(c.Request.Context(), mustUser(c).ID, patch)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) FEUpdateGenerationPreferences(c *gin.Context) {
	var patch services.GenerationPreferencesDTO
	if err := c.ShouldBindJSON(&patch); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	settings, err := h.frontend.UpdateGenerationPreferences(c.Request.Context(), mustUser(c).ID, patch)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) FEUpdateWorkspace(c *gin.Context) {
	var patch services.WorkspaceDTO
	if err := c.ShouldBindJSON(&patch); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	settings, err := h.frontend.UpdateWorkspace(c.Request.Context(), mustUser(c).ID, patch)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *Handler) FEUpdateSecurity(c *gin.Context) {
	var patch services.SecurityPreferencesDTO
	if err := c.ShouldBindJSON(&patch); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	settings, err := h.frontend.UpdateSecurity(c.Request.Context(), mustUser(c).ID, patch)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, settings)
}

// ---- API keys -------------------------------------------------------------

func (h *Handler) FEListAPIKeys(c *gin.Context) {
	keys, err := h.frontend.ListAPIKeys(c.Request.Context(), mustUser(c).ID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, keys)
}

func (h *Handler) FECreateAPIKey(c *gin.Context) {
	var body struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	key, rawValue, err := h.frontend.CreateAPIKey(c.Request.Context(), mustUser(c).ID, body.Name)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"key": key, "rawValue": rawValue})
}

func (h *Handler) FERevokeAPIKey(c *gin.Context) {
	if err := h.frontend.RevokeAPIKey(c.Request.Context(), mustUser(c).ID, c.Param("id")); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ---- Admin analytics ------------------------------------------------------

func (h *Handler) FEAdminUsers(c *gin.Context) {
	users, err := h.frontend.AdminUsers(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *Handler) FEAdminGenerationJobs(c *gin.Context) {
	jobs, err := h.frontend.AdminGenerationJobs(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, jobs)
}

func (h *Handler) FEAdminAnalyticsKPIs(c *gin.Context) {
	kpis, err := h.frontend.AnalyticsKPIs(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, kpis)
}

func (h *Handler) FEAdminAnalyticsFunnel(c *gin.Context) {
	funnel, err := h.frontend.AnalyticsFunnel(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, funnel)
}

func (h *Handler) FEAdminAnalyticsCategories(c *gin.Context) {
	categories, err := h.frontend.AnalyticsCategoryBreakdown(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, categories)
}
