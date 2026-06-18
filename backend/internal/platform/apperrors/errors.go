package apperrors

import (
	"errors"
	"net/http"
)

type Error struct {
	Code    string
	Message string
	Status  int
	Details map[string]interface{}
}

func (e *Error) Error() string {
	return e.Message
}

func New(status int, code string, message string) *Error {
	return &Error{Status: status, Code: code, Message: message}
}

func WithDetails(status int, code string, message string, details map[string]interface{}) *Error {
	return &Error{Status: status, Code: code, Message: message, Details: details}
}

func BadRequest(message string) *Error {
	return New(http.StatusBadRequest, "BAD_REQUEST", message)
}

func Unauthorized(message string) *Error {
	return New(http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func Forbidden(message string) *Error {
	return New(http.StatusForbidden, "FORBIDDEN", message)
}

func NotFound(message string) *Error {
	return New(http.StatusNotFound, "NOT_FOUND", message)
}

func Conflict(message string) *Error {
	return New(http.StatusConflict, "CONFLICT", message)
}

func Validation(message string) *Error {
	return New(http.StatusUnprocessableEntity, "VALIDATION_ERROR", message)
}

func PaymentRequired(message string) *Error {
	return New(http.StatusPaymentRequired, "INSUFFICIENT_CREDIT", message)
}

func Internal(message string) *Error {
	return New(http.StatusInternalServerError, "INTERNAL_ERROR", message)
}

func From(err error) (*Error, bool) {
	var appErr *Error
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}
