package handlers

import (
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/database"
	"github.com/vdt/cv-management/internal/models"
)

// GetUsersInDepartment returns users from a specific department (Admin and BUL/Lead)
// Admin users always have access to this function regardless of department
func GetUsersInDepartment(c *gin.Context) {
	fmt.Printf("=== GetUsersInDepartment Debug Info ===\n")

	// Lấy user ID và roles từ context (được set bởi AuthMiddleware)
	userID, userIDExists := c.Get("userID")
	roles, rolesExist := c.Get("roles")

	if !userIDExists {
		fmt.Println("GetUsersInDepartment: User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	if !rolesExist {
		fmt.Println("GetUsersInDepartment: Roles not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user roles not found",
		})
		return
	}

	roleSlice, ok := roles.([]string)
	if !ok {
		fmt.Printf("GetUsersInDepartment: Invalid role format: %T = %v\n", roles, roles)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Server error - invalid role format",
		})
		return
	}

	fmt.Printf("GetUsersInDepartment: User ID: %v, Roles: %v\n", userID, roleSlice)
	fmt.Printf("GetUsersInDepartment: Checking access for department: %s\n", c.Param("department_id"))

	// Kiểm tra user có vai trò Admin hoặc BUL/Lead không
	// Admin users luôn có quyền truy cập function này
	isAdmin := contains(roleSlice, "Admin")
	isBULLead := contains(roleSlice, "BUL/Lead")

	// Admin users luôn có quyền truy cập không giới hạn
	if isAdmin {
		fmt.Printf("GetUsersInDepartment: Admin access granted - proceeding without restrictions\n")
	} else if isBULLead {
		fmt.Printf("GetUsersInDepartment: BUL/Lead access granted\n")
	} else {
		fmt.Printf("GetUsersInDepartment: Access denied - user does not have Admin or BUL/Lead role\n")
		c.JSON(http.StatusForbidden, gin.H{
			"status":  "error",
			"message": "Forbidden - only Admin or BUL/Lead users can access this endpoint",
		})
		return
	}

	fmt.Printf("GetUsersInDepartment: Access granted - Admin: %v, BUL/Lead: %v\n", isAdmin, isBULLead)

	// Lấy department ID từ URL parameter
	departmentID := c.Param("department_id")
	if departmentID == "" {
		fmt.Println("GetUsersInDepartment: Department ID parameter missing")
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Department ID is required",
		})
		return
	}

	fmt.Printf("GetUsersInDepartment: Fetching users from department %s\n", departmentID)

	// Query database cho users trong department được chỉ định
	rows, err := database.DB.Query(c, `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		WHERE u.department_id = $1
		ORDER BY u.full_name`, departmentID)

	if err != nil {
		fmt.Printf("GetUsersInDepartment error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching users from department",
		})
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var deptName string

		err := rows.Scan(&user.ID, &user.EmployeeCode, &user.FullName,
			&user.Email, &user.DepartmentID, &deptName)
		if err != nil {
			fmt.Printf("GetUsersInDepartment scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error parsing user data",
			})
			return
		}

		// Set department if available
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Lấy user roles
		userRoles, err := getUserRoles(c, user.ID)
		if err != nil {
			fmt.Printf("Warning: Could not fetch roles for user %s: %v\n", user.ID, err)
		} else {
			user.Roles = userRoles
		}

		users = append(users, user)
	}

	// Kiểm tra lỗi trong quá trình iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetUsersInDepartment iteration error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error reading user data",
		})
		return
	}

	fmt.Printf("GetUsersInDepartment: Returning %d users from department %s\n", len(users), departmentID)
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   users,
	})
}

