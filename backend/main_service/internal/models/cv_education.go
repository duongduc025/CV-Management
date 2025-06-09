package models

// CVEducation represents the cv_education table in the database
type CVEducation struct {
	ID             string  `json:"id" db:"id"`
	CVID           string  `json:"cv_id" db:"cv_id"`
	Organization   string  `json:"organization" db:"organization"`
	Degree         *string `json:"degree,omitempty" db:"degree"`
	Major          *string `json:"major,omitempty" db:"major"`
	GraduationYear *int    `json:"graduation_year,omitempty" db:"graduation_year"`
}

// CVEducationRequest represents the request structure for creating/updating education records
type CVEducationRequest struct {
	Organization   string  `json:"organization" binding:"required"`
	Degree         *string `json:"degree,omitempty"`
	Major          *string `json:"major,omitempty"`
	GraduationYear *int    `json:"graduation_year,omitempty"`
}
