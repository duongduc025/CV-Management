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

	err := database.DB.QueryRow(c,
		`SELECT cv.id, cv.user_id, cv.last_updated_by, cv.last_updated_at, cv.status,
		cv_details.id, cv_details.cv_id, cv_details.ho_ten, cv_details.chuc_danh, cv_details.anh_chan_dung,
		cv_details.tom_tat, cv_details.thong_tin_ca_nhan, cv_details.thong_tin_dao_tao,
		cv_details.thong_tin_khoa_hoc, cv_details.thong_tin_ki_nang, cv_details.cv_path
		FROM cv
		LEFT JOIN cv_details ON cv.id = cv_details.cv_id
		WHERE cv.user_id = $1`, userID).Scan(
		&cv.ID, &cv.UserID, &cv.LastUpdatedBy, &cv.LastUpdatedAt, &cv.Status,
		&details.ID, &details.CVID, &details.HoTen, &details.ChucDanh, &details.AnhChanDung,
		&details.TomTat, &details.ThongTinCaNhan, &details.ThongTinDaoTao,
		&details.ThongTinKhoaHoc, &details.ThongTinKiNang, &details.CVPath)

	if err != nil {
		fmt.Printf("GetUserCV: Error fetching CV: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV not found for this user",
		})
		return
	}

	cv.Details = details

	fmt.Printf("GetUserCV: Successfully fetched CV %s for user %s\n", cv.ID, cv.UserID)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   cv,
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

	err := database.DB.QueryRow(c,
		`SELECT cv.id, cv.user_id, cv.last_updated_by, cv.last_updated_at, cv.status,
		cv_details.id, cv_details.cv_id, cv_details.ho_ten, cv_details.chuc_danh, cv_details.anh_chan_dung,
		cv_details.tom_tat, cv_details.thong_tin_ca_nhan, cv_details.thong_tin_dao_tao,
		cv_details.thong_tin_khoa_hoc, cv_details.thong_tin_ki_nang, cv_details.cv_path
		FROM cv
		LEFT JOIN cv_details ON cv.id = cv_details.cv_id
		WHERE cv.user_id = $1`, userID).Scan(
		&cv.ID, &cv.UserID, &cv.LastUpdatedBy, &cv.LastUpdatedAt, &cv.Status,
		&details.ID, &details.CVID, &details.HoTen, &details.ChucDanh, &details.AnhChanDung,
		&details.TomTat, &details.ThongTinCaNhan, &details.ThongTinDaoTao,
		&details.ThongTinKhoaHoc, &details.ThongTinKiNang, &details.CVPath)

	if err != nil {
		fmt.Printf("GetCVByUserID: Error fetching CV: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV not found for this user",
		})
		return
	}

	cv.Details = details

	fmt.Printf("GetCVByUserID: Successfully fetched CV %s for user %s\n", cv.ID, cv.UserID)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   cv,
	})
}

