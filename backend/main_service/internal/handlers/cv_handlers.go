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

// nullStringPtr chuyển đổi string thành *string cho các trường nullable
func nullStringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// loadCVRelatedData tải dữ liệu liên quan đến CV (học vấn, khóa học, kỹ năng)
func loadCVRelatedData(c *gin.Context, cvDetailID string) ([]models.CVEducation, []models.CVCourse, []models.CVSkill, error) {
	var education []models.CVEducation
	var courses []models.CVCourse
	var skills []models.CVSkill

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

// GetUserCV trả về CV của người dùng đã xác thực
func GetUserCV(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("GetUserCV: Lấy CV cho user %v\n", userID)

	// Query để lấy CV với chi tiết theo user ID
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
		fmt.Printf("GetUserCV: Lỗi khi lấy CV: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV not found for this user",
		})
		return
	}

	fmt.Printf("GetUserCV: Lấy CV thành công %s cho user %s\n", cv.ID, cv.UserID)

	// Tải dữ liệu liên quan (học vấn, khóa học, kỹ năng)
	if details.ID != "" {
		education, courses, skills, err := loadCVRelatedData(c, details.ID)
		if err != nil {
			fmt.Printf("GetUserCV: Lỗi khi tải dữ liệu liên quan: %v\n", err)
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

	// Tạo response với xử lý null đúng cách
	response := map[string]interface{}{
		"id":      cv.ID,
		"user_id": cv.UserID,
		"status":  cv.Status,
		"details": details,
	}

	// Xử lý các trường nullable
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

// GetCVByUserID trả về CV của người dùng theo ID
func GetCVByUserID(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	fmt.Printf("GetCVByUserID: Lấy CV cho user ID %s\n", userID)

	// Query để lấy CV với chi tiết theo user ID
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
		fmt.Printf("GetCVByUserID: Lỗi khi lấy CV: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV not found for this user",
		})
		return
	}

	fmt.Printf("GetCVByUserID: Lấy CV thành công %s cho user %s với trạng thái: %s\n", cv.ID, cv.UserID, cv.Status)

	// Tải dữ liệu liên quan (học vấn, khóa học, kỹ năng)
	if details.ID != "" {
		education, courses, skills, err := loadCVRelatedData(c, details.ID)
		if err != nil {
			fmt.Printf("GetCVByUserID: Lỗi khi tải dữ liệu liên quan: %v\n", err)
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

	// Tạo response với xử lý null đúng cách
	response := map[string]interface{}{
		"id":      cv.ID,
		"user_id": cv.UserID,
		"status":  cv.Status,
		"details": details,
	}

	// Xử lý các trường nullable
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

// CreateOrUpdateCV tạo CV mới hoặc cập nhật CV hiện có cho người dùng đã xác thực
func CreateOrUpdateCV(c *gin.Context) {
	// Lấy user ID từ context (được set bởi auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	// Định nghĩa cấu trúc request cho việc tạo CV (tất cả trường đều tùy chọn)
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

	// Bind JSON request vào struct
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid CV data: " + err.Error(),
		})
		return
	}

	fmt.Printf("CreateOrUpdateCV: Xử lý CV cho user %v\n", userID)

	// Kiểm tra user đã có CV chưa (vì user_id là unique trong bảng cv)
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
		// CV đã tồn tại, đây sẽ là update
		isUpdate = true
		fmt.Printf("CreateOrUpdateCV: Cập nhật CV hiện có %s cho user %v với trạng thái hiện tại: %s\n", existingCVID, userID, currentStatus)
		if existingCVDetailID != nil {
			fmt.Printf("CreateOrUpdateCV: Tìm thấy chi tiết CV hiện có %s\n", *existingCVDetailID)
		} else {
			fmt.Printf("CreateOrUpdateCV: Không tìm thấy chi tiết CV, sẽ tạo chi tiết mới\n")
		}
	} else {
		fmt.Printf("CreateOrUpdateCV: Tạo CV mới cho user %v (lỗi: %v)\n", userID, err)
		currentStatus = "" // Không có trạng thái hiện có cho CV mới
	}

	// Kiểm tra tất cả trường bắt buộc có được điền để xác định trạng thái
	var newStatus string
	var responseMessage string

	// Kiểm tra tất cả trường bắt buộc có được điền
	hasRequiredPersonalInfo := request.FullName != "" && request.JobTitle != "" && request.Summary != "" &&
		request.Birthday != "" && request.Gender != "" && request.Email != "" &&
		request.Phone != "" && request.Address != ""

	// Kiểm tra học vấn có ít nhất một mục với tổ chức
	hasEducation := false
	if len(request.Education) > 0 {
		for _, edu := range request.Education {
			if edu.Organization != "" {
				hasEducation = true
				break
			}
		}
	}

	// Kiểm tra kỹ năng có ít nhất một mục với tên kỹ năng
	hasSkills := false
	if len(request.Skills) > 0 {
		for _, skill := range request.Skills {
			if skill.SkillName != "" {
				hasSkills = true
				break
			}
		}
	}

	// Xác định trạng thái dựa trên tính đầy đủ
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

	fmt.Printf("CreateOrUpdateCV: Trạng thái mới sẽ là: %s\n", newStatus)

	// Bắt đầu transaction
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("CreateOrUpdateCV: Lỗi khi bắt đầu transaction: %v\n", err)
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
		// Cập nhật bản ghi CV hiện có
		cvID = existingCVID
		err = tx.QueryRow(c,
			`UPDATE cv SET last_updated_by = $1, last_updated_at = NOW(), status = $2
			WHERE id = $3 RETURNING id`,
			userID, newStatus, existingCVID).Scan(&cvID)

		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Lỗi khi cập nhật bản ghi CV: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating CV record",
			})
			return
		}

		// Xử lý chi tiết CV - cập nhật nếu tồn tại, tạo nếu không
		if existingCVDetailID != nil {
			// Cập nhật bản ghi chi tiết CV hiện có
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
				fmt.Printf("CreateOrUpdateCV: Lỗi khi cập nhật bản ghi chi tiết CV: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error updating CV details record",
				})
				return
			}
		} else {
			// Tạo bản ghi chi tiết CV mới cho CV hiện có
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
				fmt.Printf("CreateOrUpdateCV: Lỗi khi tạo bản ghi chi tiết CV cho CV hiện có: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error creating CV details record",
				})
				return
			}
		}
	} else {
		// Chèn bản ghi CV mới
		err = tx.QueryRow(c,
			`INSERT INTO cv (id, user_id, last_updated_by, last_updated_at, status)
			VALUES (uuid_generate_v4(), $1, $1, NOW(), $2)
			RETURNING id`,
			userID, newStatus).Scan(&cvID)

		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Lỗi khi tạo bản ghi CV: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error creating CV record",
			})
			return
		}

		// Chèn bản ghi chi tiết CV
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
			fmt.Printf("CreateOrUpdateCV: Lỗi khi tạo bản ghi chi tiết CV: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error creating CV details record",
			})
			return
		}
	}

	// Xử lý dữ liệu học vấn - chỉ cập nhật nếu có dữ liệu
	if request.Education != nil && len(request.Education) > 0 {
		// Xóa các bản ghi học vấn hiện có cho chi tiết CV này
		_, err = tx.Exec(c, "DELETE FROM cv_education WHERE cv_id = $1", cvDetailID)
		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Lỗi khi xóa các bản ghi học vấn hiện có: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating education data",
			})
			return
		}

		// Chèn các bản ghi học vấn mới
		for _, edu := range request.Education {
			// Chỉ chèn nếu tổ chức không rỗng (trường bắt buộc)
			if edu.Organization != "" {
				_, err = tx.Exec(c,
					`INSERT INTO cv_education (id, cv_id, organization, degree, major, graduation_year)
					VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)`,
					cvDetailID, edu.Organization, edu.Degree, edu.Major, edu.GraduationYear)
				if err != nil {
					fmt.Printf("CreateOrUpdateCV: Lỗi khi chèn bản ghi học vấn: %v\n", err)
					c.JSON(http.StatusInternalServerError, gin.H{
						"status":  "error",
						"message": "Error saving education data",
					})
					return
				}
			}
		}
	}

	// Xử lý dữ liệu khóa học - chỉ cập nhật nếu có dữ liệu
	if request.Courses != nil && len(request.Courses) > 0 {
		// Xóa các bản ghi khóa học hiện có cho chi tiết CV này
		_, err = tx.Exec(c, "DELETE FROM cv_courses WHERE cv_id = $1", cvDetailID)
		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Lỗi khi xóa các bản ghi khóa học hiện có: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating course data",
			})
			return
		}

		// Chèn các bản ghi khóa học mới
		for _, course := range request.Courses {
			// Chỉ chèn nếu tên khóa học không rỗng (trường bắt buộc)
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
					fmt.Printf("CreateOrUpdateCV: Lỗi khi chèn bản ghi khóa học: %v\n", err)
					c.JSON(http.StatusInternalServerError, gin.H{
						"status":  "error",
						"message": "Error saving course data",
					})
					return
				}
			}
		}
	}

	// Xử lý dữ liệu kỹ năng - chỉ cập nhật nếu có dữ liệu
	if request.Skills != nil && len(request.Skills) > 0 {
		// Xóa các bản ghi kỹ năng hiện có cho chi tiết CV này
		_, err = tx.Exec(c, "DELETE FROM cv_skills WHERE cv_id = $1", cvDetailID)
		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Lỗi khi xóa các bản ghi kỹ năng hiện có: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating skill data",
			})
			return
		}

		// Chèn các bản ghi kỹ năng mới
		for _, skill := range request.Skills {
			// Chỉ chèn nếu tên kỹ năng không rỗng (trường bắt buộc)
			if skill.SkillName != "" {
				_, err = tx.Exec(c,
					`INSERT INTO cv_skills (id, cv_id, skill_name, description)
					VALUES (uuid_generate_v4(), $1, $2, $3)`,
					cvDetailID, skill.SkillName, skill.Description)
				if err != nil {
					fmt.Printf("CreateOrUpdateCV: Lỗi khi chèn bản ghi kỹ năng: %v\n", err)
					c.JSON(http.StatusInternalServerError, gin.H{
						"status":  "error",
						"message": "Error saving skill data",
					})
					return
				}
			}
		}
	}

	// Commit transaction
	if err = tx.Commit(c); err != nil {
		fmt.Printf("CreateOrUpdateCV: Lỗi khi commit transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error saving CV data",
		})
		return
	}

	// Sau khi cập nhật CV thành công, đánh dấu các yêu cầu cập nhật đang chờ là đã xử lý
	if isUpdate {
		fmt.Printf("CreateOrUpdateCV: Đánh dấu các yêu cầu cập nhật CV đang chờ là đã xử lý cho CV %s\n", cvID)
		result, err := database.DB.Exec(c,
			`UPDATE cv_update_requests
			SET status = 'Đã xử lý'
			WHERE cv_id = $1 AND status = 'Đang yêu cầu'`,
			cvID)

		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Lỗi cập nhật trạng thái yêu cầu CV: %v\n", err)
			// Không làm thất bại toàn bộ operation, chỉ log lỗi
		} else {
			rowsAffected := result.RowsAffected()
			fmt.Printf("CreateOrUpdateCV: Đánh dấu thành công %d yêu cầu cập nhật CV là đã xử lý\n", rowsAffected)
		}
	}

	// Tạo đối tượng response CV
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

	// Tạo đối tượng chi tiết CV
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

	// Tải dữ liệu liên quan (học vấn, khóa học, kỹ năng) sử dụng helper function
	education, courses, skills, err := loadCVRelatedData(c, cvDetailID)
	if err != nil {
		fmt.Printf("CreateOrUpdateCV: Lỗi tải dữ liệu liên quan: %v\n", err)
		// Không làm thất bại toàn bộ operation, chỉ log lỗi và tiếp tục với mảng rỗng
		details.Education = []models.CVEducation{}
		details.Courses = []models.CVCourse{}
		details.Skills = []models.CVSkill{}
	} else {
		details.Education = education
		details.Courses = courses
		details.Skills = skills
	}

	// Tạo response với cả CV và chi tiết
	response := map[string]interface{}{
		"cv":      cv,
		"details": details,
	}

	var statusCode int

	statusCode = http.StatusOK
	if !isUpdate {
		statusCode = http.StatusCreated
	}

	fmt.Printf("CreateOrUpdateCV: %s CV thành công với ID %s cho user %v, trạng thái: %s\n",
		map[bool]string{true: "Cập nhật", false: "Tạo"}[isUpdate], cvID, userID, newStatus)

	c.JSON(statusCode, gin.H{
		"status":  "success",
		"message": responseMessage,
		"data":    response,
	})
}

