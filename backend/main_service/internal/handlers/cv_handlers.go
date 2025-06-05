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

	fmt.Printf("GetCVByUserID: Successfully fetched CV %s for user %s with status: %s\n", cv.ID, cv.UserID, cv.Status)

	// You can add specific handling based on status if needed
	// For example, if cv.Status == "Chưa cập nhật" { ... }

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   cv,
	})
}

// GetCVRequests returns all CV update requests for a user
func GetCVRequests(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("GetCVRequests: Fetching CV requests for user %v\n", userID)

	// Query to get all CV update requests for a user with requester name
	rows, err := database.DB.Query(c,
		`SELECT cur.id, cur.cv_id, cur.requested_by, u.full_name, cur.requested_at, cur.status, cur.is_read, cur.content
		FROM cv_update_requests cur
		JOIN users u ON cur.requested_by = u.id
		JOIN cv ON cur.cv_id = cv.id
		WHERE cv.user_id = $1
		ORDER BY cur.requested_at DESC`, userID)

	if err != nil {
		fmt.Printf("GetCVRequests: Error querying CV requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching CV update requests",
		})
		return
	}
	defer rows.Close()

	// Process the query results
	var requests []map[string]any
	for rows.Next() {
		var id, cvID, requestedBy, requesterName, status string
		var requestedAt time.Time
		var isRead bool
		var content *string

		err := rows.Scan(&id, &cvID, &requestedBy, &requesterName, &requestedAt, &status, &isRead, &content)
		if err != nil {
			fmt.Printf("GetCVRequests: Error scanning row: %v\n", err)
			continue
		}

		// Create notification message based on content
		var notificationMessage string
		if content != nil && *content != "" {
			notificationMessage = fmt.Sprintf("%s với lời nhắn: \"%s\"", requesterName, *content)
		} else {
			notificationMessage = fmt.Sprintf("%s đã yêu cầu bạn cập nhật CV. Vui lòng cập nhật CV của bạn trong thời gian sớm nhất.", requesterName)
		}

		// Create request object with additional fields for notifications
		request := map[string]any{
			"id":             id,
			"cv_id":          cvID,
			"requested_by":   requestedBy,
			"requester_name": requesterName,
			"requested_at":   requestedAt.Format(time.RFC3339),
			"status":         status,
			"is_read":        isRead,
			"content":        content,
			// Additional fields for notification compatibility
			"type":      "cv_update_request",
			"title":     "Yêu cầu cập nhật CV",
			"message":   notificationMessage,
			"timestamp": requestedAt.Unix(),
			"read":      isRead, // Use actual read status from database
		}

		requests = append(requests, request)
	}

	// Check for any errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetCVRequests: Error during row iteration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error processing CV update requests",
		})
		return
	}

	fmt.Printf("GetCVRequests: Successfully fetched %d CV requests for user %v\n", len(requests), userID)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}

