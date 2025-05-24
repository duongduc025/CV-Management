package models

import (
	"time"
)

// CVUpdateRequest represents a request to update a CV
type CVUpdateRequest struct {
	ID          string    `json:"id" db:"id"`
	CVID        string    `json:"cv_id" db:"cv_id"`
	RequestedBy string    `json:"requested_by" db:"requested_by"`
	RequestedAt time.Time `json:"requested_at" db:"requested_at"`
	Status      string    `json:"status" db:"status"` // Đang yêu cầu, Đã xử lý, Đã huỷ
}