// GetUsersInProject returns users from a specific project (PM and Admin only)
func GetUsersInProject(c *gin.Context) {
	fmt.Printf("=== GetUsersInProject Debug Info ===\n")

	// Lấy user ID và roles từ context (được set bởi AuthMiddleware)
	userID, userIDExists := c.Get("userID")
	roles, rolesExist := c.Get("roles")

	if !userIDExists {
		fmt.Println("GetUsersInProject: User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	if !rolesExist {
		fmt.Println("GetUsersInProject: Roles not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user roles not found",
		})
		return
	}

	roleSlice, ok := roles.([]string)
	if !ok {
		fmt.Printf("GetUsersInProject: Invalid role format: %T = %v\n", roles, roles)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Server error - invalid role format",
		})
		return
	}

	fmt.Printf("GetUsersInProject: User ID: %v, Roles: %v\n", userID, roleSlice)

	// Kiểm tra user có vai trò PM hoặc Admin không
	hasAccess := contains(roleSlice, "PM") || contains(roleSlice, "Admin")
	if !hasAccess {
		fmt.Printf("GetUsersInProject: Access denied - user does not have PM or Admin role\n")
		c.JSON(http.StatusForbidden, gin.H{
			"status":  "error",
			"message": "Forbidden - only PM and Admin users can access this endpoint",
		})
		return
	}

	// Kiểm tra user có phải Admin không để logic khác nhau
	isAdmin := contains(roleSlice, "Admin")

	// Lấy project ID từ URL parameter
	projectID := c.Param("project_id")
	if projectID == "" {
		fmt.Println("GetUsersInProject: Project ID parameter missing")
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Project ID is required",
		})
		return
	}

	fmt.Printf("GetUsersInProject: Fetching users from project %s\n", projectID)

	// Đối với PM users, xác minh họ là thành viên của project này
	// Admin users có thể truy cập bất kỳ project nào mà không cần kiểm tra membership
	if !isAdmin {
		var pmMemberCount int
		err := database.DB.QueryRow(c, `
			SELECT COUNT(*)
			FROM project_members
			WHERE project_id = $1 AND user_id = $2
			  AND (left_at IS NULL OR left_at > CURRENT_DATE)`, projectID, userID).Scan(&pmMemberCount)

		if err != nil {
			fmt.Printf("GetUsersInProject error checking PM membership: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error verifying project access",
			})
			return
		}

		if pmMemberCount == 0 {
			fmt.Printf("GetUsersInProject: PM %s is not a member of project %s\n", userID, projectID)
			c.JSON(http.StatusForbidden, gin.H{
				"status":  "error",
				"message": "Forbidden - you are not a member of this project",
			})
			return
		}
	} else {
		fmt.Printf("GetUsersInProject: Admin user %s accessing project %s (no membership check required)\n", userID, projectID)
	}

	// Query database cho users trong project được chỉ định (bao gồm cả những người đã rời đi)
	rows, err := database.DB.Query(c, `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name,
		       pm.role_in_project, pm.joined_at, pm.left_at
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		INNER JOIN project_members pm ON u.id = pm.user_id
		WHERE pm.project_id = $1
		ORDER BY
			CASE WHEN pm.left_at IS NULL THEN 0 ELSE 1 END,
			u.full_name`, projectID)

	if err != nil {
		fmt.Printf("GetUsersInProject error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching users from project",
		})
		return
	}
	defer rows.Close()

	// Cấu trúc để giữ user với thông tin vai trò project
	type UserWithProjectRole struct {
		models.User
		RoleInProject string `json:"role_in_project,omitempty"`
		JoinedAt      string `json:"joined_at,omitempty"`
		LeftAt        string `json:"left_at,omitempty"`
	}

	var users []UserWithProjectRole
	for rows.Next() {
		var userWithRole UserWithProjectRole
		var deptName string
		var roleInProject, joinedAt, leftAt interface{}

		err := rows.Scan(&userWithRole.ID, &userWithRole.EmployeeCode, &userWithRole.FullName,
			&userWithRole.Email, &userWithRole.DepartmentID, &deptName,
			&roleInProject, &joinedAt, &leftAt)
		if err != nil {
			fmt.Printf("GetUsersInProject scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error parsing user data",
			})
			return
		}

		// Đặt department nếu có
		if userWithRole.DepartmentID != "" && deptName != "" {
			userWithRole.Department = models.Department{
				ID:   userWithRole.DepartmentID,
				Name: deptName,
			}
		}

		// Đặt thông tin vai trò project
		if roleInProject != nil {
			userWithRole.RoleInProject = roleInProject.(string)
		}
		if joinedAt != nil {
			userWithRole.JoinedAt = joinedAt.(time.Time).Format("2006-01-02")
		}
		if leftAt != nil {
			userWithRole.LeftAt = leftAt.(time.Time).Format("2006-01-02")
		}

		// Lấy user roles
		userRoles, err := getUserRoles(c, userWithRole.ID)
		if err != nil {
			fmt.Printf("Warning: Could not fetch roles for user %s: %v\n", userWithRole.ID, err)
		} else {
			userWithRole.Roles = userRoles
		}

		users = append(users, userWithRole)
	}

	// Kiểm tra lỗi trong quá trình iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetUsersInProject iteration error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error reading user data",
		})
		return
	}

	fmt.Printf("GetUsersInProject: Returning %d users from project %s\n", len(users), projectID)
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   users,
	})
}

