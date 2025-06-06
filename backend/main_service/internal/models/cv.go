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
	Details       CVDetail       `json:"details,omitempty" db:"-"`
	// Additional fields for updater information
	UpdaterName         sql.NullString `json:"updater_name,omitempty" db:"updater_name"`
	UpdaterEmployeeCode sql.NullString `json:"updater_employee_code,omitempty" db:"updater_employee_code"`
}
