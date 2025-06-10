package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/database"
	"github.com/vdt/cv-management/internal/models"
)

// Helper function to convert string to *string for nullable fields
func nullStringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Helper function to load related CV data (education, courses, skills)
func loadCVRelatedData(c *gin.Context, cvDetailID string) ([]models.CVEducation, []models.CVCourse, []models.CVSkill, error) {
	var education []models.CVEducation
	var courses []models.CVCourse
	var skills []models.CVSkill

	// Load education data
	eduRows, err := database.DB.Query(c,
		`SELECT id, cv_id, organization, degree, major, graduation_year
		FROM cv_education WHERE cv_id = $1 ORDER BY id`, cvDetailID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to load education data: %w", err)
	}
	defer eduRows.Close()

	for eduRows.Next() {
		var edu models.CVEducation
		err := eduRows.Scan(&edu.ID, &edu.CVID, &edu.Organization, &edu.Degree, &edu.Major, &edu.GraduationYear)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("failed to scan education row: %w", err)
		}
		education = append(education, edu)
	}

	// Load courses data
	courseRows, err := database.DB.Query(c,
		`SELECT id, cv_id, course_name, organization, finish_date
		FROM cv_courses WHERE cv_id = $1 ORDER BY id`, cvDetailID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to load courses data: %w", err)
	}
	defer courseRows.Close()

	for courseRows.Next() {
		var course models.CVCourse
		err := courseRows.Scan(&course.ID, &course.CVID, &course.CourseName, &course.Organization, &course.FinishDate)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("failed to scan course row: %w", err)
		}
		courses = append(courses, course)
	}

	// Load skills data
	skillRows, err := database.DB.Query(c,
		`SELECT id, cv_id, skill_name, description
		FROM cv_skills WHERE cv_id = $1 ORDER BY id`, cvDetailID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to load skills data: %w", err)
	}
	defer skillRows.Close()

	for skillRows.Next() {
		var skill models.CVSkill
		err := skillRows.Scan(&skill.ID, &skill.CVID, &skill.SkillName, &skill.Description)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("failed to scan skill row: %w", err)
		}
		skills = append(skills, skill)
	}

	return education, courses, skills, nil
}

// GetUserCV returns the CV of the authenticated user
func GetUserCV(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("GetUserCV: Fetching CV for user %v\n", userID)

	// Query to get CV with details by user ID
	var cv models.CV
	var details models.CVDetail
	var updaterName, updaterEmployeeCode sql.NullString

	err := database.DB.QueryRow(c,
		`SELECT cv.id, cv.user_id, cv.last_updated_by, cv.last_updated_at, cv.status,
		cv_details.id, cv_details.cv_id, cv_details.full_name, cv_details.job_title, cv_details.summary,
		cv_details.birthday, cv_details.gender, cv_details.email, cv_details.phone, cv_details.address,
		cv_details.cvpath, cv_details.portraitpath, cv_details.created_at,
		updater.full_name, updater.employee_code
		FROM cv
		LEFT JOIN cv_details ON cv.id = cv_details.cv_id
		LEFT JOIN users updater ON cv.last_updated_by = updater.id
		WHERE cv.user_id = $1`, userID).Scan(
		&cv.ID, &cv.UserID, &cv.LastUpdatedBy, &cv.LastUpdatedAt, &cv.Status,
		&details.ID, &details.CVID, &details.FullName, &details.JobTitle, &details.Summary,
		&details.Birthday, &details.Gender, &details.Email, &details.Phone, &details.Address,
		&details.CVPath, &details.PortraitPath, &details.CreatedAt,
		&updaterName, &updaterEmployeeCode)

	if err != nil {
		fmt.Printf("GetUserCV: Error fetching CV: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV not found for this user",
		})
		return
	}

	fmt.Printf("GetUserCV: Successfully fetched CV %s for user %s\n", cv.ID, cv.UserID)

	// Load related data (education, courses, skills)
	if details.ID != "" {
		education, courses, skills, err := loadCVRelatedData(c, details.ID)
		if err != nil {
			fmt.Printf("GetUserCV: Error loading related data: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error loading CV related data",
			})
			return
		}
		details.Education = education
		details.Courses = courses
		details.Skills = skills
	}

	// Create response with proper null handling
	response := map[string]interface{}{
		"id":      cv.ID,
		"user_id": cv.UserID,
		"status":  cv.Status,
		"details": details,
	}

	// Handle nullable fields
	if cv.LastUpdatedBy.Valid {
		response["last_updated_by"] = cv.LastUpdatedBy.String
	}
	if cv.LastUpdatedAt.Valid {
		response["last_updated_at"] = cv.LastUpdatedAt.Time
	}
	if updaterName.Valid {
		response["updater_name"] = updaterName.String
	}
	if updaterEmployeeCode.Valid {
		response["updater_employee_code"] = updaterEmployeeCode.String
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}