// GetUsers returns a list of all users
func GetUsers(c *gin.Context) {
	fmt.Println("GetUsers: Fetching all users from database")

	// Lấy tất cả users từ database
	allUsers, err := getAllUsers(c)
	if err != nil {
		fmt.Printf("GetUsers error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching users",
		})
		return
	}

	fmt.Printf("GetUsers: Returning %d users\n", len(allUsers))
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   allUsers,
	})
}

// GetUsersPaginated returns a paginated list of users (Admin only)
func GetUsersPaginated(c *gin.Context) {
	fmt.Println("GetUsersPaginated: Fetching paginated users from database")

	// Parse page parameter từ query string
	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		fmt.Printf("GetUsersPaginated: Invalid page parameter '%s', defaulting to page 1\n", pageStr)
		page = 1
	}

	const perPage = 10
	offset := (page - 1) * perPage

	fmt.Printf("GetUsersPaginated: Fetching page %d with offset %d\n", page, offset)

	// Lấy paginated users từ database
	paginatedResponse, err := getUsersPaginated(c, page, perPage, offset)
	if err != nil {
		fmt.Printf("GetUsersPaginated error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching paginated users",
		})
		return
	}

	fmt.Printf("GetUsersPaginated: Returning page %d with %d users (total: %d)\n",
		page, len(paginatedResponse.Users), paginatedResponse.TotalUsers)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   paginatedResponse,
	})
}

// GetUsersByRole returns users filtered by role (Admin only)
func GetUsersByRole(c *gin.Context) {
	roleName := c.Param("role")
	if roleName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Role parameter is required",
		})
		return
	}

	fmt.Printf("GetUsersByRole: Fetching users with role: %s\n", roleName)

	// Query database cho users với vai trò được chỉ định
	rows, err := database.DB.Query(c, `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		INNER JOIN user_roles ur ON u.id = ur.user_id
		INNER JOIN roles r ON ur.role_id = r.id
		WHERE r.name = $1
		ORDER BY u.full_name`, roleName)

	if err != nil {
		fmt.Printf("GetUsersByRole error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching users by role",
		})
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var deptName string

		err := rows.Scan(&user.ID, &user.EmployeeCode, &user.FullName,
			&user.Email, &user.DepartmentID, &deptName)
		if err != nil {
			fmt.Printf("GetUsersByRole scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error parsing user data",
			})
			return
		}

		// Set department if available
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Lấy user roles
		userRoles, err := getUserRoles(c, user.ID)
		if err != nil {
			fmt.Printf("Warning: Could not fetch roles for user %s: %v\n", user.ID, err)
		} else {
			user.Roles = userRoles
		}

		users = append(users, user)
	}

	// Kiểm tra lỗi trong quá trình iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetUsersByRole iteration error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error reading user data",
		})
		return
	}

	fmt.Printf("GetUsersByRole: Returning %d users with role %s\n", len(users), roleName)
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   users,
	})
}

// GetPMUsers returns all users with PM role (Admin only)
func GetPMUsers(c *gin.Context) {
	fmt.Println("GetPMUsers: Fetching all users with PM role")

	// Query database cho users với vai trò PM
	rows, err := database.DB.Query(c, `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		INNER JOIN user_roles ur ON u.id = ur.user_id
		INNER JOIN roles r ON ur.role_id = r.id
		WHERE r.name = 'PM'
		ORDER BY u.full_name`)

	if err != nil {
		fmt.Printf("GetPMUsers error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching PM users",
		})
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var deptName string

		err := rows.Scan(&user.ID, &user.EmployeeCode, &user.FullName,
			&user.Email, &user.DepartmentID, &deptName)
		if err != nil {
			fmt.Printf("GetPMUsers scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error parsing PM user data",
			})
			return
		}

		// Set department if available
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Lấy user roles
		userRoles, err := getUserRoles(c, user.ID)
		if err != nil {
			fmt.Printf("Warning: Could not fetch roles for PM user %s: %v\n", user.ID, err)
		} else {
			user.Roles = userRoles
		}

		users = append(users, user)
	}

	// Kiểm tra lỗi trong quá trình iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetPMUsers iteration error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error reading PM user data",
		})
		return
	}

	fmt.Printf("GetPMUsers: Returning %d PM users\n", len(users))
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   users,
	})
}

