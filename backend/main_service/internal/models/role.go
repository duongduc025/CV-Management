package models

// Role represents a role in the system
type Role struct {
	ID   string `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}
