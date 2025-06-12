package handlers

import (
	"database/sql"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/database"
	"github.com/vdt/cv-management/internal/models"
	"github.com/vdt/cv-management/internal/utils"
)

// Register tạo tài khoản người dùng mới từ danh sách dữ liệu form (đăng ký hàng loạt)
func Register(c *gin.Context) {
	var bulkRegisterData models.BulkUserRegister

	if err := c.ShouldBindJSON(&bulkRegisterData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Dữ liệu đăng ký không hợp lệ",
		})
		return
	}

	// Bắt đầu một giao dịch cho tất cả các đăng ký
	tx, err := database.DB.Begin(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Lỗi khi bắt đầu giao dịch",
		})
		return
	}
	defer tx.Rollback(c)

	var results []models.UserRegistrationResult
	successCount := 0
	totalCount := len(bulkRegisterData.Users)

	// Xử lý từng đăng ký người dùng
	for _, registerData := range bulkRegisterData.Users {
		result := models.UserRegistrationResult{
			EmployeeCode: registerData.EmployeeCode,
			Email:        registerData.Email,
			FullName:     registerData.FullName,
			Success:      false,
		}

		// Tự động thêm vai trò Nhân viên nếu không có
		if !slices.Contains(registerData.RoleNames, "Employee") {
			registerData.RoleNames = append(registerData.RoleNames, "Employee")
		}

		// Kiểm tra xem email đã tồn tại chưa
		var exists bool
		err := tx.QueryRow(c,
			"SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
			registerData.Email).Scan(&exists)

		if err != nil {
			result.Error = "Lỗi khi kiểm tra tính khả dụng của email"
			results = append(results, result)
			continue
		}

		if exists {
			result.Error = "Email đã được đăng ký"
			results = append(results, result)
			continue
		}

		// Băm mật khẩu
		hashedPassword, err := utils.HashPassword(registerData.Password)
		if err != nil {
			result.Error = "Lỗi khi xử lý mật khẩu"
			results = append(results, result)
			continue
		}

		// Chèn người dùng mới
		var userID string
		err = tx.QueryRow(c,
			`INSERT INTO users (id, employee_code, full_name, email, password, department_id, created_at)
			VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW())
			RETURNING id`,
			registerData.EmployeeCode, registerData.FullName, registerData.Email, hashedPassword, registerData.DepartmentID).Scan(&userID)

		if err != nil {
			result.Error = "Lỗi khi tạo tài khoản người dùng"
			results = append(results, result)
			continue
		}

		// Gán các vai trò đã chọn
		roleAssignmentFailed := false
		for _, roleName := range registerData.RoleNames {
			var roleID string
			err = tx.QueryRow(c, "SELECT id FROM roles WHERE name = $1", roleName).Scan(&roleID)
			if err != nil {
				result.Error = "Lỗi khi lấy vai trò: " + roleName
				roleAssignmentFailed = true
				break
			}

			_, err = tx.Exec(c,
				"INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
				userID, roleID)

			if err != nil {
				result.Error = "Lỗi khi gán vai trò: " + roleName
				roleAssignmentFailed = true
				break
			}
		}

		if roleAssignmentFailed {
			results = append(results, result)
			continue
		}

		// Tạo một CV trống cho người dùng mới
		var cvID string
		err = tx.QueryRow(c,
			"INSERT INTO cv (id, user_id, status) VALUES (uuid_generate_v4(), $1, 'Chưa cập nhật') RETURNING id",
			userID).Scan(&cvID)

		if err != nil {
			result.Error = "Lỗi khi tạo CV cho người dùng"
			results = append(results, result)
			continue
		}

		// Tạo chi tiết CV trống cho CV mới
		_, err = tx.Exec(c,
			`INSERT INTO cv_details (id, cv_id, full_name, job_title, summary, created_at)
			VALUES (uuid_generate_v4(), $1, '', '', '', NOW())`,
			cvID)

		if err != nil {
			result.Error = "Lỗi khi tạo chi tiết CV cho người dùng"
			results = append(results, result)
			continue
		}

		// Nếu đến đây, người dùng đã được tạo thành công
		result.Success = true
		successCount++
		results = append(results, result)
	}

	// Cam kết giao dịch chỉ khi ít nhất một người dùng được tạo thành công
	if successCount > 0 {
		if err = tx.Commit(c); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Lỗi khi cam kết giao dịch",
			})
			return
		}
	}

	// Chuẩn bị phản hồi
	bulkResult := models.BulkRegistrationResult{
		TotalUsers:      totalCount,
		SuccessfulUsers: successCount,
		FailedUsers:     totalCount - successCount,
		Results:         results,
	}

	// Xác định trạng thái phản hồi dựa trên kết quả
	if successCount == totalCount {
		c.JSON(http.StatusCreated, gin.H{
			"status":  "success",
			"message": "Đăng ký thành công",
			"data":    bulkResult,
		})
	} else if successCount > 0 {
		c.JSON(http.StatusPartialContent, gin.H{
			"status":  "partial_success",
			"message": "Một vài vấn đề xảy ra với các thành viên",
			"data":    bulkResult,
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Đăng ký thất bại",
			"data":    bulkResult,
		})
	}
}

