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

// Register creates new user accounts from a list of form data objects (mass registration)
func Register(c *gin.Context) {
	var bulkRegisterData models.BulkUserRegister

	if err := c.ShouldBindJSON(&bulkRegisterData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid registration data",
		})
		return
	}

	// Start a transaction for all registrations
	tx, err := database.DB.Begin(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting transaction",
		})
		return
	}
	defer tx.Rollback(c)

	var results []models.UserRegistrationResult
	successCount := 0
	totalCount := len(bulkRegisterData.Users)

	// Process each user registration
	for _, registerData := range bulkRegisterData.Users {
		result := models.UserRegistrationResult{
			EmployeeCode: registerData.EmployeeCode,
			Email:        registerData.Email,
			FullName:     registerData.FullName,
			Success:      false,
		}

		// Automatically add Employee role if not present
		if !slices.Contains(registerData.RoleNames, "Employee") {
			registerData.RoleNames = append(registerData.RoleNames, "Employee")
		}

		// Check if email already exists
		var exists bool
		err := tx.QueryRow(c,
			"SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
			registerData.Email).Scan(&exists)

		if err != nil {
			result.Error = "Error checking email availability"
			results = append(results, result)
			continue
		}

		if exists {
			result.Error = "Email already registered"
			results = append(results, result)
			continue
		}

		// Hash password
		hashedPassword, err := utils.HashPassword(registerData.Password)
		if err != nil {
			result.Error = "Error processing password"
			results = append(results, result)
			continue
		}

		// Insert new user
		var userID string
		err = tx.QueryRow(c,
			`INSERT INTO users (id, employee_code, full_name, email, password, department_id, created_at)
			VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW())
			RETURNING id`,
			registerData.EmployeeCode, registerData.FullName, registerData.Email, hashedPassword, registerData.DepartmentID).Scan(&userID)

		if err != nil {
			result.Error = "Error creating user account"
			results = append(results, result)
			continue
		}

		// Assign the selected roles
		roleAssignmentFailed := false
		for _, roleName := range registerData.RoleNames {
			var roleID string
			err = tx.QueryRow(c, "SELECT id FROM roles WHERE name = $1", roleName).Scan(&roleID)
			if err != nil {
				result.Error = "Error getting role: " + roleName
				roleAssignmentFailed = true
				break
			}

			_, err = tx.Exec(c,
				"INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
				userID, roleID)

			if err != nil {
				result.Error = "Error assigning role: " + roleName
				roleAssignmentFailed = true
				break
			}
		}

		if roleAssignmentFailed {
			results = append(results, result)
			continue
		}

		// Create an empty CV for the new user
		var cvID string
		err = tx.QueryRow(c,
			"INSERT INTO cv (id, user_id, status) VALUES (uuid_generate_v4(), $1, 'Chưa cập nhật') RETURNING id",
			userID).Scan(&cvID)

		if err != nil {
			result.Error = "Error creating user CV"
			results = append(results, result)
			continue
		}

		// Create empty CV details for the new CV
		_, err = tx.Exec(c,
			`INSERT INTO cv_details (id, cv_id, full_name, job_title, summary, created_at)
			VALUES (uuid_generate_v4(), $1, '', '', '', NOW())`,
			cvID)

		if err != nil {
			result.Error = "Error creating user CV details"
			results = append(results, result)
			continue
		}

		// If we reach here, the user was successfully created
		result.Success = true
		successCount++
		results = append(results, result)
	}

	// Commit transaction only if at least one user was successfully created
	if successCount > 0 {
		if err = tx.Commit(c); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error committing transaction",
			})
			return
		}
	}

	// Prepare response
	bulkResult := models.BulkRegistrationResult{
		TotalUsers:      totalCount,
		SuccessfulUsers: successCount,
		FailedUsers:     totalCount - successCount,
		Results:         results,
	}

	// Determine response status based on results
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

// Login authenticates a user and returns JWT tokens
func Login(c *gin.Context) {
	var loginData models.UserLogin

	if err := c.ShouldBindJSON(&loginData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid login data",
		})
		return
	}

	// Mock user retrieval - in real implementation, query the database
	var user models.User
	var hashedPassword string

	// Get user by email
	row := database.DB.QueryRow(c,
		`SELECT u.id, u.employee_code, u.full_name, u.email, u.password, u.department_id, d.name
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		WHERE u.email = $1`,
		loginData.Email)

	// Scan into user object
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

	// Check password
	if !utils.CheckPasswordHash(loginData.Password, hashedPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Mật khẩu không chính xác",
		})
		return
	}

	// Fill in department data if available
	if deptID.Valid && deptName.Valid {
		user.DepartmentID = deptID.String
		user.Department = models.Department{
			ID:   deptID.String,
			Name: deptName.String,
		}
	}

	// Get user roles
	rows, err := database.DB.Query(c,
		`SELECT r.id, r.name
		FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = $1`,
		user.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching roles",
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
				"message": "Error scanning roles",
			})
			return
		}
		roles = append(roles, role)
	}
	user.Roles = roles

	// Extract role names for token
	var roleNames []string
	for _, role := range roles {
		roleNames = append(roleNames, role.Name)
	}

	// Generate JWT token
	token, err := utils.GenerateToken(user.ID, roleNames)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error generating token",
		})
		return
	}

	// Generate JWT refresh token
	refreshToken, err := utils.GenerateRefreshToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error generating refresh token",
		})
		return
	}

	// Create user response
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

// RefreshToken refreshes an access token using a valid refresh token
func RefreshToken(c *gin.Context) {
	var request struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request",
		})
		return
	}

	// Validate refresh token and get user ID
	userID, err := utils.ValidateRefreshToken(request.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Invalid refresh token",
		})
		return
	}

	// Get user roles
	rows, err := database.DB.Query(c,
		`SELECT r.name
		FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = $1`,
		userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching roles",
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
				"message": "Error scanning roles",
			})
			return
		}
		roleNames = append(roleNames, roleName)
	}

	// Generate new access token
	newToken, err := utils.GenerateToken(userID, roleNames)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error generating token",
		})
		return
	}

	// Generate new refresh token
	newRefreshToken, err := utils.GenerateRefreshToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error generating refresh token",
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

// Logout invalidates a refresh token (this is a no-op with stateless tokens)
func Logout(c *gin.Context) {
	// With stateless JWT refresh tokens, we don't need to invalidate anything on the server
	// The client should delete the tokens from local storage

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Successfully logged out",
	})
}

// GetUserProfile returns the profile of the currently authenticated user
func GetUserProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized",
		})
		return
	}

	// Get user by ID with department and roles
	var user models.User
	row := database.DB.QueryRow(c,
		`SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id, d.name
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		WHERE u.id = $1`,
		userID)

	// Scan into user object
	var deptID, deptName sql.NullString
	err := row.Scan(&user.ID, &user.EmployeeCode, &user.FullName, &user.Email,
		&deptID, &deptName)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	// Fill in department data if available
	if deptID.Valid && deptName.Valid {
		user.DepartmentID = deptID.String
		user.Department = models.Department{
			ID:   deptID.String,
			Name: deptName.String,
		}
	}

	// Get user roles
	rows, err := database.DB.Query(c,
		`SELECT r.id, r.name
		FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = $1`,
		user.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching roles",
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
				"message": "Error scanning roles",
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