// AdminUpdateCV cho phép admin cập nhật CV của bất kỳ người dùng nào bằng cách cung cấp tham số user_id
func AdminUpdateCV(c *gin.Context) {
	// Lấy target user ID từ URL parameter
	targetUserID := c.Param("user_id")
	if targetUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	// Lấy admin user ID hiện tại từ context (được set bởi auth middleware) để logging
	adminUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	// Định nghĩa cấu trúc request cho việc tạo CV (tất cả trường đều tùy chọn) - giống như CreateOrUpdateCV
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
		fmt.Printf("AdminUpdateCV: Lỗi khi phân tích body request: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request format",
		})
		return
	}

	fmt.Printf("AdminUpdateCV: Admin %s cập nhật CV cho user %s\n", adminUserID, targetUserID)

	// Bắt đầu transaction
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Lỗi khi bắt đầu transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Database transaction error",
		})
		return
	}
	defer tx.Rollback(c)

	// Kiểm tra CV có tồn tại cho target user không
	var existingCVID *string
	var existingCVDetailID *string
	var isUpdate bool

	err = tx.QueryRow(c, "SELECT id FROM cv WHERE user_id = $1", targetUserID).Scan(&existingCVID)
	if err != nil {
		if err.Error() == "no rows in result set" {
			// CV không tồn tại, chúng ta sẽ tạo mới
			isUpdate = false
			fmt.Printf("AdminUpdateCV: Không tìm thấy CV cho user %s, tạo CV mới\n", targetUserID)
		} else {
			fmt.Printf("AdminUpdateCV: Lỗi kiểm tra CV hiện có: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error checking existing CV",
			})
			return
		}
	} else {
		isUpdate = true
		fmt.Printf("AdminUpdateCV: Tìm thấy CV hiện có %s cho user %s\n", *existingCVID, targetUserID)

		// Lấy existing CV detail ID
		err = tx.QueryRow(c, "SELECT id FROM cv_details WHERE cv_id = $1", *existingCVID).Scan(&existingCVDetailID)
		if err != nil && err.Error() != "no rows in result set" {
			fmt.Printf("AdminUpdateCV: Lỗi khi lấy CV detail ID: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error getting CV details",
			})
			return
		}
	}

	// Parse birthday nếu được cung cấp
	var birthday *time.Time
	if request.Birthday != "" {
		parsedBirthday, err := time.Parse("2006-01-02", request.Birthday)
		if err != nil {
			fmt.Printf("AdminUpdateCV: Lỗi khi phân tích ngày sinh: %v\n", err)
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
		// Cập nhật CV hiện có
		cvID = *existingCVID

		// Xác định trạng thái CV dựa trên các trường bắt buộc
		status := "Đã cập nhật"
		if request.FullName == "" || request.JobTitle == "" || request.Summary == "" {
			status = "Chưa cập nhật"
		}

		// Cập nhật bản ghi CV với admin là last_updated_by
		err = tx.QueryRow(c,
			`UPDATE cv SET last_updated_by = $1, last_updated_at = NOW(), status = $2 WHERE id = $3 RETURNING id`,
			adminUserID, status, cvID).Scan(&cvID)

		if err != nil {
			fmt.Printf("AdminUpdateCV: Lỗi khi cập nhật bản ghi CV: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating CV record",
			})
			return
		}

		if existingCVDetailID != nil {
			// Cập nhật chi tiết CV hiện có
			err = tx.QueryRow(c,
				`UPDATE cv_details SET full_name = $1, job_title = $2, summary = $3, birthday = $4, gender = $5, email = $6, phone = $7, address = $8, cvpath = $9, portraitpath = $10
				WHERE id = $11 RETURNING id`,
				request.FullName, request.JobTitle, request.Summary, birthday,
				nullStringPtr(request.Gender), nullStringPtr(request.Email),
				nullStringPtr(request.Phone), nullStringPtr(request.Address),
				nullStringPtr(request.CVPath), nullStringPtr(request.PortraitPath), *existingCVDetailID).Scan(&cvDetailID)

			if err != nil {
				fmt.Printf("AdminUpdateCV: Lỗi khi cập nhật bản ghi chi tiết CV: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error updating CV details record",
				})
				return
			}
		} else {
			// Tạo chi tiết CV mới cho CV hiện có
			err = tx.QueryRow(c,
				`INSERT INTO cv_details (cv_id, full_name, job_title, summary, birthday, gender, email, phone, address, cvpath, portraitpath)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
				cvID, request.FullName, request.JobTitle, request.Summary, birthday,
				nullStringPtr(request.Gender), nullStringPtr(request.Email),
				nullStringPtr(request.Phone), nullStringPtr(request.Address),
				nullStringPtr(request.CVPath), nullStringPtr(request.PortraitPath)).Scan(&cvDetailID)

			if err != nil {
				fmt.Printf("AdminUpdateCV: Lỗi khi tạo bản ghi chi tiết CV cho CV hiện có: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error creating CV details record",
				})
				return
			}
		}
	} else {
		// Tạo CV mới
		// Xác định trạng thái CV dựa trên các trường bắt buộc
		status := "Đã cập nhật"
		if request.FullName == "" || request.JobTitle == "" || request.Summary == "" {
			status = "Chưa cập nhật"
		}

		// Tạo bản ghi CV với admin là last_updated_by
		err = tx.QueryRow(c,
			`INSERT INTO cv (user_id, last_updated_by, last_updated_at, status) VALUES ($1, $2, NOW(), $3) RETURNING id`,
			targetUserID, adminUserID, status).Scan(&cvID)

		if err != nil {
			fmt.Printf("AdminUpdateCV: Lỗi khi tạo bản ghi CV: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error creating CV record",
			})
			return
		}

		// Tạo bản ghi chi tiết CV
		err = tx.QueryRow(c,
			`INSERT INTO cv_details (cv_id, full_name, job_title, summary, birthday, gender, email, phone, address, cvpath, portraitpath)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
			cvID, request.FullName, request.JobTitle, request.Summary, birthday,
			nullStringPtr(request.Gender), nullStringPtr(request.Email),
			nullStringPtr(request.Phone), nullStringPtr(request.Address),
			nullStringPtr(request.CVPath), nullStringPtr(request.PortraitPath)).Scan(&cvDetailID)

		if err != nil {
			fmt.Printf("AdminUpdateCV: Lỗi khi tạo bản ghi chi tiết CV: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error creating CV details record",
			})
			return
		}
	}

	// Xóa học vấn, khóa học và kỹ năng hiện có cho CV này
	_, err = tx.Exec(c, "DELETE FROM cv_education WHERE cv_id = $1", cvDetailID)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Lỗi khi xóa học vấn hiện có: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating education records",
		})
		return
	}

	_, err = tx.Exec(c, "DELETE FROM cv_courses WHERE cv_id = $1", cvDetailID)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Lỗi khi xóa khóa học hiện có: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating course records",
		})
		return
	}

	_, err = tx.Exec(c, "DELETE FROM cv_skills WHERE cv_id = $1", cvDetailID)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Lỗi khi xóa kỹ năng hiện có: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating skill records",
		})
		return
	}

	// Chèn các bản ghi học vấn mới
	for _, edu := range request.Education {
		// Chỉ chèn nếu tổ chức không rỗng (trường bắt buộc)
		if edu.Organization != "" {
			_, err = tx.Exec(c,
				`INSERT INTO cv_education (id, cv_id, organization, degree, major, graduation_year)
				VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)`,
				cvDetailID, edu.Organization, edu.Degree, edu.Major, edu.GraduationYear)
			if err != nil {
				fmt.Printf("AdminUpdateCV: Lỗi khi chèn bản ghi học vấn: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error creating education record",
				})
				return
			}
		}
	}

	// Chèn các bản ghi khóa học mới
	for _, course := range request.Courses {
		// Chỉ chèn nếu tên khóa học không rỗng (trường bắt buộc)
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
				fmt.Printf("AdminUpdateCV: Lỗi khi chèn bản ghi khóa học: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error creating course record",
				})
				return
			}
		}
	}

	// Chèn các bản ghi kỹ năng mới
	for _, skill := range request.Skills {
		// Chỉ chèn nếu tên kỹ năng không rỗng (trường bắt buộc)
		if skill.SkillName != "" {
			_, err = tx.Exec(c,
				`INSERT INTO cv_skills (id, cv_id, skill_name, description)
				VALUES (uuid_generate_v4(), $1, $2, $3)`,
				cvDetailID, skill.SkillName, skill.Description)
			if err != nil {
				fmt.Printf("AdminUpdateCV: Lỗi khi chèn bản ghi kỹ năng: %v\n", err)
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
		fmt.Printf("AdminUpdateCV: Lỗi khi commit transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error saving CV data",
		})
		return
	}

	// Sau khi cập nhật CV thành công, đánh dấu các yêu cầu cập nhật đang chờ là đã xử lý (ngoài transaction)
	if isUpdate {
		fmt.Printf("AdminUpdateCV: Đánh dấu các yêu cầu cập nhật CV đang chờ là đã xử lý cho CV %s\n", cvID)
		result, err := database.DB.Exec(c,
			`UPDATE cv_update_requests
			SET status = 'Đã xử lý'
			WHERE cv_id = $1 AND status = 'Đang yêu cầu'`,
			cvID)

		if err != nil {
			fmt.Printf("AdminUpdateCV: Lỗi cập nhật trạng thái yêu cầu CV: %v\n", err)
			// Không làm thất bại toàn bộ operation, chỉ log lỗi
		} else {
			rowsAffected := result.RowsAffected()
			fmt.Printf("AdminUpdateCV: Đánh dấu thành công %d yêu cầu cập nhật CV là đã xử lý\n", rowsAffected)
		}
	}

	// Chuẩn bị dữ liệu response
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

	// Tải dữ liệu liên quan (học vấn, khóa học, kỹ năng) sử dụng helper function
	education, courses, skills, err := loadCVRelatedData(c, cvDetailID)
	if err != nil {
		fmt.Printf("AdminUpdateCV: Lỗi tải dữ liệu liên quan: %v\n", err)
		// Không làm thất bại toàn bộ operation, chỉ log lỗi và tiếp tục với mảng rỗng
		details.Education = []models.CVEducation{}
		details.Courses = []models.CVCourse{}
		details.Skills = []models.CVSkill{}
	} else {
		details.Education = education
		details.Courses = courses
		details.Skills = skills
	}

	// Tạo response với cả CV và chi tiết
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

	fmt.Printf("AdminUpdateCV: %s CV thành công %s cho user %s bởi admin %s\n",
		map[bool]string{true: "Cập nhật", false: "Tạo"}[isUpdate], cvID, targetUserID, adminUserID)

	c.JSON(statusCode, gin.H{
		"status":  "success",
		"message": message,
		"data":    response,
	})
}