// GetUserByID returns a specific user by ID
func GetUserByID(c *gin.Context) {
	id := c.Param("id")

	// TODO: Lấy dữ liệu thực từ database
	// Mock data for now
	user := models.User{
		ID:           id,
		EmployeeCode: "EMP001",
		FullName:     "Nguyễn Văn A",
		Email:        "nguyenvana@example.com",
		DepartmentID: "123e4567-e89b-12d3-a456-426614174010",
		Department:   models.Department{ID: "123e4567-e89b-12d3-a456-426614174010", Name: "Phòng kỹ thuật"},
		Roles: []models.Role{
			{ID: "123e4567-e89b-12d3-a456-426614174020", Name: "Employee"},
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   user,
	})
}

// CreateUser creates a new user
func CreateUser(c *gin.Context) {
	var user models.User

	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid user data",
		})
		return
	}

	// TODO: Khi implement function này, đảm bảo vai trò Employee được tự động thêm
	// Example: Automatically add Employee role if not present in user.Roles
	// hasEmployeeRole := false
	// for _, role := range user.Roles {
	//     if role.Name == "Employee" {
	//         hasEmployeeRole = true
	//         break
	//     }
	// }
	// if !hasEmployeeRole {
	//     user.Roles = append(user.Roles, models.Role{Name: "Employee"})
	// }

	// TODO: Lưu vào database
	// Mock response for now
	user.ID = "123e4567-e89b-12d3-a456-426614174003" // Would be generated by DB

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   user,
	})
}

// UpdateUser updates an existing user
func UpdateUser(c *gin.Context) {
	fmt.Printf("=== UpdateUser Debug Info ===\n")

	id := c.Param("id")
	if id == "" {
		fmt.Println("UpdateUser: User ID parameter missing")
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	fmt.Printf("UpdateUser: Attempting to update user with ID: %s\n", id)

	// Định nghĩa struct cho dữ liệu update request
	type UpdateUserRequest struct {
		EmployeeCode string   `json:"employee_code" binding:"required"`
		FullName     string   `json:"full_name" binding:"required"`
		Email        string   `json:"email" binding:"required,email"`
		DepartmentID string   `json:"department_id" binding:"required"`
		RoleNames    []string `json:"role_names"`
	}

	var updateData UpdateUserRequest
	if err := c.ShouldBindJSON(&updateData); err != nil {
		fmt.Printf("UpdateUser: Invalid request data: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid user data",
		})
		return
	}

	fmt.Printf("UpdateUser: Update data: %+v\n", updateData)

	// Kiểm tra user có tồn tại không
	var userExists bool
	err := database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", id).Scan(&userExists)
	if err != nil {
		fmt.Printf("UpdateUser error checking user existence: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking user existence",
		})
		return
	}

	if !userExists {
		fmt.Printf("UpdateUser: User %s not found\n", id)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	// Kiểm tra email đã được sử dụng bởi user khác chưa
	var emailExists bool
	err = database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND id != $2)", updateData.Email, id).Scan(&emailExists)
	if err != nil {
		fmt.Printf("UpdateUser error checking email uniqueness: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error validating email",
		})
		return
	}

	if emailExists {
		fmt.Printf("UpdateUser: Email %s already exists for another user\n", updateData.Email)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Email already exists for another user",
		})
		return
	}

	// Bắt đầu transaction
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("UpdateUser transaction begin error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting transaction",
		})
		return
	}
	defer tx.Rollback(c)

	// Cập nhật thông tin cơ bản của user
	_, err = tx.Exec(c, `
		UPDATE users
		SET employee_code = $1, full_name = $2, email = $3, department_id = $4
		WHERE id = $5`,
		updateData.EmployeeCode, updateData.FullName, updateData.Email, updateData.DepartmentID, id)

	if err != nil {
		fmt.Printf("UpdateUser error updating user: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating user information",
		})
		return
	}

	fmt.Printf("UpdateUser: Updated basic user information for user %s\n", id)

	// Cập nhật user roles nếu được cung cấp
	if len(updateData.RoleNames) > 0 {
		// Đầu tiên, xóa roles hiện có
		_, err = tx.Exec(c, "DELETE FROM user_roles WHERE user_id = $1", id)
		if err != nil {
			fmt.Printf("UpdateUser error deleting existing roles: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating user roles",
			})
			return
		}

		// Sau đó, thêm roles mới
		for _, roleName := range updateData.RoleNames {
			var roleID string
			err = tx.QueryRow(c, "SELECT id FROM roles WHERE name = $1", roleName).Scan(&roleID)
			if err != nil {
				fmt.Printf("UpdateUser error finding role %s: %v\n", roleName, err)
				c.JSON(http.StatusBadRequest, gin.H{
					"status":  "error",
					"message": fmt.Sprintf("Role '%s' not found", roleName),
				})
				return
			}

			_, err = tx.Exec(c, "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", id, roleID)
			if err != nil {
				fmt.Printf("UpdateUser error adding role %s: %v\n", roleName, err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error adding user role",
				})
				return
			}
		}

		fmt.Printf("UpdateUser: Updated roles for user %s: %v\n", id, updateData.RoleNames)
	}

	// Commit transaction
	err = tx.Commit(c)
	if err != nil {
		fmt.Printf("UpdateUser transaction commit error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error committing transaction",
		})
		return
	}

	// Lấy dữ liệu user đã cập nhật để trả về
	updatedUser, err := getSingleUserByID(c, id)
	if err != nil {
		fmt.Printf("UpdateUser error fetching updated user: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "User updated but error fetching updated data",
		})
		return
	}

	fmt.Printf("UpdateUser: Successfully updated user %s\n", id)
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   updatedUser,
	})
}

