package models

import (
	"time"
)

// CVCourse represents the cv_courses table in the database
type CVCourse struct {
	ID           string     `json:"id" db:"id"`
	CVID         string     `json:"cv_id" db:"cv_id"`
	CourseName   string     `json:"course_name" db:"course_name"`
	Organization *string    `json:"organization,omitempty" db:"organization"`
	FinishDate   *time.Time `json:"finish_date,omitempty" db:"finish_date"`
}

// CVCourseRequest represents the request structure for creating/updating course records
type CVCourseRequest struct {
	CourseName   string `json:"course_name" binding:"required"`
	Organization string `json:"organization,omitempty"`
	FinishDate   string `json:"finish_date,omitempty"` // String format for easier parsing
}
