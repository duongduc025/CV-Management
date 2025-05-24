package models

import (
	"time"
)

// Member represents a project member
type Member struct {
	ProjectID     string    `json:"project_id" db:"project_id"`
	UserID        string    `json:"user_id" db:"user_id"`
	User          User      `json:"user,omitempty" db:"-"`
	RoleInProject string    `json:"role_in_project,omitempty" db:"role_in_project"`
	JoinedAt      time.Time `json:"joined_at,omitempty" db:"joined_at"`
	LeftAt        time.Time `json:"left_at,omitempty" db:"left_at"`
}