// DeleteUser deletes a user by ID
func DeleteUser(c *gin.Context) {
	fmt.Printf("=== DeleteUser Debug Info ===\n")

	id := c.Param("id")
	if id == "" {
		fmt.Println("DeleteUser: User ID parameter missing")
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	fmt.Printf("DeleteUser: Attempting to delete user with ID: %s\n", id)

	// Lấy user ID từ context (được set bởi AuthMiddleware)
	requestUserID, userIDExists := c.Get("userID")
	if !userIDExists {
		fmt.Println("DeleteUser: Request user ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	// Ngăn users xóa chính họ
	if requestUserID == id {
		fmt.Printf("DeleteUser: User %s attempted to delete themselves\n", id)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Cannot delete your own account",
		})
		return
	}

	// Kiểm tra user có tồn tại trước khi thử xóa
	var userExists bool
	err := database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", id).Scan(&userExists)
	if err != nil {
		fmt.Printf("DeleteUser error checking user existence: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking user existence",
		})
		return
	}

	if !userExists {
		fmt.Printf("DeleteUser: User %s not found\n", id)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	// Bắt đầu transaction để đảm bảo tính nhất quán dữ liệu
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("DeleteUser transaction begin error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting transaction",
		})
		return
	}
	defer tx.Rollback(c)

	// Xóa theo thứ tự đúng để xử lý foreign key constraints

	// 1. Xóa user roles
	_, err = tx.Exec(c, "DELETE FROM user_roles WHERE user_id = $1", id)
	if err != nil {
		fmt.Printf("DeleteUser error deleting user roles: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error deleting user roles",
		})
		return
	}
	fmt.Printf("DeleteUser: Deleted user roles for user %s\n", id)

	// 2. Xóa project members (hard delete để tránh foreign key constraint)
	_, err = tx.Exec(c, "DELETE FROM project_members WHERE user_id = $1", id)
	if err != nil {
		fmt.Printf("DeleteUser error deleting project members: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error removing user from projects",
		})
		return
	}
	fmt.Printf("DeleteUser: Removed user %s from all projects\n", id)

	// 3. Xóa CV update requests (CASCADE sẽ xử lý cv_details)
	_, err = tx.Exec(c, "DELETE FROM cv_update_requests WHERE cv_id IN (SELECT id FROM cv WHERE user_id = $1)", id)
	if err != nil {
		fmt.Printf("DeleteUser error deleting CV update requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error deleting CV update requests",
		})
		return
	}
	fmt.Printf("DeleteUser: Deleted CV update requests for user %s\n", id)

	// 4. Xóa CV (CASCADE sẽ xử lý cv_details)
	_, err = tx.Exec(c, "DELETE FROM cv WHERE user_id = $1", id)
	if err != nil {
		fmt.Printf("DeleteUser error deleting CV: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error deleting user CV",
		})
		return
	}
	fmt.Printf("DeleteUser: Deleted CV for user %s\n", id)

	// 5. Cuối cùng, xóa user
	result, err := tx.Exec(c, "DELETE FROM users WHERE id = $1", id)
	if err != nil {
		fmt.Printf("DeleteUser error deleting user: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error deleting user",
		})
		return
	}

	// Kiểm tra user có thực sự bị xóa không
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		fmt.Printf("DeleteUser: No rows affected when deleting user %s\n", id)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	// Commit transaction
	err = tx.Commit(c)
	if err != nil {
		fmt.Printf("DeleteUser transaction commit error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error committing transaction",
		})
		return
	}

	fmt.Printf("DeleteUser: Successfully deleted user %s\n", id)
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "User deleted successfully",
		"data": gin.H{
			"id": id,
		},
	})
}

