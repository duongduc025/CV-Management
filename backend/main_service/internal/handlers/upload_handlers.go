package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/utils"
)

// UploadImageResponse represents the response structure for CV photo upload
type UploadImageResponse struct {
	URL          string `json:"url"`
	OriginalName string `json:"original_name"`
	Size         int64  `json:"size"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	AspectRatio  string `json:"aspect_ratio"`
}

// UploadPDFResponse represents the response structure for PDF upload
type UploadPDFResponse struct {
	URL          string `json:"url"`
	OriginalName string `json:"original_name"`
	Size         int64  `json:"size"`
	ContentType  string `json:"content_type"`
}

// UploadCVPhoto handles CV profile photo upload with predefined settings
func UploadCVPhoto(c *gin.Context) {
	// Phân tích multipart form
	err := c.Request.ParseMultipartForm(10 << 20) // 10MB bộ nhớ tối đa
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Failed to parse multipart form",
		})
		return
	}

	// Lấy file được upload
	fileHeader, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No image file provided. Use 'image' field name.",
		})
		return
	}

	// Xác thực file ảnh
	if err := utils.ValidateImageFile(fileHeader); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Invalid image file: %v", err),
		})
		return
	}

	// Sử dụng cài đặt định sẵn cho ảnh CV
	options := &utils.ImageProcessingOptions{
		AspectRatio: utils.AspectRatio3x4, // Ảnh CV sử dụng tỷ lệ 3:4
		MaxWidth:    600,                  // Phù hợp cho hiển thị CV
		MaxHeight:   800,                  // 600 * 4/3 = 800
		Quality:     90,                   // Chất lượng cao cho ảnh chuyên nghiệp
	}

	// Lấy kích thước ảnh gốc
	originalWidth, originalHeight, err := utils.GetImageDimensions(fileHeader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to get image dimensions",
		})
		return
	}

	// Xử lý ảnh
	processedImageData, err := utils.ProcessImage(fileHeader, options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Failed to process image: %v", err),
		})
		return
	}

	// Tạo Digital Ocean Spaces client
	spacesClient, err := utils.NewSpacesClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to initialize storage client",
		})
		return
	}

	// Upload ảnh đã xử lý lên Digital Ocean Spaces trong thư mục cv-photos
	imageURL, err := spacesClient.UploadFile(fileHeader, processedImageData, "cv-photos")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Failed to upload image: %v", err),
		})
		return
	}

	// Tính toán kích thước cuối cùng
	finalWidth, finalHeight := calculateFinalDimensions(originalWidth, originalHeight, options)

	// Trả về response thành công
	response := UploadImageResponse{
		URL:          imageURL,
		OriginalName: fileHeader.Filename,
		Size:         int64(len(processedImageData)),
		Width:        finalWidth,
		Height:       finalHeight,
		AspectRatio:  "3:4",
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"data":    response,
		"message": "CV photo uploaded successfully",
	})
}

// calculateFinalDimensions calculates the final dimensions after processing for 3:4 ratio
func calculateFinalDimensions(originalWidth, originalHeight int, options *utils.ImageProcessingOptions) (int, int) {
	// Ảnh CV luôn sử dụng tỷ lệ 3:4
	targetRatio := 3.0 / 4.0

	// Tính toán tỷ lệ hiện tại
	currentRatio := float64(originalWidth) / float64(originalHeight)

	var newWidth, newHeight int

	if currentRatio > targetRatio {
		// Ảnh quá rộng, cắt chiều rộng
		newHeight = originalHeight
		newWidth = int(float64(newHeight) * targetRatio)
	} else {
		// Ảnh quá cao, cắt chiều cao
		newWidth = originalWidth
		newHeight = int(float64(newWidth) / targetRatio)
	}

	// Áp dụng giới hạn tối đa (600x800 cho ảnh CV)
	finalWidth := newWidth
	finalHeight := newHeight

	if newWidth > 600 {
		finalWidth = 600
		finalHeight = 800
	}

	if finalHeight > 800 {
		finalHeight = 800
		finalWidth = 600
	}

	return finalWidth, finalHeight
}

// UploadPDF handles PDF file upload to Digital Ocean Spaces
func UploadPDF(c *gin.Context) {
	// Phân tích multipart form với giới hạn bộ nhớ lớn hơn cho PDF
	err := c.Request.ParseMultipartForm(25 << 20) // 25MB bộ nhớ tối đa
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Failed to parse multipart form",
		})
		return
	}

	// Lấy file được upload
	fileHeader, err := c.FormFile("pdf")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No PDF file provided. Use 'pdf' field name.",
		})
		return
	}

	// Xác thực file PDF
	if err := utils.ValidatePDFFile(fileHeader); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Invalid PDF file: %v", err),
		})
		return
	}

	// Đọc dữ liệu file
	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to open uploaded file",
		})
		return
	}
	defer file.Close()

	// Đọc nội dung file vào bộ nhớ
	fileData := make([]byte, fileHeader.Size)
	_, err = file.Read(fileData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to read file content",
		})
		return
	}

	// Tạo Digital Ocean Spaces client
	spacesClient, err := utils.NewSpacesClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to initialize storage client",
		})
		return
	}

	// Upload PDF lên Digital Ocean Spaces trong thư mục cv-documents
	pdfURL, err := spacesClient.UploadFile(fileHeader, fileData, "cv-documents")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Failed to upload PDF: %v", err),
		})
		return
	}

	// Trả về response thành công
	response := UploadPDFResponse{
		URL:          pdfURL,
		OriginalName: fileHeader.Filename,
		Size:         fileHeader.Size,
		ContentType:  "application/pdf",
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}
