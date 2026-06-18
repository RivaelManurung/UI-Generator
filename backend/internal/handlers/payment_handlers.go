package handlers

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/kreasinusantara/ui-generator-backend/internal/platform/apperrors"
)

// ListCreditPackages returns the purchasable credit packs (public).
func (h *Handler) ListCreditPackages(c *gin.Context) {
	pkgs, err := h.payments.ListPackages(c.Request.Context())
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, pkgs)
}

// Checkout starts a Midtrans payment for a package and returns a Snap token.
func (h *Handler) Checkout(c *gin.Context) {
	var body struct {
		PackageSlug string `json:"packageSlug"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeError(c, apperrors.BadRequest("invalid JSON body"))
		return
	}
	res, err := h.payments.Checkout(c.Request.Context(), mustUser(c).ID, body.PackageSlug)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

// PaymentStatus returns an order's status (reconciling against Midtrans if pending).
func (h *Handler) PaymentStatus(c *gin.Context) {
	res, err := h.payments.GetOrderStatus(c.Request.Context(), mustUser(c).ID, c.Param("orderId"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

// MidtransNotification is the public webhook. It is secured by signature
// verification inside the service, not by auth middleware.
func (h *Handler) MidtransNotification(c *gin.Context) {
	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		writeError(c, apperrors.BadRequest("could not read body"))
		return
	}
	if err := h.payments.HandleNotification(c.Request.Context(), raw); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