// CreateCVRequest creates a new CV update request
func CreateCVRequest(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	requestedByID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	var request struct {
		CVID    string `json:"cv_id" binding:"required"`
		Content string `json:"content"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request data",
		})
		return
	}

	fmt.Printf("CreateCVRequest: Creating request for CV %s by user %v\n", request.CVID, requestedByID)

	// Check if CV exists and get the user_id who owns it
	var cvOwnerID string
	err := database.DB.QueryRow(c, "SELECT user_id FROM cv WHERE id = $1", request.CVID).Scan(&cvOwnerID)
	if err != nil {
		fmt.Printf("CreateCVRequest: Error finding CV: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV not found",
		})
		return
	}

	// Check if there's already an active request for this CV and cancel it
	var existingRequestID string
	err = database.DB.QueryRow(c,
		"SELECT id FROM cv_update_requests WHERE cv_id = $1 AND status = 'Đang yêu cầu'",
		request.CVID).Scan(&existingRequestID)

	if err == nil {
		// Active request exists, cancel it by changing status to "Đã huỷ"
		fmt.Printf("CreateCVRequest: Found existing active request %s, cancelling it\n", existingRequestID)
		_, err = database.DB.Exec(c,
			"UPDATE cv_update_requests SET status = 'Đã huỷ' WHERE id = $1",
			existingRequestID)

		if err != nil {
			fmt.Printf("CreateCVRequest: Error cancelling existing request: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error cancelling existing CV update request",
			})
			return
		}
		fmt.Printf("CreateCVRequest: Successfully cancelled existing request %s\n", existingRequestID)
	}

	// Create new CV update request
	var newRequestID string
	var contentPtr *string
	if request.Content != "" {
		contentPtr = &request.Content
	}

	err = database.DB.QueryRow(c,
		`INSERT INTO cv_update_requests (id, cv_id, requested_by, requested_at, status, content)
		VALUES (uuid_generate_v4(), $1, $2, NOW(), 'Đang yêu cầu', $3)
		RETURNING id`,
		request.CVID, requestedByID, contentPtr).Scan(&newRequestID)

	if err != nil {
		fmt.Printf("CreateCVRequest: Error creating request: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error creating CV update request",
		})
		return
	}

	fmt.Printf("CreateCVRequest: Successfully created request %s\n", newRequestID)

	// Send SSE notification to CV owner
	go func() {
		// Get requester information for the notification
		var requesterName string
		err := database.DB.QueryRow(c, "SELECT full_name FROM users WHERE id = $1", requestedByID).Scan(&requesterName)
		if err != nil {
			fmt.Printf("CreateCVRequest: Error getting requester name: %v\n", err)
			requesterName = "Quản lý dự án"
		}

		// Create notification message
		var notificationMessage string
		if request.Content != "" {
			notificationMessage = fmt.Sprintf("%s đã yêu cầu bạn cập nhật CV với lời nhắn: \"%s\"", requesterName, request.Content)
		} else {
			notificationMessage = fmt.Sprintf("%s đã yêu cầu bạn cập nhật CV. Vui lòng cập nhật CV của bạn trong thời gian sớm nhất.", requesterName)
		}

		notificationData := map[string]any{
			"type":           "cv_update_request",
			"title":          "Yêu cầu cập nhật CV",
			"message":        notificationMessage,
			"cv_id":          request.CVID,
			"request_id":     newRequestID,
			"requested_by":   requestedByID,
			"requester_name": requesterName,
			"content":        request.Content,
			"timestamp":      time.Now().Unix(),
		}

		SendSSENotificationToUser(cvOwnerID, "cv_update_request", notificationData)
		fmt.Printf("CreateCVRequest: SSE notification sent to CV owner %s\n", cvOwnerID)
	}()

	// Create response
	response := models.CVUpdateRequest{
		ID:          newRequestID,
		CVID:        request.CVID,
		RequestedBy: requestedByID.(string),
		RequestedAt: time.Now(),
		Status:      "Đang yêu cầu",
	}

	// Determine message based on whether we cancelled an existing request
	message := "Yêu cầu cập nhật CV đã được tạo thành công"
	if existingRequestID != "" {
		message = "Yêu cầu cập nhật CV đã được tạo thành công"
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"data":    response,
		"message": message,
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

// MarkCVRequestAsRead marks a specific CV update request as read
func MarkCVRequestAsRead(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	requestID := c.Param("id")
	if requestID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Request ID is required",
		})
		return
	}

	fmt.Printf("MarkCVRequestAsRead: Marking request %s as read for user %v\n", requestID, userID)

	// Update the is_read status for the specific request, but only if the user owns the CV
	result, err := database.DB.Exec(c,
		`UPDATE cv_update_requests
		SET is_read = true
		WHERE id = $1
		AND cv_id IN (SELECT id FROM cv WHERE user_id = $2)`,
		requestID, userID)

	if err != nil {
		fmt.Printf("MarkCVRequestAsRead: Error updating request: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error marking request as read",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Request not found or you don't have permission to update it",
		})
		return
	}

	fmt.Printf("MarkCVRequestAsRead: Successfully marked request %s as read\n", requestID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Request marked as read",
	})
}

// MarkAllCVRequestsAsRead marks all CV update requests as read for the authenticated user
func MarkAllCVRequestsAsRead(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("MarkAllCVRequestsAsRead: Marking all requests as read for user %v\n", userID)

	// Update all unread requests for the user's CVs
	result, err := database.DB.Exec(c,
		`UPDATE cv_update_requests
		SET is_read = true
		WHERE is_read = false
		AND cv_id IN (SELECT id FROM cv WHERE user_id = $1)`,
		userID)

	if err != nil {
		fmt.Printf("MarkAllCVRequestsAsRead: Error updating requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error marking all requests as read",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	fmt.Printf("MarkAllCVRequestsAsRead: Successfully marked %d requests as read\n", rowsAffected)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Marked %d requests as read", rowsAffected),
		"data": gin.H{
			"updated_count": rowsAffected,
		},
	})
}
