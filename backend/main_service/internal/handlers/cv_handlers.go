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
		cv_details.thong_tin_khoa_hoc, cv_details.thong_tin_ki_nang, cv_details.cv_path,
		updater.full_name, updater.employee_code
		FROM cv
		LEFT JOIN cv_details ON cv.id = cv_details.cv_id
		LEFT JOIN users updater ON cv.last_updated_by = updater.id
		WHERE cv.user_id = $1`, userID).Scan(
		&cv.ID, &cv.UserID, &cv.LastUpdatedBy, &cv.LastUpdatedAt, &cv.Status,
		&details.ID, &details.CVID, &details.HoTen, &details.ChucDanh, &details.AnhChanDung,
		&details.TomTat, &details.ThongTinCaNhan, &details.ThongTinDaoTao,
		&details.ThongTinKhoaHoc, &details.ThongTinKiNang, &details.CVPath,
		&cv.UpdaterName, &cv.UpdaterEmployeeCode)

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

	// Create response with proper null handling
	response := map[string]interface{}{
		"id":      cv.ID,
		"user_id": cv.UserID,
		"status":  cv.Status,
		"details": cv.Details,
	}

	// Handle nullable fields
	if cv.LastUpdatedBy.Valid {
		response["last_updated_by"] = cv.LastUpdatedBy.String
	}
	if cv.LastUpdatedAt.Valid {
		response["last_updated_at"] = cv.LastUpdatedAt.Time
	}
	if cv.UpdaterName.Valid {
		response["updater_name"] = cv.UpdaterName.String
	}
	if cv.UpdaterEmployeeCode.Valid {
		response["updater_employee_code"] = cv.UpdaterEmployeeCode.String
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

	err := database.DB.QueryRow(c,
		`SELECT cv.id, cv.user_id, cv.last_updated_by, cv.last_updated_at, cv.status,
		cv_details.id, cv_details.cv_id, cv_details.ho_ten, cv_details.chuc_danh, cv_details.anh_chan_dung,
		cv_details.tom_tat, cv_details.thong_tin_ca_nhan, cv_details.thong_tin_dao_tao,
		cv_details.thong_tin_khoa_hoc, cv_details.thong_tin_ki_nang, cv_details.cv_path,
		updater.full_name, updater.employee_code
		FROM cv
		LEFT JOIN cv_details ON cv.id = cv_details.cv_id
		LEFT JOIN users updater ON cv.last_updated_by = updater.id
		WHERE cv.user_id = $1`, userID).Scan(
		&cv.ID, &cv.UserID, &cv.LastUpdatedBy, &cv.LastUpdatedAt, &cv.Status,
		&details.ID, &details.CVID, &details.HoTen, &details.ChucDanh, &details.AnhChanDung,
		&details.TomTat, &details.ThongTinCaNhan, &details.ThongTinDaoTao,
		&details.ThongTinKhoaHoc, &details.ThongTinKiNang, &details.CVPath,
		&cv.UpdaterName, &cv.UpdaterEmployeeCode)

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

	// Create response with proper null handling
	response := map[string]interface{}{
		"id":      cv.ID,
		"user_id": cv.UserID,
		"status":  cv.Status,
		"details": cv.Details,
	}

	// Handle nullable fields
	if cv.LastUpdatedBy.Valid {
		response["last_updated_by"] = cv.LastUpdatedBy.String
	}
	if cv.LastUpdatedAt.Valid {
		response["last_updated_at"] = cv.LastUpdatedAt.Time
	}
	if cv.UpdaterName.Valid {
		response["updater_name"] = cv.UpdaterName.String
	}
	if cv.UpdaterEmployeeCode.Valid {
		response["updater_employee_code"] = cv.UpdaterEmployeeCode.String
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
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

	// Check if CV exists and get the user_id and status
	var cvOwnerID, cvStatus string
	err := database.DB.QueryRow(c, "SELECT user_id, status FROM cv WHERE id = $1", request.CVID).Scan(&cvOwnerID, &cvStatus)
	if err != nil {
		fmt.Printf("CreateCVRequest: Error finding CV: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV not found",
		})
		return
	}

	// Check CV status before creating request
	if cvStatus == "Chưa cập nhật" {
		fmt.Printf("CreateCVRequest: CV %s is already in 'Chưa cập nhật' status, sending status message\n", request.CVID)
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "CV đang trong trạng thái chờ cập nhật",
		})
		return
	}

	// If CV is in "Đã cập nhật" or "Hủy yêu cầu" status, update it to "Chưa cập nhật"
	if cvStatus == "Đã cập nhật" || cvStatus == "Hủy yêu cầu" {
		fmt.Printf("CreateCVRequest: Updating CV %s status from '%s' to 'Chưa cập nhật'\n", request.CVID, cvStatus)
		_, err = database.DB.Exec(c,
			"UPDATE cv SET status = 'Chưa cập nhật' WHERE id = $1",
			request.CVID)

		if err != nil {
			fmt.Printf("CreateCVRequest: Error updating CV status: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating CV status",
			})
			return
		}
		fmt.Printf("CreateCVRequest: Successfully updated CV %s status to 'Chưa cập nhật'\n", request.CVID)
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

	fmt.Printf("UpdateCVRequestStatus: Updating request %s to status %s\n", id, request.Status)

	// Update the request status in database
	result, err := database.DB.Exec(c,
		`UPDATE cv_update_requests SET status = $1 WHERE id = $2`,
		request.Status, id)

	if err != nil {
		fmt.Printf("UpdateCVRequestStatus: Error updating request: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating CV update request status",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV update request not found",
		})
		return
	}

	// Get the updated request details
	var updatedRequest models.CVUpdateRequest
	err = database.DB.QueryRow(c,
		`SELECT id, cv_id, requested_by, requested_at, status, is_read, content
		FROM cv_update_requests WHERE id = $1`,
		id).Scan(&updatedRequest.ID, &updatedRequest.CVID, &updatedRequest.RequestedBy,
		&updatedRequest.RequestedAt, &updatedRequest.Status, &updatedRequest.IsRead, &updatedRequest.Content)

	if err != nil {
		fmt.Printf("UpdateCVRequestStatus: Error fetching updated request: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching updated request details",
		})
		return
	}

	fmt.Printf("UpdateCVRequestStatus: Successfully updated request %s to status %s\n", id, request.Status)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "CV update request status updated successfully",
		"data":    updatedRequest,
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

	// Check if all required fields are filled (not empty/blank)
	requiredFieldsFilled := request.HoTen != "" && request.ChucDanh != "" &&
		request.TomTat != "" && request.ThongTinCaNhan != "" &&
		request.ThongTinDaoTao != "" && request.ThongTinKiNang != ""

	fmt.Printf("CreateOrUpdateCV: Required fields filled: %v\n", requiredFieldsFilled)

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

	// Determine the new status based on required fields completion
	var newStatus string
	if requiredFieldsFilled {
		newStatus = "Đã cập nhật"
	} else {
		// If not all required fields are filled, keep current status or set to "Chưa cập nhật" for new CVs
		if isUpdate {
			newStatus = currentStatus // Keep existing status
		} else {
			newStatus = "Chưa cập nhật" // Default for new incomplete CVs
		}
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
		LastUpdatedAt: sql.NullTime{Time: time.Now()},
		Status:        newStatus,
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

	// Determine response message based on field completion
	if !requiredFieldsFilled {
		responseMessage = "Cần điền đủ các trường bắt buộc"
	} else {
		if isUpdate {
			responseMessage = "CV updated successfully"
		} else {
			responseMessage = "CV created successfully"
		}
	}

	statusCode = http.StatusOK
	if !isUpdate {
		statusCode = http.StatusCreated
	}

	fmt.Printf("CreateOrUpdateCV: Successfully %s CV with ID %s for user %v, status: %s\n",
		map[bool]string{true: "updated", false: "created"}[isUpdate], cvID, userID, newStatus)

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

// GetAllCVRequestsForAdmin returns all CV update requests across all users (admin only)
func GetAllCVRequestsForAdmin(c *gin.Context) {
	fmt.Println("GetAllCVRequestsForAdmin: Fetching all CV requests for admin")

	// Query to get all CV update requests with employee and requester information
	rows, err := database.DB.Query(c,
		`SELECT
			cur.id,
			cur.cv_id,
			cur.requested_by,
			cur.requested_at,
			cur.status,
			cur.is_read,
			cur.content,
			emp.full_name as employee_name,
			COALESCE(dept.name, 'N/A') as department,
			req.full_name as requester_name
		FROM cv_update_requests cur
		JOIN cv ON cur.cv_id = cv.id
		JOIN users emp ON cv.user_id = emp.id
		LEFT JOIN departments dept ON emp.department_id = dept.id
		JOIN users req ON cur.requested_by = req.id
		ORDER BY cur.requested_at DESC`)

	if err != nil {
		fmt.Printf("GetAllCVRequestsForAdmin: Error querying CV requests: %v\n", err)
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
		var id, cvID, requestedBy, employeeName, department, requesterName, status string
		var requestedAt time.Time
		var isRead bool
		var content *string

		err := rows.Scan(&id, &cvID, &requestedBy, &requestedAt, &status, &isRead, &content,
			&employeeName, &department, &requesterName)
		if err != nil {
			fmt.Printf("GetAllCVRequestsForAdmin: Error scanning row: %v\n", err)
			continue
		}

		request := map[string]any{
			"id":             id,
			"cv_id":          cvID,
			"requested_by":   requestedBy,
			"requested_at":   requestedAt.Format(time.RFC3339),
			"status":         status,
			"is_read":        isRead,
			"employee_name":  employeeName,
			"department":     department,
			"requester_name": requesterName,
		}

		if content != nil {
			request["content"] = *content
		}

		requests = append(requests, request)
	}

	// Check for any errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetAllCVRequestsForAdmin: Error during row iteration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error processing CV update requests",
		})
		return
	}

	fmt.Printf("GetAllCVRequestsForAdmin: Successfully fetched %d CV requests\n", len(requests))

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}

// GetSentCVRequests returns all CV update requests sent by the authenticated user
func GetSentCVRequests(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("GetSentCVRequests: Fetching CV requests sent by user %v\n", userID)

	// Query to get all CV update requests sent by the user with employee information
	rows, err := database.DB.Query(c,
		`SELECT
			cur.id,
			cur.cv_id,
			cur.requested_by,
			cur.requested_at,
			cur.status,
			cur.is_read,
			cur.content,
			emp.full_name as employee_name,
			COALESCE(dept.name, 'N/A') as department
		FROM cv_update_requests cur
		JOIN cv ON cur.cv_id = cv.id
		JOIN users emp ON cv.user_id = emp.id
		LEFT JOIN departments dept ON emp.department_id = dept.id
		WHERE cur.requested_by = $1
		ORDER BY cur.requested_at DESC`, userID)

	if err != nil {
		fmt.Printf("GetSentCVRequests: Error querying sent CV requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching sent CV update requests",
		})
		return
	}
	defer rows.Close()

	// Process the query results
	var requests []map[string]any
	for rows.Next() {
		var id, cvID, requestedBy, employeeName, department, status string
		var requestedAt time.Time
		var isRead bool
		var content *string

		err := rows.Scan(&id, &cvID, &requestedBy, &requestedAt, &status, &isRead, &content,
			&employeeName, &department)
		if err != nil {
			fmt.Printf("GetSentCVRequests: Error scanning row: %v\n", err)
			continue
		}

		request := map[string]any{
			"id":            id,
			"cv_id":         cvID,
			"requested_by":  requestedBy,
			"requested_at":  requestedAt.Format(time.RFC3339),
			"status":        status,
			"is_read":       isRead,
			"employee_name": employeeName,
			"department":    department,
		}

		if content != nil {
			request["content"] = *content
		}

		requests = append(requests, request)
	}

	// Check for any errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetSentCVRequests: Error during row iteration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error processing sent CV update requests",
		})
		return
	}

	fmt.Printf("GetSentCVRequests: Successfully fetched %d sent CV requests\n", len(requests))

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}

// GetSentCVRequestsPM returns CV update requests sent by the PM to users in their managed projects
func GetSentCVRequestsPM(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("GetSentCVRequestsPM: Fetching CV requests sent by PM %v\n", userID)

	// Query to get CV update requests sent by the PM to users in their managed projects
	rows, err := database.DB.Query(c,
		`SELECT
			cur.id,
			cur.cv_id,
			cur.requested_by,
			cur.requested_at,
			cur.status,
			cur.is_read,
			cur.content,
			emp.full_name as employee_name,
			emp.employee_code,
			COALESCE(dept.name, 'N/A') as department
		FROM cv_update_requests cur
		JOIN cv ON cur.cv_id = cv.id
		JOIN users emp ON cv.user_id = emp.id
		LEFT JOIN departments dept ON emp.department_id = dept.id
		WHERE cur.requested_by = $1
		AND cv.user_id IN (
			SELECT DISTINCT pm.user_id
			FROM project_members pm
			JOIN project_members pm_requester ON pm.project_id = pm_requester.project_id
			WHERE pm_requester.user_id = $2 AND pm_requester.role_in_project = 'PM'
		)
		ORDER BY cur.requested_at DESC`, userID, userID)

	if err != nil {
		fmt.Printf("GetSentCVRequestsPM: Error querying sent CV requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching sent CV update requests",
		})
		return
	}
	defer rows.Close()

	// Process the query results
	var requests []map[string]any
	for rows.Next() {
		var id, cvID, requestedBy, employeeName, employeeCode, department, status string
		var requestedAt time.Time
		var isRead bool
		var content *string

		err := rows.Scan(&id, &cvID, &requestedBy, &requestedAt, &status, &isRead, &content,
			&employeeName, &employeeCode, &department)
		if err != nil {
			fmt.Printf("GetSentCVRequestsPM: Error scanning row: %v\n", err)
			continue
		}

		request := map[string]any{
			"id":            id,
			"cv_id":         cvID,
			"requested_by":  requestedBy,
			"requested_at":  requestedAt.Format(time.RFC3339),
			"status":        status,
			"is_read":       isRead,
			"employee_name": employeeName,
			"employee_code": employeeCode,
			"department":    department,
		}

		if content != nil {
			request["content"] = *content
		}

		requests = append(requests, request)
	}

	// Check for any errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetSentCVRequestsPM: Error during row iteration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error processing sent CV update requests",
		})
		return
	}

	fmt.Printf("GetSentCVRequestsPM: Successfully fetched %d sent CV requests for PM\n", len(requests))

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}

// GetSentCVRequestsBUL returns CV update requests sent by the BUL to users in their Business Unit
func GetSentCVRequestsBUL(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("GetSentCVRequestsBUL: Fetching CV requests sent by BUL %v\n", userID)

	// Query to get CV update requests sent by the BUL to users in their Business Unit
	rows, err := database.DB.Query(c,
		`SELECT
			cur.id,
			cur.cv_id,
			cur.requested_by,
			cur.requested_at,
			cur.status,
			cur.is_read,
			cur.content,
			emp.full_name as employee_name,
			emp.employee_code,
			COALESCE(dept.name, 'N/A') as department
		FROM cv_update_requests cur
		JOIN cv ON cur.cv_id = cv.id
		JOIN users emp ON cv.user_id = emp.id
		LEFT JOIN departments dept ON emp.department_id = dept.id
		WHERE cur.requested_by = $1
		AND emp.department_id = (
			SELECT department_id
			FROM users
			WHERE id = $2
		)
		ORDER BY cur.requested_at DESC`, userID, userID)

	if err != nil {
		fmt.Printf("GetSentCVRequestsBUL: Error querying sent CV requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching sent CV update requests",
		})
		return
	}
	defer rows.Close()

	// Process the query results
	var requests []map[string]any
	for rows.Next() {
		var id, cvID, requestedBy, employeeName, employeeCode, department, status string
		var requestedAt time.Time
		var isRead bool
		var content *string

		err := rows.Scan(&id, &cvID, &requestedBy, &requestedAt, &status, &isRead, &content,
			&employeeName, &employeeCode, &department)
		if err != nil {
			fmt.Printf("GetSentCVRequestsBUL: Error scanning row: %v\n", err)
			continue
		}

		request := map[string]any{
			"id":            id,
			"cv_id":         cvID,
			"requested_by":  requestedBy,
			"requested_at":  requestedAt.Format(time.RFC3339),
			"status":        status,
			"is_read":       isRead,
			"employee_name": employeeName,
			"employee_code": employeeCode,
			"department":    department,
		}

		if content != nil {
			request["content"] = *content
		}

		requests = append(requests, request)
	}

	// Check for any errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetSentCVRequestsBUL: Error during row iteration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error processing sent CV update requests",
		})
		return
	}

	fmt.Printf("GetSentCVRequestsBUL: Successfully fetched %d sent CV requests for BUL\n", len(requests))

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}
