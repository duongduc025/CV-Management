package models

import (
	"database/sql"
)

type CV struct {
	ID            string         `json:"id" db:"id"`
	UserID        string         `json:"user_id" db:"user_id"`
	LastUpdatedBy sql.NullString `json:"last_updated_by,omitempty" db:"last_updated_by"`
	LastUpdatedAt sql.NullTime   `json:"last_updated_at,omitempty" db:"last_updated_at"`
	Status        string         `json:"status" db:"status"`
}