// GetCVRequests returns all CV update requests for a user
func GetCVRequests(c *gin.Context) {
	// TODO: Get actual data from database
	// Mock data for now
	requests := []models.CVUpdateRequest{
		{
			ID:          "123e4567-e89b-12d3-a456-426614174003",
			CVID:        "123e4567-e89b-12d3-a456-426614174000",
			RequestedBy: "123e4567-e89b-12d3-a456-426614174001",
			Status:      "Đang yêu cầu",
		},
		{
			ID:          "123e4567-e89b-12d3-a456-426614174004",
			CVID:        "123e4567-e89b-12d3-a456-426614174000",
			RequestedBy: "123e4567-e89b-12d3-a456-426614174001",
			Status:      "Đã xử lý",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}

// CreateCVRequest creates a new CV update request
func CreateCVRequest(c *gin.Context) {
	var request struct {
		CVID string `json:"cv_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request data",
		})
		return
	}

	// TODO: Save to database
	// Mock response for now
	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": models.CVUpdateRequest{
			ID:          "123e4567-e89b-12d3-a456-426614174005",
			CVID:        request.CVID,
			RequestedBy: "123e4567-e89b-12d3-a456-426614174001", // Should be from auth context
			Status:      "Đang yêu cầu",
		},
	})
}

// UpdateCVRequestStatus updates the status of a CV update request
func UpdateCVRequestStatus(c *gin.Context) {
	id := c.Param("id")

	var request struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request data",
		})
		return
	}

	// Validate status
	if request.Status != "Đã xử lý" && request.Status != "Đã huỷ" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid status value",
		})
		return
	}

	// TODO: Update in database
	// Mock response for now
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": models.CVUpdateRequest{
			ID:          id,
			CVID:        "123e4567-e89b-12d3-a456-426614174000",
			RequestedBy: "123e4567-e89b-12d3-a456-426614174001",
			Status:      request.Status,
		},
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

	// Define the request structure for CV creation
	var request struct {
		HoTen           string `json:"ho_ten" binding:"required"`
		ChucDanh        string `json:"chuc_danh" binding:"required"`
		AnhChanDung     string `json:"anh_chan_dung"`
		TomTat          string `json:"tom_tat" binding:"required"`
		ThongTinCaNhan  string `json:"thong_tin_ca_nhan" binding:"required"`
		ThongTinDaoTao  string `json:"thong_tin_dao_tao" binding:"required"`
		ThongTinKhoaHoc string `json:"thong_tin_khoa_hoc"`
		ThongTinKiNang  string `json:"thong_tin_ki_nang" binding:"required"`
		CVPath          string `json:"cv_path" binding:"required"`
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
	isUpdate := false

	err := database.DB.QueryRow(c,
		`SELECT cv.id, cv_details.id
		FROM cv
		LEFT JOIN cv_details ON cv.id = cv_details.cv_id
		WHERE cv.user_id = $1`, userID).Scan(&existingCVID, &existingCVDetailID)

	if err == nil {
		// CV already exists, this will be an update
		isUpdate = true
		fmt.Printf("CreateOrUpdateCV: Updating existing CV %s for user %v\n", existingCVID, userID)
		if existingCVDetailID != nil {
			fmt.Printf("CreateOrUpdateCV: Found existing CV details %s\n", *existingCVDetailID)
		} else {
			fmt.Printf("CreateOrUpdateCV: No CV details found, will create new details\n")
		}
	} else {
		fmt.Printf("CreateOrUpdateCV: Creating new CV for user %v (error: %v)\n", userID, err)
	}

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
			`UPDATE cv SET last_updated_by = $1, last_updated_at = NOW(), status = 'Đã cập nhật'
			WHERE id = $2 RETURNING id`,
			userID, existingCVID).Scan(&cvID)

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
			err = tx.QueryRow(c,
				`UPDATE cv_details SET ho_ten = $1, chuc_danh = $2, anh_chan_dung = $3, tom_tat = $4, thong_tin_ca_nhan = $5,
				thong_tin_dao_tao = $6, thong_tin_khoa_hoc = $7, thong_tin_ki_nang = $8, cv_path = $9
				WHERE id = $10 RETURNING id`,
				request.HoTen, request.ChucDanh, request.AnhChanDung, request.TomTat, request.ThongTinCaNhan,
				request.ThongTinDaoTao, request.ThongTinKhoaHoc, request.ThongTinKiNang, request.CVPath, *existingCVDetailID).Scan(&cvDetailID)

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
			err = tx.QueryRow(c,
				`INSERT INTO cv_details (id, cv_id, ho_ten, chuc_danh, anh_chan_dung, tom_tat, thong_tin_ca_nhan, thong_tin_dao_tao, thong_tin_khoa_hoc, thong_tin_ki_nang, cv_path)
				VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
				RETURNING id`,
				cvID, request.HoTen, request.ChucDanh, request.AnhChanDung, request.TomTat, request.ThongTinCaNhan,
				request.ThongTinDaoTao, request.ThongTinKhoaHoc, request.ThongTinKiNang, request.CVPath).Scan(&cvDetailID)

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
			VALUES (uuid_generate_v4(), $1, $1, NOW(), 'Đã cập nhật')
			RETURNING id`,
			userID).Scan(&cvID)

		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Error creating CV record: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error creating CV record",
			})
			return
		}

		// Insert CV details record
		err = tx.QueryRow(c,
			`INSERT INTO cv_details (id, cv_id, ho_ten, chuc_danh, anh_chan_dung, tom_tat, thong_tin_ca_nhan, thong_tin_dao_tao, thong_tin_khoa_hoc, thong_tin_ki_nang, cv_path)
			VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING id`,
			cvID, request.HoTen, request.ChucDanh, request.AnhChanDung, request.TomTat, request.ThongTinCaNhan,
			request.ThongTinDaoTao, request.ThongTinKhoaHoc, request.ThongTinKiNang, request.CVPath).Scan(&cvDetailID)

		if err != nil {
			fmt.Printf("CreateOrUpdateCV: Error creating CV details record: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error creating CV details record",
			})
			return
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

	// Create response CV object
	cv := models.CV{
		ID:     cvID,
		UserID: userID.(string),
		LastUpdatedBy: sql.NullString{
			String: userID.(string),
			Valid:  true,
		},
		LastUpdatedAt: sql.NullTime{Time: time.Now()},
		Status:        "Đã cập nhật",
		Details: models.CVDetail{
			ID:              cvDetailID,
			CVID:            cvID,
			HoTen:           request.HoTen,
			ChucDanh:        request.ChucDanh,
			AnhChanDung:     request.AnhChanDung,
			TomTat:          request.TomTat,
			ThongTinCaNhan:  request.ThongTinCaNhan,
			ThongTinDaoTao:  request.ThongTinDaoTao,
			ThongTinKhoaHoc: request.ThongTinKhoaHoc,
			ThongTinKiNang:  request.ThongTinKiNang,
			CVPath:          request.CVPath,
		},
	}

	var responseMessage string
	var statusCode int
	if isUpdate {
		responseMessage = "CV updated successfully"
		statusCode = http.StatusOK
		fmt.Printf("CreateOrUpdateCV: Successfully updated CV with ID %s for user %v\n", cvID, userID)
	} else {
		responseMessage = "CV created successfully"
		statusCode = http.StatusCreated
		fmt.Printf("CreateOrUpdateCV: Successfully created CV with ID %s for user %v\n", cvID, userID)
	}

	c.JSON(statusCode, gin.H{
		"status":  "success",
		"message": responseMessage,
		"data":    cv,
	})
}
