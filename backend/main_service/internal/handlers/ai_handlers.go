package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/models"
)

// ParseCVFromFile xử lý yêu cầu phân tích CV bằng cách gọi đến AI service
func ParseCVFromFile(c *gin.Context) {
	var request models.ParseCVRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	if request.FilePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "File path is required",
		})
		return
	}

	if !strings.HasSuffix(strings.ToLower(request.FilePath), ".pdf") {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "File must be a PDF",
		})
		return
	}

	var localFilePath string
	var tempFile bool

	if isRemoteURL(request.FilePath) {
		tempPath, err := downloadFileToTemp(request.FilePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": fmt.Sprintf("Failed to download file: %v", err),
			})
			return
		}
		localFilePath = tempPath
		tempFile = true

		defer func() {
			if tempFile {
				os.Remove(localFilePath)
			}
		}()
	} else {
		localFilePath = request.FilePath

		if _, err := os.Stat(localFilePath); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"status":  "error",
				"message": fmt.Sprintf("File not found: %s", localFilePath),
			})
			return
		}
	}

	aiResponse, err := callAIService(localFilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to parse CV",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   aiResponse,
	})
}

// callAIService gửi HTTP request đến AI service
func callAIService(filePath string) (*models.AIServiceResponse, error) {
	aiServiceURL := os.Getenv("AI_SERVICE_URL")
	if aiServiceURL == "" {
		aiServiceURL = "http://localhost:8000"
	}

	requestPayload := models.AIServiceRequest{
		FilePath: filePath,
	}

	jsonData, err := json.Marshal(requestPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", aiServiceURL+"/parse-cv", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to AI service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI service returned error: %s (status: %d)", string(body), resp.StatusCode)
	}

	var aiResponse models.AIServiceResponse
	if err := json.Unmarshal(body, &aiResponse); err != nil {
		return nil, fmt.Errorf("failed to parse AI service response: %w", err)
	}

	return &aiResponse, nil
}

// isRemoteURL kiểm tra đường dẫn có phải URL từ xa không
func isRemoteURL(path string) bool {
	return strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://")
}

// downloadFileToTemp tải file từ xa về đường dẫn tạm thời local
func downloadFileToTemp(url string) (string, error) {
	tempFile, err := os.CreateTemp("", "cv_*.pdf")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer tempFile.Close()

	resp, err := http.Get(url)
	if err != nil {
		os.Remove(tempFile.Name())
		return "", fmt.Errorf("failed to download file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		os.Remove(tempFile.Name())
		return "", fmt.Errorf("failed to download file: HTTP %d", resp.StatusCode)
	}

	_, err = io.Copy(tempFile, resp.Body)
	if err != nil {
		os.Remove(tempFile.Name())
		return "", fmt.Errorf("failed to write temp file: %w", err)
	}

	return tempFile.Name(), nil
}
