package handlers

import (
	"fmt"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/database"
	"github.com/vdt/cv-management/internal/models"
)

// GetUsersInDepartment returns users from a specific department (BUL/Lead only)
func GetUsersInDepartment(c *gin.Context) {
	fmt.Printf("=== GetUsersInDepartment Debug Info ===\n")

	// Get user ID and roles from context (set by AuthMiddleware)
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

	// Check if user has BUL/Lead role
	if !contains(roleSlice, "BUL/Lead") {
		fmt.Printf("GetUsersInDepartment: Access denied - user does not have BUL/Lead role\n")
		c.JSON(http.StatusForbidden, gin.H{
			"status":  "error",
			"message": "Forbidden - only BUL/Lead users can access this endpoint",
		})
		return
	}

	// Get department ID from URL parameter
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

	// Query database for users in the specified department
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

		// Get user roles
		userRoles, err := getUserRoles(c, user.ID)
		if err != nil {
			fmt.Printf("Warning: Could not fetch roles for user %s: %v\n", user.ID, err)
		} else {
			user.Roles = userRoles
		}

		users = append(users, user)
	}

	// Check for errors during iteration
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

// GetUsersInProject returns users from a specific project (PM only)
func GetUsersInProject(c *gin.Context) {
	fmt.Printf("=== GetUsersInProject Debug Info ===\n")

	// Get user ID and roles from context (set by AuthMiddleware)
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

	// Check if user has PM role
	if !contains(roleSlice, "PM") {
		fmt.Printf("GetUsersInProject: Access denied - user does not have PM role\n")
		c.JSON(http.StatusForbidden, gin.H{
			"status":  "error",
			"message": "Forbidden - only PM users can access this endpoint",
		})
		return
	}

	// Get project ID from URL parameter
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

	// First, verify that the PM is a member of this project
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

	// Query database for users in the specified project
	rows, err := database.DB.Query(c, `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name,
		       pm.role_in_project, pm.joined_at, pm.left_at
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		INNER JOIN project_members pm ON u.id = pm.user_id
		WHERE pm.project_id = $1
		  AND (pm.left_at IS NULL OR pm.left_at > CURRENT_DATE)
		ORDER BY u.full_name`, projectID)

	if err != nil {
		fmt.Printf("GetUsersInProject error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching users from project",
		})
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var deptName string
		var roleInProject, joinedAt, leftAt interface{}

		err := rows.Scan(&user.ID, &user.EmployeeCode, &user.FullName,
			&user.Email, &user.DepartmentID, &deptName,
			&roleInProject, &joinedAt, &leftAt)
		if err != nil {
			fmt.Printf("GetUsersInProject scan error: %v\n", err)
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

		// Get user roles
		userRoles, err := getUserRoles(c, user.ID)
		if err != nil {
			fmt.Printf("Warning: Could not fetch roles for user %s: %v\n", user.ID, err)
		} else {
			user.Roles = userRoles
		}

		users = append(users, user)
	}

	// Check for errors during iteration
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

	// Fetch all users from the database
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

// GetUserByID returns a specific user by ID
func GetUserByID(c *gin.Context) {
	id := c.Param("id")

	// TODO: Get actual data from database
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

	// TODO: When implementing this function, ensure Employee role is automatically added
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

	// TODO: Save to database
	// Mock response for now
	user.ID = "123e4567-e89b-12d3-a456-426614174003" // Would be generated by DB

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   user,
	})
}

// UpdateUser updates an existing user
func UpdateUser(c *gin.Context) {
	id := c.Param("id")

	var userData models.User
	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid user data",
		})
		return
	}

	// TODO: Update in database
	// Mock response for now
	userData.ID = id

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   userData,
	})
}

// DeleteUser deletes a user by ID
func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	// TODO: Delete from database
	// Mock response for now
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "User deleted successfully",
		"data": gin.H{
			"id": id,
		},
	})
}

// GetDepartments returns all departments
func GetDepartments(c *gin.Context) {
	fmt.Println("GetDepartments: Fetching departments from database")

	// Query database for all departments
	rows, err := database.DB.Query(c, "SELECT id, name FROM departments ORDER BY name")
	if err != nil {
		fmt.Printf("GetDepartments error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching departments",
		})
		return
	}
	defer rows.Close()

	// Parse rows into department objects
	var departments []models.Department
	for rows.Next() {
		var dept models.Department
		if err := rows.Scan(&dept.ID, &dept.Name); err != nil {
			fmt.Printf("GetDepartments scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error parsing department data",
			})
			return
		}
		departments = append(departments, dept)
	}

	// Check for errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetDepartments iteration error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error reading department data",
		})
		return
	}

	fmt.Printf("GetDepartments: Returning %d departments\n", len(departments))
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   departments,
	})
}

// GetRoles returns all available roles
func GetRoles(c *gin.Context) {
	fmt.Println("GetRoles: Fetching roles from database")

	// Query database for all roles
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

	// Parse rows into role objects
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

	// Check for errors during iteration
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

// Helper function to check if a slice contains a string
func contains(slice []string, item string) bool {
	return slices.Contains(slice, item)
}

// getAllUsers fetches all users from the database (Admin access)
func getAllUsers(c *gin.Context) ([]models.User, error) {
	fmt.Println("getAllUsers: Fetching all users from database")

	rows, err := database.DB.Query(c, `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name
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

		err := rows.Scan(&user.ID, &user.EmployeeCode, &user.FullName,
			&user.Email, &user.DepartmentID, &deptName)
		if err != nil {
			return nil, fmt.Errorf("error scanning user: %w", err)
		}

		// Set department if available
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Get user roles
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

// getUserRoles fetches roles for a specific user
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

// getUsersFromPMProjects fetches users from projects where the PM is a member
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

		// Set department if available
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Get user roles
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

// getUsersFromSameDepartment fetches users from the same department as the BUL/Lead
func getUsersFromSameDepartment(c *gin.Context, bulUserID string) ([]models.User, error) {
	fmt.Printf("getUsersFromSameDepartment: Fetching users from same department as BUL %s\n", bulUserID)

	// First, get the department of the BUL/Lead user
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

	// Now get all users from the same department
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

		// Set department if available
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Get user roles
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
