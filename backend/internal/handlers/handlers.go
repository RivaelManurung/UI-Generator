package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kreasinusantara/ui-generator-backend/internal/designsystem"
	"github.com/kreasinusantara/ui-generator-backend/internal/domain"
	"github.com/kreasinusantara/ui-generator-backend/internal/http/middleware"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/services"
)

type Handler struct {
	studio        *services.StudioService
	frontend      *services.FrontendService
	payments      *services.PaymentService
	freeTemplates *services.FreeTemplateService
}

func New(studio *services.StudioService, frontend *services.FrontendService, payments *services.PaymentService, freeTemplates *services.FreeTemplateService) *Handler {
	return &Handler{studio: studio, frontend: frontend, payments: payments, freeTemplates: freeTemplates}
}

// Health reports that the service is up. Consumed by the frontend home page.
func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "dashboard generator backend is running",
	})
}

// Hello is a simple example endpoint. Supports an optional ?name= query param.
func (h *Handler) Hello(c *gin.Context) {
	name := c.DefaultQuery("name", "world")
	c.JSON(http.StatusOK, gin.H{
		"message": "hello, " + name,
	})
}

func (h *Handler) Register(c *gin.Context) {
	var input services.RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	session, err := h.studio.Register(input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, session)
}

func (h *Handler) Login(c *gin.Context) {
	var input services.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	session, err := h.studio.Login(input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, session)
}

func (h *Handler) Refresh(c *gin.Context) {
	var input services.RefreshInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	session, err := h.studio.Refresh(input.RefreshToken)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, session)
}

func (h *Handler) Logout(c *gin.Context) {
	user := mustUser(c)
	var input services.RefreshInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	if err := h.studio.LogoutWithContext(c.Request.Context(), user.ID, input.RefreshToken); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) Me(c *gin.Context) {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		writeError(c, apperrors.Unauthorized("Authentication is required."))
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (h *Handler) ListProjectPages(c *gin.Context) {
	user := mustUser(c)
	pages, err := h.studio.ListPagesForOwnedProject(c.Request.Context(), user.ID, c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"pages": pages})
}

func (h *Handler) CreatePage(c *gin.Context) {
	var input services.CreatePageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	user := mustUser(c)
	page, err := h.studio.CreatePageForUser(c.Request.Context(), user.ID, c.Param("id"), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"page": page})
}

func (h *Handler) GetPage(c *gin.Context) {
	user := mustUser(c)
	page, err := h.studio.GetPageForUser(c.Request.Context(), user.ID, c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"page": page})
}

func (h *Handler) UpdatePage(c *gin.Context) {
	var input services.UpdatePageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	user := mustUser(c)
	page, err := h.studio.UpdatePageForUser(c.Request.Context(), user.ID, c.Param("id"), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"page": page})
}

func (h *Handler) DeletePage(c *gin.Context) {
	user := mustUser(c)
	if err := h.studio.DeletePageForUser(c.Request.Context(), user.ID, c.Param("id")); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) GeneratePage(c *gin.Context) {
	var input services.GenerateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	user := mustUser(c)
	result, err := h.studio.GenerateForUser(c.Request.Context(), user.ID, c.Param("id"), c.GetHeader("Idempotency-Key"), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, gin.H{
		"jobId":      result.Job.ID,
		"status":     result.Job.Status,
		"creditCost": result.Job.CreditCost,
		"pollUrl":    "/v1/generation-jobs/" + result.Job.ID,
	})
}

func (h *Handler) RefinePage(c *gin.Context) {
	var input services.RefineInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	user := mustUser(c)
	result, err := h.studio.RefineForUser(c.Request.Context(), user.ID, c.Param("id"), c.GetHeader("Idempotency-Key"), input)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, gin.H{
		"jobId":      result.Job.ID,
		"status":     result.Job.Status,
		"creditCost": result.Job.CreditCost,
		"pollUrl":    "/v1/generation-jobs/" + result.Job.ID,
	})
}

func (h *Handler) ListVersions(c *gin.Context) {
	user := mustUser(c)
	versions, err := h.studio.ListVersionsForUser(c.Request.Context(), user.ID, c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"versions": versions})
}

func (h *Handler) RestoreVersion(c *gin.Context) {
	user := mustUser(c)
	page, version, err := h.studio.RestoreVersionForUser(c.Request.Context(), user.ID, c.Param("id"), c.Param("versionId"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"page": page, "version": version})
}

func (h *Handler) Wallet(c *gin.Context) {
	user := mustUser(c)
	wallet, err := h.studio.WalletForUser(c.Request.Context(), user.ID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"wallet": wallet})
}

func (h *Handler) BillingTransactions(c *gin.Context) {
	user := mustUser(c)
	transactions, err := h.studio.CreditTransactionsForUser(c.Request.Context(), user.ID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"transactions": transactions})
}

func (h *Handler) GetGenerationJob(c *gin.Context) {
	user := mustUser(c)
	job, err := h.studio.GetGenerationJobForUser(c.Request.Context(), user.ID, c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"job": job})
}

func (h *Handler) Themes(c *gin.Context) {
	themes, err := h.studio.Themes(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"themes": themes})
}

// DesignSystems returns the visual design-system catalog (shadcn, neobrutalism,
// doodle, glass, soft, …) WITH their full design tokens. This is the single
// source of truth the studio preview consumes; the backend renderer reads the
// same catalog so exported code matches the preview.
func (h *Handler) DesignSystems(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"designSystems": designsystem.All()})
}

func (h *Handler) Templates(c *gin.Context) {
	templates, err := h.studio.Templates(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"templates": templates})
}

func (h *Handler) AdminAuditLogs(c *gin.Context) {
	auditLogs, err := h.studio.AdminAuditLogs(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"auditLogs": auditLogs})
}

func (h *Handler) AdminMetricsSummary(c *gin.Context) {
	summary, err := h.studio.AdminMetricsSummary(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

func writeServiceError(c *gin.Context, err error) {
	appErr, ok := apperrors.From(err)
	if !ok {
		_ = c.Error(err) // Record internal error for logging/observability
		appErr = apperrors.Internal("An unexpected error occurred.")
	}
	writeError(c, appErr)
}

func writeError(c *gin.Context, err *apperrors.Error) {
	payload := gin.H{
		"code":      err.Code,
		"message":   err.Message,
		"requestId": middleware.RequestIDFrom(c),
	}
	if len(err.Details) > 0 {
		payload["details"] = err.Details
	}
	c.JSON(err.Status, gin.H{"error": payload})
}

func mustUser(c *gin.Context) domain.User {
	user, _ := middleware.CurrentUser(c)
	return user
}
