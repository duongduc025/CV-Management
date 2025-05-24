package models

import (
	"time"
)

// Project represents a project
type Project struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	StartDate time.Time `json:"start_date,omitempty" db:"start_date"`
	EndDate   time.Time `json:"end_date,omitempty" db:"end_date"`
	Members   []Member  `json:"members,omitempty" db:"-"`
}
