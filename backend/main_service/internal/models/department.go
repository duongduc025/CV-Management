package models

// Department represents a department in the system
type Department struct {
	ID   string `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}
