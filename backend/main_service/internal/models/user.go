package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID           string     `json:"id" db:"id"`
	EmployeeCode string     `json:"employee_code" db:"employee_code"`
	FullName     string     `json:"full_name" db:"full_name"`
	Email        string     `json:"email" db:"email"`
	Password     string     `json:"-" db:"password"` // Not returned in JSON responses
	DepartmentID string     `json:"department_id,omitempty" db:"department_id"`
	Department   Department `json:"department,omitempty" db:"-"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	Roles        []Role     `json:"roles,omitempty" db:"-"`
}

// UserLogin represents login credentials
type UserLogin struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// UserRegister represents registration data
type UserRegister struct {
	EmployeeCode string   `json:"employee_code" binding:"required"`
	FullName     string   `json:"full_name" binding:"required"`
	Email        string   `json:"email" binding:"required,email"`
	Password     string   `json:"password" binding:"required,min=8"`
	DepartmentID string   `json:"department_id" binding:"required"`
	RoleNames    []string `json:"role_names"`
}

// UserResponse represents the user data returned after authentication
type UserResponse struct {
	ID           string     `json:"id"`
	EmployeeCode string     `json:"employee_code"`
	FullName     string     `json:"full_name"`
	Email        string     `json:"email"`
	DepartmentID string     `json:"department_id,omitempty"`
	Department   Department `json:"department,omitempty"`
	Roles        []Role     `json:"roles,omitempty"`
	Token        string     `json:"token"`
	RefreshToken string     `json:"refresh_token"`
}

// RefreshToken represents a refresh token in the system
type RefreshToken struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Token     string    `json:"token" db:"token"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// TokenResponse represents the response for token refresh
type TokenResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token,omitempty"`
}
