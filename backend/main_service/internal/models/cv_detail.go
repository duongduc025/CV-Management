package models

import (
	"time"
)

// CVDetail represents the cv_details table in the new normalized database schema
type CVDetail struct {
	ID           string     `json:"id" db:"id"`
	CVID         string     `json:"cv_id" db:"cv_id"`
	FullName     string     `json:"full_name" db:"full_name"`
	JobTitle     string     `json:"job_title" db:"job_title"`
	Summary      string     `json:"summary" db:"summary"`
	Birthday     *time.Time `json:"birthday,omitempty" db:"birthday"`
	Gender       *string    `json:"gender,omitempty" db:"gender"`
	Email        *string    `json:"email,omitempty" db:"email"`
	Phone        *string    `json:"phone,omitempty" db:"phone"`
	Address      *string    `json:"address,omitempty" db:"address"`
	CVPath       *string    `json:"cv_path,omitempty" db:"cvpath"`
	PortraitPath *string    `json:"portrait_path,omitempty" db:"portraitpath"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	// Related data (not stored in cv_details table but loaded separately)
	Education []CVEducation `json:"education,omitempty" db:"-"`
	Courses   []CVCourse    `json:"courses,omitempty" db:"-"`
	Skills    []CVSkill     `json:"skills,omitempty" db:"-"`
}
