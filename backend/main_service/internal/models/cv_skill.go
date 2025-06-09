package models

// CVSkill represents the cv_skills table in the database
type CVSkill struct {
	ID          string  `json:"id" db:"id"`
	CVID        string  `json:"cv_id" db:"cv_id"`
	SkillName   string  `json:"skill_name" db:"skill_name"`
	Description *string `json:"description,omitempty" db:"description"`
}

// CVSkillRequest represents the request structure for creating/updating skill records
type CVSkillRequest struct {
	SkillName   string `json:"skill_name" binding:"required"`
	Description string `json:"description,omitempty"`
}