// GetCVByUserID returns a specific CV by user ID
func GetCVByUserID(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	fmt.Printf("GetCVByUserID: Fetching CV for user ID %s\n", userID)

	// Query to get CV with details by user ID
	var cv models.CV
	var details models.CVDetail
	var updaterName, updaterEmployeeCode sql.NullString

	err := database.DB.QueryRow(c,
		`SELECT cv.id, cv.user_id, cv.last_updated_by, cv.last_updated_at, cv.status,
		cv_details.id, cv_details.cv_id, cv_details.full_name, cv_details.job_title, cv_details.summary,
		cv_details.birthday, cv_details.gender, cv_details.email, cv_details.phone, cv_details.address,
		cv_details.cvpath, cv_details.portraitpath, cv_details.created_at,
		updater.full_name, updater.employee_code
		FROM cv
		LEFT JOIN cv_details ON cv.id = cv_details.cv_id
		LEFT JOIN users updater ON cv.last_updated_by = updater.id
		WHERE cv.user_id = $1`, userID).Scan(
		&cv.ID, &cv.UserID, &cv.LastUpdatedBy, &cv.LastUpdatedAt, &cv.Status,
		&details.ID, &details.CVID, &details.FullName, &details.JobTitle, &details.Summary,
		&details.Birthday, &details.Gender, &details.Email, &details.Phone, &details.Address,
		&details.CVPath, &details.PortraitPath, &details.CreatedAt,
		&updaterName, &updaterEmployeeCode)

	if err != nil {
		fmt.Printf("GetCVByUserID: Error fetching CV: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV not found for this user",
		})
		return
	}

	fmt.Printf("GetCVByUserID: Successfully fetched CV %s for user %s with status: %s\n", cv.ID, cv.UserID, cv.Status)

	// Load related data (education, courses, skills)
	if details.ID != "" {
		education, courses, skills, err := loadCVRelatedData(c, details.ID)
		if err != nil {
			fmt.Printf("GetCVByUserID: Error loading related data: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error loading CV related data",
			})
			return
		}
		details.Education = education
		details.Courses = courses
		details.Skills = skills
	}

	// Create response with proper null handling
	response := map[string]interface{}{
		"id":      cv.ID,
		"user_id": cv.UserID,
		"status":  cv.Status,
		"details": details,
	}

	// Handle nullable fields
	if cv.LastUpdatedBy.Valid {
		response["last_updated_by"] = cv.LastUpdatedBy.String
	}
	if cv.LastUpdatedAt.Valid {
		response["last_updated_at"] = cv.LastUpdatedAt.Time
	}
	if updaterName.Valid {
		response["updater_name"] = updaterName.String
	}
	if updaterEmployeeCode.Valid {
		response["updater_employee_code"] = updaterEmployeeCode.String
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}

