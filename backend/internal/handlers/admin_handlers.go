package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/services"
)

// ---- Users ----

func (h *Handler) FEAdminUpdateUser(c *gin.Context) {
	var in services.AdminUserUpdate
	if err := c.ShouldBindJSON(&in); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	user, err := h.frontend.AdminUpdateUser(c.Request.Context(), mustUser(c).ID, c.Param("id"), in)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) FEAdminDeleteUser(c *gin.Context) {
	if err := h.frontend.AdminDeleteUser(c.Request.Context(), mustUser(c).ID, c.Param("id")); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ---- Per-user 360° admin view ----

func (h *Handler) FEAdminUserOverview(c *gin.Context) {
	dto, err := h.frontend.AdminUserOverview(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto)
}

func (h *Handler) FEAdminUserPayments(c *gin.Context) {
	rows, err := h.frontend.AdminUserPayments(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *Handler) FEAdminUserTransactions(c *gin.Context) {
	rows, err := h.frontend.AdminUserTransactions(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *Handler) FEAdminUserGenerations(c *gin.Context) {
	rows, err := h.frontend.AdminUserGenerations(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *Handler) FEAdminUserProjects(c *gin.Context) {
	rows, err := h.frontend.AdminUserProjects(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, rows)
}

// ---- Projects ----

func (h *Handler) FEAdminProjects(c *gin.Context) {
	projects, err := h.frontend.AdminListProjects(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, projects)
}

func (h *Handler) FEAdminDeleteProject(c *gin.Context) {
	if err := h.frontend.AdminDeleteProject(c.Request.Context(), mustUser(c).ID, c.Param("id")); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ---- Generations ----

func (h *Handler) FEAdminRetryGeneration(c *gin.Context) {
	if err := h.frontend.AdminRetryGeneration(c.Request.Context(), c.Param("id")); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ---- Templates ----

func (h *Handler) FEAdminListTemplates(c *gin.Context) {
	templates, err := h.frontend.AdminListTemplates(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, templates)
}

func (h *Handler) FEAdminCreateTemplate(c *gin.Context) {
	var in services.TemplateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	t, err := h.frontend.AdminCreateTemplate(c.Request.Context(), in)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *Handler) FEAdminUpdateTemplate(c *gin.Context) {
	var in services.TemplateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	t, err := h.frontend.AdminUpdateTemplate(c.Request.Context(), c.Param("id"), in)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *Handler) FEAdminDeleteTemplate(c *gin.Context) {
	if err := h.frontend.AdminDeleteTemplate(c.Request.Context(), c.Param("id")); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ---- Themes ----

func (h *Handler) FEAdminListThemes(c *gin.Context) {
	themes, err := h.frontend.AdminListThemes(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, themes)
}

func (h *Handler) FEAdminCreateTheme(c *gin.Context) {
	var in services.ThemeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	t, err := h.frontend.AdminCreateTheme(c.Request.Context(), in)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *Handler) FEAdminUpdateTheme(c *gin.Context) {
	var in services.ThemeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	t, err := h.frontend.AdminUpdateTheme(c.Request.Context(), c.Param("slug"), in)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *Handler) FEAdminDeleteTheme(c *gin.Context) {
	if err := h.frontend.AdminDeleteTheme(c.Request.Context(), c.Param("slug")); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ---- Billing ----

func (h *Handler) FEAdminBillingSummary(c *gin.Context) {
	summary, err := h.frontend.AdminBillingSummary(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (h *Handler) FEAdminTransactions(c *gin.Context) {
	txs, err := h.frontend.AdminTransactions(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, txs)
}
