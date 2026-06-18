package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
	"github.com/kreasinusantara/ui-generator-backend/internal/services"
)

// ---- Public ---------------------------------------------------------------

func (h *Handler) ListFreeTemplates(c *gin.Context) {
	items, err := h.freeTemplates.ListPublic(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) GetFreeTemplate(c *gin.Context) {
	item, err := h.freeTemplates.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) DownloadFreeTemplate(c *gin.Context) {
	if err := h.freeTemplates.IncrementDownloads(c.Request.Context(), c.Param("slug")); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ---- Admin ----------------------------------------------------------------

func (h *Handler) FEAdminListFreeTemplates(c *gin.Context) {
	items, err := h.freeTemplates.AdminList(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) FEAdminPublishFreeTemplate(c *gin.Context) {
	var in services.PublishFreeTemplateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	item, err := h.freeTemplates.Publish(c.Request.Context(), mustUser(c).ID, in)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) FEAdminUpdateFreeTemplate(c *gin.Context) {
	var in services.UpdateFreeTemplateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	item, err := h.freeTemplates.Update(c.Request.Context(), c.Param("id"), in)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) FEAdminDeleteFreeTemplate(c *gin.Context) {
	if err := h.freeTemplates.Delete(c.Request.Context(), c.Param("id")); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