// DeleteCV xóa tất cả dữ liệu CV cho người dùng được chỉ định và đặt trạng thái thành "Chưa cập nhật"
func DeleteCV(c *gin.Context) {
	// Lấy target user ID từ URL parameter
	targetUserID := c.Param("user_id")
	if targetUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	// Lấy current user ID từ context (được set bởi auth middleware) để logging
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("DeleteCV: Admin %v xử lý xóa CV cho user %v\n", currentUserID, targetUserID)

	// Kiểm tra user có CV không
	var existingCVID string
	var existingCVDetailID *string
	err := database.DB.QueryRow(c,
		`SELECT cv.id, cv_details.id
		FROM cv
		LEFT JOIN cv_details ON cv.id = cv_details.cv_id
		WHERE cv.user_id = $1`, targetUserID).Scan(&existingCVID, &existingCVDetailID)

	if err != nil {
		fmt.Printf("DeleteCV: Không tìm thấy CV cho user %v: %v\n", targetUserID, err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Không tìm thấy CV để xóa",
		})
		return
	}

	fmt.Printf("DeleteCV: Tìm thấy CV %s cho user %v\n", existingCVID, targetUserID)

	// Bắt đầu transaction
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("DeleteCV: Lỗi khi bắt đầu transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting transaction",
		})
		return
	}
	defer tx.Rollback(c)

	// Cập nhật trạng thái CV thành "Chưa cập nhật" (sử dụng current user làm người thực hiện xóa)
	err = tx.QueryRow(c,
		`UPDATE cv SET last_updated_by = $1, last_updated_at = NOW(), status = 'Chưa cập nhật'
		WHERE id = $2 RETURNING id`,
		currentUserID, existingCVID).Scan(&existingCVID)

	if err != nil {
		fmt.Printf("DeleteCV: Lỗi khi cập nhật trạng thái CV: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating CV status",
		})
		return
	}

	// Nếu chi tiết CV tồn tại, xóa tất cả các trường
	if existingCVDetailID != nil {
		fmt.Printf("DeleteCV: Xóa chi tiết CV %s\n", *existingCVDetailID)

		// Xóa tất cả các trường chi tiết CV
		err = tx.QueryRow(c,
			`UPDATE cv_details SET
			full_name = '', job_title = '', summary = '',
			birthday = NULL, gender = NULL, email = NULL,
			phone = NULL, address = NULL, cvpath = NULL, portraitpath = NULL
			WHERE id = $1 RETURNING id`,
			*existingCVDetailID).Scan(existingCVDetailID)

		if err != nil {
			fmt.Printf("DeleteCV: Lỗi khi xóa chi tiết CV: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error clearing CV details",
			})
			return
		}

		// Xóa tất cả bản ghi học vấn
		_, err = tx.Exec(c, "DELETE FROM cv_education WHERE cv_id = $1", *existingCVDetailID)
		if err != nil {
			fmt.Printf("DeleteCV: Lỗi khi xóa các bản ghi học vấn: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error clearing education data",
			})
			return
		}

		// Xóa tất cả bản ghi khóa học
		_, err = tx.Exec(c, "DELETE FROM cv_courses WHERE cv_id = $1", *existingCVDetailID)
		if err != nil {
			fmt.Printf("DeleteCV: Lỗi khi xóa các bản ghi khóa học: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error clearing course data",
			})
			return
		}

		// Xóa tất cả bản ghi kỹ năng
		_, err = tx.Exec(c, "DELETE FROM cv_skills WHERE cv_id = $1", *existingCVDetailID)
		if err != nil {
			fmt.Printf("DeleteCV: Lỗi khi xóa các bản ghi kỹ năng: %v\n", err)
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
		fmt.Printf("DeleteCV: Lỗi khi commit transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error committing CV deletion",
		})
		return
	}

	fmt.Printf("DeleteCV: Xóa thành công CV %s cho user %v\n", existingCVID, targetUserID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Đã xóa CV thành công",
		"data": gin.H{
			"cv_id":  existingCVID,
			"status": "Chưa cập nhật",
		},
	})
}
