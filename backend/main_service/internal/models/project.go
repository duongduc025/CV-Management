package models

import (
	"time"
)

// Project represents a project
type Project struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	StartDate   time.Time `json:"start_date,omitempty" db:"start_date"`
	EndDate     time.Time `json:"end_date,omitempty" db:"end_date"`
	MemberCount int       `json:"member_count,omitempty" db:"-"`
}

type ProjectCreateRequest struct {
	Name      string `json:"name" binding:"required"`
	StartDate string `json:"start_date,omitempty"`
	EndDate   string `json:"end_date,omitempty"`
}

type AdminProjectCreateRequest struct {
	Name      string `json:"name" binding:"required"`
	StartDate string `json:"start_date,omitempty"`
	EndDate   string `json:"end_date,omitempty"`
	PMUserID  string `json:"pm_user_id" binding:"required"`
}