// CreateOrUpdateCV creates a new CV or updates an existing CV for the authenticated user
func CreateOrUpdateCV(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	// Define the request structure for CV creation (all fields optional)
	var request struct {
		FullName     string                      `json:"full_name"`
		JobTitle     string                      `json:"job_title"`
		Summary      string                      `json:"summary"`
		Birthday     string                      `json:"birthday"`
		Gender       string                      `json:"gender"`
		Email        string                      `json:"email"`
		Phone        string                      `json:"phone"`
		Address      string                      `json:"address"`
		CVPath       string                      `json:"cv_path"`
		PortraitPath string                      `json:"portrait_path"`
		Education    []models.CVEducationRequest `json:"education"`
		Courses      []models.CVCourseRequest    `json:"courses"`
		Skills       []models.CVSkillRequest     `json:"skills"`
	}

	// Bind JSON request to struct
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid CV data: " + err.Error(),
		})
		return
	}

	fmt.Printf("CreateOrUpdateCV: Processing CV for user %v\n", userID)

	// Check if user already has a CV (since user_id is unique in cv table)
	var existingCVID string
	var existingCVDetailID *string
	var currentStatus string
	isUpdate := false

	err := database.DB.QueryRow(c,
		`SELECT cv.id, cv_details.id, cv.status
		FROM cv
		LEFT JOIN cv_details ON cv.id = cv_details.cv_id
		WHERE cv.user_id = $1`, userID).Scan(&existingCVID, &existingCVDetailID, &currentStatus)

	if err == nil {
		// CV already exists, this will be an update
		isUpdate = true
		fmt.Printf("CreateOrUpdateCV: Updating existing CV %s for user %v with current status: %s\n", existingCVID, userID, currentStatus)
		if existingCVDetailID != nil {
			fmt.Printf("CreateOrUpdateCV: Found existing CV details %s\n", *existingCVDetailID)
		} else {
			fmt.Printf("CreateOrUpdateCV: No CV details found, will create new details\n")
		}
	} else {
		fmt.Printf("CreateOrUpdateCV: Creating new CV for user %v (error: %v)\n", userID, err)
		currentStatus = "" // No existing status for new CV
	}

	// Check if all required fields are filled to determine status
	var newStatus string
	var responseMessage string

	// Check if all required fields are filled
	hasRequiredPersonalInfo := request.FullName != "" && request.JobTitle != "" && request.Summary != "" &&
		request.Birthday != "" && request.Gender != "" && request.Email != "" &&
		request.Phone != "" && request.Address != ""

	// Check if education has at least one entry with organization
	hasEducation := false
	if request.Education != nil && len(request.Education) > 0 {
		for _, edu := range request.Education {
			if edu.Organization != "" {
				hasEducation = true
				break
			}
		}
	}

	// Check if skills has at least one entry with skill name
	hasSkills := false
	if request.Skills != nil && len(request.Skills) > 0 {
		for _, skill := range request.Skills {
			if skill.SkillName != "" {
				hasSkills = true
				break
			}
		}
	}

	// Determine status based on completeness
	if hasRequiredPersonalInfo && hasEducation && hasSkills {
		newStatus = "Đã cập nhật"
		if isUpdate {
			responseMessage = "Cập nhật CV thành công"
		} else {
			responseMessage = "Cập nhật CV thành công"
		}
	} else {
		newStatus = "Chưa cập nhật"
		responseMessage = "Bạn cần cập nhật thêm các trường yêu cầu"
	}

	fmt.Printf("CreateOrUpdateCV: New status will be: %s\n", newStatus)

	// Start a transaction
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("CreateOrUpdateCV: Error starting transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting database transaction",
		})
		return
	}
	defer tx.Rollback(c)

	var cvID string
	var cvDetailID string

	if isUpdate {
		// Update existing CV record
		cvID = existingCVID
		err = tx.QueryRow(c,
			`UPDATE cv SET last_updated_by = $1, last_updated_at = NOW(), status = $2
			WHERE id = $3 RETURNING id`,
			userID, newStatus, existingCVID).Scan(&cvID)

		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Error updating CV record: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating CV record",
			})
			return
		}

		// Handle CV details - update if exists, create if doesn't
		if existingCVDetailID != nil {
			// Update existing CV details record
			cvDetailID = *existingCVDetailID
			var birthday *time.Time
			if request.Birthday != "" {
				if parsedDate, err := time.Parse("2006-01-02", request.Birthday); err == nil {
					birthday = &parsedDate
				}
			}

			err = tx.QueryRow(c,
				`UPDATE cv_details SET full_name = $1, job_title = $2, summary = $3, birthday = $4, gender = $5, email = $6, phone = $7, address = $8, cvpath = $9, portraitpath = $10
				WHERE id = $11 RETURNING id`,
				request.FullName, request.JobTitle, request.Summary, birthday,
				nullStringPtr(request.Gender), nullStringPtr(request.Email),
				nullStringPtr(request.Phone), nullStringPtr(request.Address),
				nullStringPtr(request.CVPath), nullStringPtr(request.PortraitPath), *existingCVDetailID).Scan(&cvDetailID)

			if err != nil {
				fmt.Printf("CreateOrUpdateCV: Error updating CV details record: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error updating CV details record",
				})
				return
			}
		} else {
			// Create new CV details record for existing CV
			var birthday *time.Time
			if request.Birthday != "" {
				if parsedDate, err := time.Parse("2006-01-02", request.Birthday); err == nil {
					birthday = &parsedDate
				}
			}

			err = tx.QueryRow(c,
				`INSERT INTO cv_details (id, cv_id, full_name, job_title, summary, birthday, gender, email, phone, address, cvpath, portraitpath, created_at)
				VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
				RETURNING id`,
				cvID, request.FullName, request.JobTitle, request.Summary, birthday,
				nullStringPtr(request.Gender), nullStringPtr(request.Email),
				nullStringPtr(request.Phone), nullStringPtr(request.Address),
				nullStringPtr(request.CVPath), nullStringPtr(request.PortraitPath)).Scan(&cvDetailID)

			if err != nil {
				fmt.Printf("CreateOrUpdateCV: Error creating CV details record for existing CV: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error creating CV details record",
				})
				return
			}
		}
	} else {
		// Insert new CV record
		err = tx.QueryRow(c,
			`INSERT INTO cv (id, user_id, last_updated_by, last_updated_at, status)
			VALUES (uuid_generate_v4(), $1, $1, NOW(), $2)
			RETURNING id`,
			userID, newStatus).Scan(&cvID)

		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Error creating CV record: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error creating CV record",
			})
			return
		}

		// Insert CV details record
		var birthday *time.Time
		if request.Birthday != "" {
			if parsedDate, err := time.Parse("2006-01-02", request.Birthday); err == nil {
				birthday = &parsedDate
			}
		}

		err = tx.QueryRow(c,
			`INSERT INTO cv_details (id, cv_id, full_name, job_title, summary, birthday, gender, email, phone, address, cvpath, portraitpath, created_at)
			VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
			RETURNING id`,
			cvID, request.FullName, request.JobTitle, request.Summary, birthday,
			nullStringPtr(request.Gender), nullStringPtr(request.Email),
			nullStringPtr(request.Phone), nullStringPtr(request.Address),
			nullStringPtr(request.CVPath), nullStringPtr(request.PortraitPath)).Scan(&cvDetailID)

		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Error creating CV details record: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error creating CV details record",
			})
			return
		}
	}

	// Handle Education data - only update if data is provided
	if request.Education != nil && len(request.Education) > 0 {
		// Delete existing education records for this CV detail
		_, err = tx.Exec(c, "DELETE FROM cv_education WHERE cv_id = $1", cvDetailID)
		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Error deleting existing education records: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating education data",
			})
			return
		}

		// Insert new education records
		for _, edu := range request.Education {
			// Only insert if organization is not empty (required field)
			if edu.Organization != "" {
				_, err = tx.Exec(c,
					`INSERT INTO cv_education (id, cv_id, organization, degree, major, graduation_year)
					VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)`,
					cvDetailID, edu.Organization, edu.Degree, edu.Major, edu.GraduationYear)
				if err != nil {
					fmt.Printf("CreateOrUpdateCV: Error inserting education record: %v\n", err)
					c.JSON(http.StatusInternalServerError, gin.H{
						"status":  "error",
						"message": "Error saving education data",
					})
					return
				}
			}
		}
	}

	// Handle Courses data - only update if data is provided
	if request.Courses != nil && len(request.Courses) > 0 {
		// Delete existing course records for this CV detail
		_, err = tx.Exec(c, "DELETE FROM cv_courses WHERE cv_id = $1", cvDetailID)
		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Error deleting existing course records: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating course data",
			})
			return
		}

		// Insert new course records
		for _, course := range request.Courses {
			// Only insert if course name is not empty (required field)
			if course.CourseName != "" {
				var finishDate *time.Time
				if course.FinishDate != "" {
					if parsedDate, err := time.Parse("2006-01-02", course.FinishDate); err == nil {
						finishDate = &parsedDate
					}
				}

				_, err = tx.Exec(c,
					`INSERT INTO cv_courses (id, cv_id, course_name, organization, finish_date)
					VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
					cvDetailID, course.CourseName, course.Organization, finishDate)
				if err != nil {
					fmt.Printf("CreateOrUpdateCV: Error inserting course record: %v\n", err)
					c.JSON(http.StatusInternalServerError, gin.H{
						"status":  "error",
						"message": "Error saving course data",
					})
					return
				}
			}
		}
	}

	// Handle Skills data - only update if data is provided
	if request.Skills != nil && len(request.Skills) > 0 {
		// Delete existing skill records for this CV detail
		_, err = tx.Exec(c, "DELETE FROM cv_skills WHERE cv_id = $1", cvDetailID)
		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Error deleting existing skill records: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating skill data",
			})
			return
		}

		// Insert new skill records
		for _, skill := range request.Skills {
			// Only insert if skill name is not empty (required field)
			if skill.SkillName != "" {
				_, err = tx.Exec(c,
					`INSERT INTO cv_skills (id, cv_id, skill_name, description)
					VALUES (uuid_generate_v4(), $1, $2, $3)`,
					cvDetailID, skill.SkillName, skill.Description)
				if err != nil {
					fmt.Printf("CreateOrUpdateCV: Error inserting skill record: %v\n", err)
					c.JSON(http.StatusInternalServerError, gin.H{
						"status":  "error",
						"message": "Error saving skill data",
					})
					return
				}
			}
		}
	}

	// Commit the transaction
	if err = tx.Commit(c); err != nil {
		fmt.Printf("CreateOrUpdateCV: Error committing transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error saving CV data",
		})
		return
	}

	// After successful CV update, mark any pending update requests as processed
	if isUpdate {
		fmt.Printf("CreateOrUpdateCV: Marking pending CV update requests as processed for CV %s\n", cvID)
		result, err := database.DB.Exec(c,
			`UPDATE cv_update_requests
			SET status = 'Đã xử lý'
			WHERE cv_id = $1 AND status = 'Đang yêu cầu'`,
			cvID)

		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Error updating CV request status: %v\n", err)
			// Don't fail the entire operation, just log the error
		} else {
			rowsAffected := result.RowsAffected()
			fmt.Printf("CreateOrUpdateCV: Successfully marked %d CV update requests as processed\n", rowsAffected)
		}
	}

	// Create response CV object
	cv := models.CV{
		ID:     cvID,
		UserID: userID.(string),
		LastUpdatedBy: sql.NullString{
			String: userID.(string),
			Valid:  true,
		},
		LastUpdatedAt: sql.NullTime{Time: time.Now(), Valid: true},
		Status:        newStatus,
	}

	// Create CV details object
	var birthday *time.Time
	if request.Birthday != "" {
		if parsedDate, err := time.Parse("2006-01-02", request.Birthday); err == nil {
			birthday = &parsedDate
		}
	}

	details := models.CVDetail{
		ID:           cvDetailID,
		CVID:         cvID,
		FullName:     request.FullName,
		JobTitle:     request.JobTitle,
		Summary:      request.Summary,
		Birthday:     birthday,
		Gender:       nullStringPtr(request.Gender),
		Email:        nullStringPtr(request.Email),
		Phone:        nullStringPtr(request.Phone),
		Address:      nullStringPtr(request.Address),
		CVPath:       nullStringPtr(request.CVPath),
		PortraitPath: nullStringPtr(request.PortraitPath),
		CreatedAt:    time.Now(),
	}

	// Load related data (education, courses, skills) using helper function
	education, courses, skills, err := loadCVRelatedData(c, cvDetailID)
	if err != nil {
		fmt.Printf("CreateOrUpdateCV: Error loading related data: %v\n", err)
		// Don't fail the entire operation, just log the error and continue with empty arrays
		details.Education = []models.CVEducation{}
		details.Courses = []models.CVCourse{}
		details.Skills = []models.CVSkill{}
	} else {
		details.Education = education
		details.Courses = courses
		details.Skills = skills
	}

	// Create response with both CV and details
	response := map[string]interface{}{
		"cv":      cv,
		"details": details,
	}

	var statusCode int

	statusCode = http.StatusOK
	if !isUpdate {
		statusCode = http.StatusCreated
	}

	fmt.Printf("CreateOrUpdateCV: Successfully %s CV with ID %s for user %v, status: %s\n",
		map[bool]string{true: "updated", false: "created"}[isUpdate], cvID, userID, newStatus)

	c.JSON(statusCode, gin.H{
		"status":  "success",
		"message": responseMessage,
		"data":    response,
	})
}

// AdminUpdateCV allows admin to update any user's CV by providing user_id parameter
func AdminUpdateCV(c *gin.Context) {
	// Get target user ID from URL parameter
	targetUserID := c.Param("user_id")
	if targetUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	// Get current admin user ID from context (set by auth middleware) for logging
	adminUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	// Define the request structure for CV creation (all fields optional) - same as CreateOrUpdateCV
	var request struct {
		FullName     string                      `json:"full_name"`
		JobTitle     string                      `json:"job_title"`
		Summary      string                      `json:"summary"`
		Birthday     string                      `json:"birthday"`
		Gender       string                      `json:"gender"`
		Email        string                      `json:"email"`
		Phone        string                      `json:"phone"`
		Address      string                      `json:"address"`
		CVPath       string                      `json:"cv_path"`
		PortraitPath string                      `json:"portrait_path"`
		Education    []models.CVEducationRequest `json:"education"`
		Courses      []models.CVCourseRequest    `json:"courses"`
		Skills       []models.CVSkillRequest     `json:"skills"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		fmt.Printf("AdminUpdateCV: Error parsing request body: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request format",
		})
		return
	}

	fmt.Printf("AdminUpdateCV: Admin %s updating CV for user %s\n", adminUserID, targetUserID)

	// Start transaction
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Error starting transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Database transaction error",
		})
		return
	}
	defer tx.Rollback(c)

	// Check if CV exists for the target user
	var existingCVID *string
	var existingCVDetailID *string
	var isUpdate bool

	err = tx.QueryRow(c, "SELECT id FROM cv WHERE user_id = $1", targetUserID).Scan(&existingCVID)
	if err != nil {
		if err.Error() == "no rows in result set" {
			// CV doesn't exist, we'll create a new one
			isUpdate = false
			fmt.Printf("AdminUpdateCV: No existing CV found for user %s, creating new CV\n", targetUserID)
		} else {
			fmt.Printf("AdminUpdateCV: Error checking existing CV: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error checking existing CV",
			})
			return
		}
	} else {
		isUpdate = true
		fmt.Printf("AdminUpdateCV: Found existing CV %s for user %s\n", *existingCVID, targetUserID)

		// Get existing CV detail ID
		err = tx.QueryRow(c, "SELECT id FROM cv_details WHERE cv_id = $1", *existingCVID).Scan(&existingCVDetailID)
		if err != nil && err.Error() != "no rows in result set" {
			fmt.Printf("AdminUpdateCV: Error getting CV detail ID: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error getting CV details",
			})
			return
		}
	}

	// Parse birthday if provided
	var birthday *time.Time
	if request.Birthday != "" {
		parsedBirthday, err := time.Parse("2006-01-02", request.Birthday)
		if err != nil {
			fmt.Printf("AdminUpdateCV: Error parsing birthday: %v\n", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid birthday format. Use YYYY-MM-DD",
			})
			return
		}
		birthday = &parsedBirthday
	}

	var cvID string
	var cvDetailID string

	if isUpdate {
		// Update existing CV
		cvID = *existingCVID

		// Determine CV status based on required fields
		status := "Đã cập nhật"
		if request.FullName == "" || request.JobTitle == "" || request.Summary == "" {
			status = "Chưa cập nhật"
		}

		// Update CV record with admin as last_updated_by
		err = tx.QueryRow(c,
			`UPDATE cv SET last_updated_by = $1, last_updated_at = NOW(), status = $2 WHERE id = $3 RETURNING id`,
			adminUserID, status, cvID).Scan(&cvID)

		if err != nil {
			fmt.Printf("AdminUpdateCV: Error updating CV record: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating CV record",
			})
			return
		}

		if existingCVDetailID != nil {
			// Update existing CV details
			err = tx.QueryRow(c,
				`UPDATE cv_details SET full_name = $1, job_title = $2, summary = $3, birthday = $4, gender = $5, email = $6, phone = $7, address = $8, cvpath = $9, portraitpath = $10
				WHERE id = $11 RETURNING id`,
				request.FullName, request.JobTitle, request.Summary, birthday,
				nullStringPtr(request.Gender), nullStringPtr(request.Email),
				nullStringPtr(request.Phone), nullStringPtr(request.Address),
				nullStringPtr(request.CVPath), nullStringPtr(request.PortraitPath), *existingCVDetailID).Scan(&cvDetailID)

			if err != nil {
				fmt.Printf("AdminUpdateCV: Error updating CV details record: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error updating CV details record",
				})
				return
			}
		} else {
			// Create new CV details for existing CV
			err = tx.QueryRow(c,
				`INSERT INTO cv_details (cv_id, full_name, job_title, summary, birthday, gender, email, phone, address, cvpath, portraitpath)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
				cvID, request.FullName, request.JobTitle, request.Summary, birthday,
				nullStringPtr(request.Gender), nullStringPtr(request.Email),
				nullStringPtr(request.Phone), nullStringPtr(request.Address),
				nullStringPtr(request.CVPath), nullStringPtr(request.PortraitPath)).Scan(&cvDetailID)

			if err != nil {
				fmt.Printf("AdminUpdateCV: Error creating CV details record: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error creating CV details record",
				})
				return
			}
		}
	} else {
		// Create new CV
		// Determine CV status based on required fields
		status := "Đã cập nhật"
		if request.FullName == "" || request.JobTitle == "" || request.Summary == "" {
			status = "Chưa cập nhật"
		}

		// Create CV record with admin as last_updated_by
		err = tx.QueryRow(c,
			`INSERT INTO cv (user_id, last_updated_by, last_updated_at, status) VALUES ($1, $2, NOW(), $3) RETURNING id`,
			targetUserID, adminUserID, status).Scan(&cvID)

		if err != nil {
			fmt.Printf("AdminUpdateCV: Error creating CV record: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error creating CV record",
			})
			return
		}

		// Create CV details record
		err = tx.QueryRow(c,
			`INSERT INTO cv_details (cv_id, full_name, job_title, summary, birthday, gender, email, phone, address, cvpath, portraitpath)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
			cvID, request.FullName, request.JobTitle, request.Summary, birthday,
			nullStringPtr(request.Gender), nullStringPtr(request.Email),
			nullStringPtr(request.Phone), nullStringPtr(request.Address),
			nullStringPtr(request.CVPath), nullStringPtr(request.PortraitPath)).Scan(&cvDetailID)

		if err != nil {
			fmt.Printf("AdminUpdateCV: Error creating CV details record: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error creating CV details record",
			})
			return
		}
	}

	// Delete existing education, courses, and skills for this CV
	_, err = tx.Exec(c, "DELETE FROM cv_education WHERE cv_id = $1", cvDetailID)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Error deleting existing education: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating education records",
		})
		return
	}

	_, err = tx.Exec(c, "DELETE FROM cv_courses WHERE cv_id = $1", cvDetailID)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Error deleting existing courses: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating course records",
		})
		return
	}

	_, err = tx.Exec(c, "DELETE FROM cv_skills WHERE cv_id = $1", cvDetailID)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Error deleting existing skills: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating skill records",
		})
		return
	}

	// Insert new education records
	for _, edu := range request.Education {
		// Only insert if organization is not empty (required field)
		if edu.Organization != "" {
			_, err = tx.Exec(c,
				`INSERT INTO cv_education (id, cv_id, organization, degree, major, graduation_year)
				VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)`,
				cvDetailID, edu.Organization, edu.Degree, edu.Major, edu.GraduationYear)
			if err != nil {
				fmt.Printf("AdminUpdateCV: Error inserting education record: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error creating education record",
				})
				return
			}
		}
	}

	// Insert new course records
	for _, course := range request.Courses {
		// Only insert if course name is not empty (required field)
		if course.CourseName != "" {
			var finishDate *time.Time
			if course.FinishDate != "" {
				if parsedDate, err := time.Parse("2006-01-02", course.FinishDate); err == nil {
					finishDate = &parsedDate
				}
			}

			_, err = tx.Exec(c,
				`INSERT INTO cv_courses (id, cv_id, course_name, organization, finish_date)
				VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
				cvDetailID, course.CourseName, course.Organization, finishDate)
			if err != nil {
				fmt.Printf("AdminUpdateCV: Error inserting course record: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error creating course record",
				})
				return
			}
		}
	}

	// Insert new skill records
	for _, skill := range request.Skills {
		// Only insert if skill name is not empty (required field)
		if skill.SkillName != "" {
			_, err = tx.Exec(c,
				`INSERT INTO cv_skills (id, cv_id, skill_name, description)
				VALUES (uuid_generate_v4(), $1, $2, $3)`,
				cvDetailID, skill.SkillName, skill.Description)
			if err != nil {
				fmt.Printf("AdminUpdateCV: Error inserting skill record: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error creating skill record",
				})
				return
			}
		}
	}

	// Commit transaction
	err = tx.Commit(c)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Error committing transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error saving CV data",
		})
		return
	}

	// After successful CV update, mark any pending update requests as processed (outside transaction)
	if isUpdate {
		fmt.Printf("AdminUpdateCV: Marking pending CV update requests as processed for CV %s\n", cvID)
		result, err := database.DB.Exec(c,
			`UPDATE cv_update_requests
			SET status = 'Đã xử lý'
			WHERE cv_id = $1 AND status = 'Đang yêu cầu'`,
			cvID)

		if err != nil {
			fmt.Printf("AdminUpdateCV: Error updating CV request status: %v\n", err)
			// Don't fail the entire operation, just log the error
		} else {
			rowsAffected := result.RowsAffected()
			fmt.Printf("AdminUpdateCV: Successfully marked %d CV update requests as processed\n", rowsAffected)
		}
	}

	// Prepare response data
	cv := models.CV{
		ID:            cvID,
		UserID:        targetUserID,
		LastUpdatedBy: sql.NullString{String: adminUserID.(string), Valid: true},
		LastUpdatedAt: sql.NullTime{Time: time.Now(), Valid: true},
		Status:        "Đã cập nhật",
	}

	if request.FullName == "" || request.JobTitle == "" || request.Summary == "" {
		cv.Status = "Chưa cập nhật"
	}

	details := models.CVDetail{
		ID:           cvDetailID,
		CVID:         cvID,
		FullName:     request.FullName,
		JobTitle:     request.JobTitle,
		Summary:      request.Summary,
		Birthday:     birthday,
		Gender:       nullStringPtr(request.Gender),
		Email:        nullStringPtr(request.Email),
		Phone:        nullStringPtr(request.Phone),
		Address:      nullStringPtr(request.Address),
		CVPath:       nullStringPtr(request.CVPath),
		PortraitPath: nullStringPtr(request.PortraitPath),
		CreatedAt:    time.Now(),
	}

	// Load related data (education, courses, skills) using helper function
	education, courses, skills, err := loadCVRelatedData(c, cvDetailID)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Error loading related data: %v\n", err)
		// Don't fail the entire operation, just log the error and continue with empty arrays
		details.Education = []models.CVEducation{}
		details.Courses = []models.CVCourse{}
		details.Skills = []models.CVSkill{}
	} else {
		details.Education = education
		details.Courses = courses
		details.Skills = skills
	}

	// Create response with both CV and details
	response := map[string]interface{}{
		"cv":      cv,
		"details": details,
	}

	var statusCode int
	var message string

	statusCode = http.StatusOK
	message = "CV đã được cập nhật thành công bởi admin"
	if !isUpdate {
		statusCode = http.StatusCreated
		message = "CV đã được tạo thành công bởi admin"
	}

	fmt.Printf("AdminUpdateCV: Successfully %s CV %s for user %s by admin %s\n",
		map[bool]string{true: "updated", false: "created"}[isUpdate], cvID, targetUserID, adminUserID)

	c.JSON(statusCode, gin.H{
		"status":  "success",
		"message": message,
		"data":    response,
	})
}

// DeleteCV clears all CV data for a specified user and sets status to "Chưa cập nhật"
// Admin can delete any user's CV by providing user_id parameter
func DeleteCV(c *gin.Context) {
	// Get target user ID from URL parameter
	targetUserID := c.Param("user_id")
	if targetUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	// Get current user ID from context (set by auth middleware) for logging
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("DeleteCV: Admin %v processing CV deletion for user %v\n", currentUserID, targetUserID)

	// Check if user has a CV
	var existingCVID string
	var existingCVDetailID *string
	err := database.DB.QueryRow(c,
		`SELECT cv.id, cv_details.id
		FROM cv
		LEFT JOIN cv_details ON cv.id = cv_details.cv_id
		WHERE cv.user_id = $1`, targetUserID).Scan(&existingCVID, &existingCVDetailID)

	if err != nil {
		fmt.Printf("DeleteCV: No CV found for user %v: %v\n", targetUserID, err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Không tìm thấy CV để xóa",
		})
		return
	}

	fmt.Printf("DeleteCV: Found CV %s for user %v\n", existingCVID, targetUserID)

	// Start transaction
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("DeleteCV: Error starting transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting transaction",
		})
		return
	}
	defer tx.Rollback(c)

	// Update CV status to "Chưa cập nhật" (use current user as the one who performed the deletion)
	err = tx.QueryRow(c,
		`UPDATE cv SET last_updated_by = $1, last_updated_at = NOW(), status = 'Chưa cập nhật'
		WHERE id = $2 RETURNING id`,
		currentUserID, existingCVID).Scan(&existingCVID)

	if err != nil {
		fmt.Printf("DeleteCV: Error updating CV status: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating CV status",
		})
		return
	}

	// If CV details exist, clear all fields
	if existingCVDetailID != nil {
		fmt.Printf("DeleteCV: Clearing CV details %s\n", *existingCVDetailID)

		// Clear all CV details fields
		err = tx.QueryRow(c,
			`UPDATE cv_details SET
			full_name = '', job_title = '', summary = '',
			birthday = NULL, gender = NULL, email = NULL,
			phone = NULL, address = NULL, cvpath = NULL, portraitpath = NULL
			WHERE id = $1 RETURNING id`,
			*existingCVDetailID).Scan(existingCVDetailID)

		if err != nil {
			fmt.Printf("DeleteCV: Error clearing CV details: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error clearing CV details",
			})
			return
		}

		// Delete all education records
		_, err = tx.Exec(c, "DELETE FROM cv_education WHERE cv_id = $1", *existingCVDetailID)
		if err != nil {
			fmt.Printf("DeleteCV: Error deleting education records: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error clearing education data",
			})
			return
		}

		// Delete all course records
		_, err = tx.Exec(c, "DELETE FROM cv_courses WHERE cv_id = $1", *existingCVDetailID)
		if err != nil {
			fmt.Printf("DeleteCV: Error deleting course records: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error clearing course data",
			})
			return
		}

		// Delete all skill records
		_, err = tx.Exec(c, "DELETE FROM cv_skills WHERE cv_id = $1", *existingCVDetailID)
		if err != nil {
			fmt.Printf("DeleteCV: Error deleting skill records: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error clearing skill data",
			})
			return
		}
	}

	// Commit transaction
	err = tx.Commit(c)
	if err != nil {
		fmt.Printf("DeleteCV: Error committing transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error committing CV deletion",
		})
		return
	}

	fmt.Printf("DeleteCV: Successfully cleared CV %s for user %v\n", existingCVID, targetUserID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Đã xóa CV thành công",
		"data": gin.H{
			"cv_id":  existingCVID,
			"status": "Chưa cập nhật",
		},
	})
}