// GetRoles returns all available roles
func GetRoles(c *gin.Context) {
	fmt.Println("GetRoles: Fetching roles from database")

	// Query database cho tất cả roles
	rows, err := database.DB.Query(c, "SELECT id, name FROM roles ORDER BY name")
	if err != nil {
		fmt.Printf("GetRoles error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching roles",
		})
		return
	}
	defer rows.Close()

	// Parse rows thành role objects
	var roles []models.Role
	for rows.Next() {
		var role models.Role
		if err := rows.Scan(&role.ID, &role.Name); err != nil {
			fmt.Printf("GetRoles scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error parsing role data",
			})
			return
		}
		roles = append(roles, role)
	}

	// Kiểm tra lỗi trong quá trình iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetRoles iteration error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error reading role data",
		})
		return
	}

	fmt.Printf("GetRoles: Returning %d roles\n", len(roles))
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   roles,
	})
}

// Helper function để kiểm tra slice có chứa string không
func contains(slice []string, item string) bool {
	return slices.Contains(slice, item)
}

// getAllUsers lấy tất cả users từ database (Admin access)
func getAllUsers(c *gin.Context) ([]models.User, error) {
	fmt.Println("getAllUsers: Fetching all users from database")

	rows, err := database.DB.Query(c, `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name,
		       (
		           SELECT COALESCE(string_agg(p.name, ', '), '')
		           FROM project_members pm
		           JOIN projects p ON pm.project_id = p.id
		           WHERE pm.user_id = u.id
		             AND (pm.left_at IS NULL OR pm.left_at > CURRENT_DATE)
		       ) as project_names
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		ORDER BY u.full_name`)

	if err != nil {
		return nil, fmt.Errorf("error querying all users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var deptName string
		var projectNamesStr string

		err := rows.Scan(&user.ID, &user.EmployeeCode, &user.FullName,
			&user.Email, &user.DepartmentID, &deptName, &projectNamesStr)
		if err != nil {
			return nil, fmt.Errorf("error scanning user: %w", err)
		}

		// Đặt department nếu có
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Parse project names từ comma-separated string
		if projectNamesStr != "" {
			// Split comma-separated project names
			projectNames := strings.Split(projectNamesStr, ", ")
			// Xóa các empty strings
			var filteredProjects []string
			for _, name := range projectNames {
				if strings.TrimSpace(name) != "" {
					filteredProjects = append(filteredProjects, strings.TrimSpace(name))
				}
			}
			user.Projects = filteredProjects
		} else {
			user.Projects = []string{} // Empty slice thay vì nil
		}

		// Lấy user roles
		userRoles, err := getUserRoles(c, user.ID)
		if err != nil {
			fmt.Printf("Warning: Could not fetch roles for user %s: %v\n", user.ID, err)
		} else {
			user.Roles = userRoles
		}

		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %w", err)
	}

	fmt.Printf("getAllUsers: Found %d users\n", len(users))
	return users, nil
}

// getUsersPaginated lấy paginated users từ database (Admin access)
func getUsersPaginated(c *gin.Context, page, perPage, offset int) (models.PaginatedUsersResponse, error) {
	fmt.Printf("getUsersPaginated: Fetching page %d with %d users per page (offset: %d)\n", page, perPage, offset)

	// Đầu tiên, lấy tổng số users
	var totalUsers int
	err := database.DB.QueryRow(c, `SELECT COUNT(*) FROM users`).Scan(&totalUsers)
	if err != nil {
		return models.PaginatedUsersResponse{}, fmt.Errorf("error counting users: %w", err)
	}

	// Tính pagination metadata
	totalPages := (totalUsers + perPage - 1) / perPage // Ceiling division
	hasNext := page < totalPages
	hasPrev := page > 1

	// Lấy paginated users
	rows, err := database.DB.Query(c, `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name,
		       (
		           SELECT COALESCE(string_agg(p.name, ', '), '')
		           FROM project_members pm
		           JOIN projects p ON pm.project_id = p.id
		           WHERE pm.user_id = u.id
		             AND (pm.left_at IS NULL OR pm.left_at > CURRENT_DATE)
		       ) as project_names
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		ORDER BY u.full_name
		LIMIT $1 OFFSET $2`, perPage, offset)

	if err != nil {
		return models.PaginatedUsersResponse{}, fmt.Errorf("error querying paginated users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var deptName string
		var projectNamesStr string

		err := rows.Scan(&user.ID, &user.EmployeeCode, &user.FullName,
			&user.Email, &user.DepartmentID, &deptName, &projectNamesStr)
		if err != nil {
			return models.PaginatedUsersResponse{}, fmt.Errorf("error scanning user: %w", err)
		}

		// Đặt department nếu có
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Parse project names từ comma-separated string
		if projectNamesStr != "" {
			// Split comma-separated project names
			projectNames := strings.Split(projectNamesStr, ", ")
			// Xóa các empty strings
			var filteredProjects []string
			for _, name := range projectNames {
				if strings.TrimSpace(name) != "" {
					filteredProjects = append(filteredProjects, strings.TrimSpace(name))
				}
			}
			user.Projects = filteredProjects
		} else {
			user.Projects = []string{} // Empty slice thay vì nil
		}

		// Lấy user roles
		userRoles, err := getUserRoles(c, user.ID)
		if err != nil {
			fmt.Printf("Warning: Could not fetch roles for user %s: %v\n", user.ID, err)
		} else {
			user.Roles = userRoles
		}

		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return models.PaginatedUsersResponse{}, fmt.Errorf("error iterating users: %w", err)
	}

	// Xây dựng paginated response
	response := models.PaginatedUsersResponse{
		Users:       users,
		CurrentPage: page,
		TotalPages:  totalPages,
		TotalUsers:  totalUsers,
		PerPage:     perPage,
		HasNext:     hasNext,
		HasPrev:     hasPrev,
	}

	fmt.Printf("getUsersPaginated: Returning %d users for page %d (total: %d users, %d pages)\n",
		len(users), page, totalUsers, totalPages)

	return response, nil
}

// getUserRoles lấy roles cho một user cụ thể
func getUserRoles(c *gin.Context, userID string) ([]models.Role, error) {
	rows, err := database.DB.Query(c, `
		SELECT r.id, r.name
		FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = $1
		ORDER BY r.name`, userID)

	if err != nil {
		return nil, fmt.Errorf("error querying user roles: %w", err)
	}
	defer rows.Close()

	var roles []models.Role
	for rows.Next() {
		var role models.Role
		err := rows.Scan(&role.ID, &role.Name)
		if err != nil {
			return nil, fmt.Errorf("error scanning role: %w", err)
		}
		roles = append(roles, role)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating roles: %w", err)
	}

	return roles, nil
}

// getUsersFromPMProjects lấy users từ projects mà PM là thành viên
func getUsersFromPMProjects(c *gin.Context, pmUserID string) ([]models.User, error) {
	fmt.Printf("getUsersFromPMProjects: Fetching users from projects where PM %s is a member\n", pmUserID)

	rows, err := database.DB.Query(c, `
		SELECT DISTINCT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		INNER JOIN project_members pm_user ON u.id = pm_user.user_id
		INNER JOIN project_members pm_pm ON pm_user.project_id = pm_pm.project_id
		WHERE pm_pm.user_id = $1
		  AND (pm_user.left_at IS NULL OR pm_user.left_at > CURRENT_DATE)
		ORDER BY u.full_name`, pmUserID)

	if err != nil {
		return nil, fmt.Errorf("error querying PM project users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var deptName string

		err := rows.Scan(&user.ID, &user.EmployeeCode, &user.FullName,
			&user.Email, &user.DepartmentID, &deptName)
		if err != nil {
			return nil, fmt.Errorf("error scanning user: %w", err)
		}

		// Đặt department nếu có
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Lấy user roles
		userRoles, err := getUserRoles(c, user.ID)
		if err != nil {
			fmt.Printf("Warning: Could not fetch roles for user %s: %v\n", user.ID, err)
		} else {
			user.Roles = userRoles
		}

		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %w", err)
	}

	fmt.Printf("getUsersFromPMProjects: Found %d users from PM's projects\n", len(users))
	return users, nil
}

// getUsersFromSameDepartment lấy users từ department giống với BUL/Lead
func getUsersFromSameDepartment(c *gin.Context, bulUserID string) ([]models.User, error) {
	fmt.Printf("getUsersFromSameDepartment: Fetching users from same department as BUL %s\n", bulUserID)

	// Đầu tiên, lấy department của BUL/Lead user
	var bulDepartmentID string
	err := database.DB.QueryRow(c, `
		SELECT department_id
		FROM users
		WHERE id = $1`, bulUserID).Scan(&bulDepartmentID)

	if err != nil {
		return nil, fmt.Errorf("error getting BUL department: %w", err)
	}

	if bulDepartmentID == "" {
		fmt.Printf("Warning: BUL user %s has no department assigned\n", bulUserID)
		return []models.User{}, nil
	}

	fmt.Printf("getUsersFromSameDepartment: BUL department ID: %s\n", bulDepartmentID)

	// Bây giờ lấy tất cả users từ department giống nhau
	rows, err := database.DB.Query(c, `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		WHERE u.department_id = $1
		ORDER BY u.full_name`, bulDepartmentID)

	if err != nil {
		return nil, fmt.Errorf("error querying department users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var deptName string

		err := rows.Scan(&user.ID, &user.EmployeeCode, &user.FullName,
			&user.Email, &user.DepartmentID, &deptName)
		if err != nil {
			return nil, fmt.Errorf("error scanning user: %w", err)
		}

		// Đặt department nếu có
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Lấy user roles
		userRoles, err := getUserRoles(c, user.ID)
		if err != nil {
			fmt.Printf("Warning: Could not fetch roles for user %s: %v\n", user.ID, err)
		} else {
			user.Roles = userRoles
		}

		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %w", err)
	}

	fmt.Printf("getUsersFromSameDepartment: Found %d users in department %s\n", len(users), bulDepartmentID)
	return users, nil
}

// getSingleUserByID lấy một user theo ID với tất cả dữ liệu liên quan
func getSingleUserByID(c *gin.Context, userID string) (models.User, error) {
	fmt.Printf("getSingleUserByID: Fetching user with ID: %s\n", userID)

	var user models.User
	var deptName string
	var projectNamesStr string

	err := database.DB.QueryRow(c, `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name,
		       (
		           SELECT COALESCE(string_agg(p.name, ', '), '')
		           FROM project_members pm
		           JOIN projects p ON pm.project_id = p.id
		           WHERE pm.user_id = u.id
		             AND (pm.left_at IS NULL OR pm.left_at > CURRENT_DATE)
		       ) as project_names
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		WHERE u.id = $1`, userID).Scan(&user.ID, &user.EmployeeCode, &user.FullName,
		&user.Email, &user.DepartmentID, &deptName, &projectNamesStr)

	if err != nil {
		return user, fmt.Errorf("error querying user: %w", err)
	}

	// Đặt department nếu có
	if user.DepartmentID != "" && deptName != "" {
		user.Department = models.Department{
			ID:   user.DepartmentID,
			Name: deptName,
		}
	}

	// Parse project names từ comma-separated string
	if projectNamesStr != "" {
		// Split comma-separated project names
		projectNames := strings.Split(projectNamesStr, ", ")
		// Xóa các empty strings
		var filteredProjects []string
		for _, name := range projectNames {
			if strings.TrimSpace(name) != "" {
				filteredProjects = append(filteredProjects, strings.TrimSpace(name))
			}
		}
		user.Projects = filteredProjects
	} else {
		user.Projects = []string{} // Empty slice thay vì nil
	}

	// Lấy user roles
	userRoles, err := getUserRoles(c, user.ID)
	if err != nil {
		fmt.Printf("Warning: Could not fetch roles for user %s: %v\n", user.ID, err)
	} else {
		user.Roles = userRoles
	}

	fmt.Printf("getSingleUserByID: Found user %s\n", user.ID)
	return user, nil
}