// Login xác thực người dùng và trả về JWT tokens
func Login(c *gin.Context) {
	var loginData models.UserLogin

	if err := c.ShouldBindJSON(&loginData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Dữ liệu đăng nhập không hợp lệ",
		})
		return
	}

	var user models.User
	var hashedPassword string

	// Lấy người dùng theo email
	row := database.DB.QueryRow(c,
		`SELECT u.id, u.employee_code, u.full_name, u.email, u.password, u.department_id, d.name
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		WHERE u.email = $1`,
		loginData.Email)

	// Quét vào đối tượng người dùng
	var deptID, deptName sql.NullString
	err := row.Scan(&user.ID, &user.EmployeeCode, &user.FullName, &user.Email,
		&hashedPassword, &deptID, &deptName)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Đăng nhập thất bại",
		})
		return
	}

	// Kiểm tra mật khẩu
	if !utils.CheckPasswordHash(loginData.Password, hashedPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Mật khẩu không chính xác",
		})
		return
	}

	// Điền dữ liệu phòng ban nếu có
	if deptID.Valid && deptName.Valid {
		user.DepartmentID = deptID.String
		user.Department = models.Department{
			ID:   deptID.String,
			Name: deptName.String,
		}
	}

	// Lấy vai trò của người dùng
	rows, err := database.DB.Query(c,
		`SELECT r.id, r.name
		FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = $1`,
		user.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Lỗi khi lấy vai trò",
		})
		return
	}
	defer rows.Close()

	var roles []models.Role
	for rows.Next() {
		var role models.Role
		if err := rows.Scan(&role.ID, &role.Name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Lỗi khi quét vai trò",
			})
			return
		}
		roles = append(roles, role)
	}
	user.Roles = roles

	// Trích xuất tên vai trò cho token
	var roleNames []string
	for _, role := range roles {
		roleNames = append(roleNames, role.Name)
	}

	// Tạo token JWT
	token, err := utils.GenerateToken(user.ID, roleNames)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Lỗi khi tạo token",
		})
		return
	}

	// Tạo refresh token JWT
	refreshToken, err := utils.GenerateRefreshToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Lỗi khi tạo refresh token",
		})
		return
	}

	// Tạo phản hồi người dùng
	userResponse := models.UserResponse{
		ID:           user.ID,
		EmployeeCode: user.EmployeeCode,
		FullName:     user.FullName,
		Email:        user.Email,
		DepartmentID: user.DepartmentID,
		Department:   user.Department,
		Roles:        user.Roles,
		Token:        token,
		RefreshToken: refreshToken,
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   userResponse,
	})
}

// RefreshToken làm mới access token sử dụng refresh token hợp lệ
func RefreshToken(c *gin.Context) {
	var request struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Yêu cầu không hợp lệ",
		})
		return
	}

	// Xác thực refresh token và lấy ID người dùng
	userID, err := utils.ValidateRefreshToken(request.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Refresh token không hợp lệ",
		})
		return
	}

	// Lấy vai trò của người dùng
	rows, err := database.DB.Query(c,
		`SELECT r.name
		FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = $1`,
		userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Lỗi khi lấy vai trò",
		})
		return
	}
	defer rows.Close()

	var roleNames []string
	for rows.Next() {
		var roleName string
		if err := rows.Scan(&roleName); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Lỗi khi quét vai trò",
			})
			return
		}
		roleNames = append(roleNames, roleName)
	}

	// Tạo access token mới
	newToken, err := utils.GenerateToken(userID, roleNames)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Lỗi khi tạo token",
		})
		return
	}

	// Tạo refresh token mới
	newRefreshToken, err := utils.GenerateRefreshToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Lỗi khi tạo refresh token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": models.TokenResponse{
			Token:        newToken,
			RefreshToken: newRefreshToken,
		},
	})
}

// Logout vô hiệu hóa refresh token
func Logout(c *gin.Context) {
	// Với refresh token JWT không trạng thái, chúng ta không cần vô hiệu hóa gì trên server
	// Client nên xóa các token khỏi bộ nhớ cục bộ

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Đăng xuất thành công",
	})
}

// GetUserProfile trả về thông tin profile của người dùng hiện tại đã xác thực
func GetUserProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized",
		})
		return
	}

	// Lấy người dùng theo ID với phòng ban và vai trò
	var user models.User
	row := database.DB.QueryRow(c,
		`SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id, d.name
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		WHERE u.id = $1`,
		userID)

	// Quét vào đối tượng người dùng
	var deptID, deptName sql.NullString
	err := row.Scan(&user.ID, &user.EmployeeCode, &user.FullName, &user.Email,
		&deptID, &deptName)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Người dùng không tồn tại",
		})
		return
	}

	// Điền dữ liệu phòng ban nếu có
	if deptID.Valid && deptName.Valid {
		user.DepartmentID = deptID.String
		user.Department = models.Department{
			ID:   deptID.String,
			Name: deptName.String,
		}
	}

	// Lấy vai trò của người dùng
	rows, err := database.DB.Query(c,
		`SELECT r.id, r.name
		FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = $1`,
		user.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Lỗi khi lấy vai trò",
		})
		return
	}
	defer rows.Close()

	var roles []models.Role
	for rows.Next() {
		var role models.Role
		if err := rows.Scan(&role.ID, &role.Name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Lỗi khi quét vai trò",
			})
			return
		}
		roles = append(roles, role)
	}
	user.Roles = roles

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   user,
	})
}
