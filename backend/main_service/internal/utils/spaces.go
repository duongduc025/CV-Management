package utils

import (
	"bytes"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/google/uuid"
)

// SpacesConfig holds the configuration for Digital Ocean Spaces
type SpacesConfig struct {
	AccessKey string
	SecretKey string
	Endpoint  string
	Bucket    string
	Region    string
}

// SpacesClient wraps the S3 client for Digital Ocean Spaces
type SpacesClient struct {
	client *s3.S3
	config *SpacesConfig
}

// NewSpacesClient creates a new Digital Ocean Spaces client
func NewSpacesClient() (*SpacesClient, error) {
	config := &SpacesConfig{
		AccessKey: os.Getenv("DO_SPACES_KEY"),
		SecretKey: os.Getenv("DO_SPACES_SECRET"),
		Endpoint:  os.Getenv("DO_SPACES_ENDPOINT"),
		Bucket:    os.Getenv("DO_SPACES_BUCKET"),
		Region:    "sgp1", // Singapore region for Digital Ocean Spaces
	}

	// Validate required environment variables
	if config.AccessKey == "" || config.SecretKey == "" || config.Endpoint == "" || config.Bucket == "" {
		return nil, fmt.Errorf("missing required Digital Ocean Spaces configuration")
	}

	// Create AWS session with Digital Ocean Spaces endpoint
	sess, err := session.NewSession(&aws.Config{
		Credentials: credentials.NewStaticCredentials(config.AccessKey, config.SecretKey, ""),
		Endpoint:    aws.String(config.Endpoint),
		Region:      aws.String(config.Region),
	})

	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return &SpacesClient{
		client: s3.New(sess),
		config: config,
	}, nil
}

// UploadFile uploads a file to Digital Ocean Spaces
func (sc *SpacesClient) UploadFile(fileHeader *multipart.FileHeader, fileData []byte, folder string) (string, error) {
	// Generate unique filename
	filename := generateUniqueFilename(fileHeader.Filename)
	key := filepath.Join(folder, filename)

	// Determine content type
	contentType := getContentType(fileHeader.Filename)

	// Upload to Digital Ocean Spaces
	_, err := sc.client.PutObject(&s3.PutObjectInput{
		Bucket:        aws.String(sc.config.Bucket),
		Key:           aws.String(key),
		Body:          bytes.NewReader(fileData),
		ContentLength: aws.Int64(int64(len(fileData))),
		ContentType:   aws.String(contentType),
		ACL:           aws.String("public-read"), // Make file publicly accessible
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	// Return the public URL
	// For Digital Ocean Spaces, the public URL format is: https://bucket-name.region.digitaloceanspaces.com/key
	publicURL := fmt.Sprintf("https://%s.%s/%s", sc.config.Bucket, strings.TrimPrefix(sc.config.Endpoint, "https://"), key)
	return publicURL, nil
}

// DeleteFile deletes a file from Digital Ocean Spaces
func (sc *SpacesClient) DeleteFile(fileURL string) error {
	// Extract key from URL
	key := extractKeyFromURL(fileURL, sc.config.Endpoint)
	if key == "" {
		return fmt.Errorf("invalid file URL")
	}

	_, err := sc.client.DeleteObject(&s3.DeleteObjectInput{
		Bucket: aws.String(sc.config.Bucket),
		Key:    aws.String(key),
	})

	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}

// generateUniqueFilename creates a unique filename with UUID
func generateUniqueFilename(originalFilename string) string {
	ext := filepath.Ext(originalFilename)
	uniqueID := uuid.New().String()
	return fmt.Sprintf("%s%s", uniqueID, ext)
}

// getContentType determines the content type based on file extension
func getContentType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".pdf":
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}

// extractKeyFromURL extracts the object key from a Digital Ocean Spaces URL
func extractKeyFromURL(fileURL, endpoint string) string {
	// For Digital Ocean Spaces, URLs are in format: https://bucket-name.region.digitaloceanspaces.com/key
	// We need to extract everything after the domain
	if strings.Contains(fileURL, "digitaloceanspaces.com/") {
		parts := strings.Split(fileURL, "digitaloceanspaces.com/")
		if len(parts) == 2 {
			return parts[1]
		}
	}
	return ""
}

// IsValidImageType checks if the file is a valid image type
func IsValidImageType(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	validTypes := []string{".jpg", ".jpeg", ".png", ".gif", ".webp"}

	for _, validType := range validTypes {
		if ext == validType {
			return true
		}
	}
	return false
}

// ValidateFileSize checks if the file size is within limits (max 10MB)
func ValidateFileSize(size int64) error {
	const maxSize = 10 * 1024 * 1024 // 10MB
	if size > maxSize {
		return fmt.Errorf("file size exceeds maximum limit of 10MB")
	}
	return nil
}

// IsValidPDFType checks if the file is a PDF
func IsValidPDFType(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return ext == ".pdf"
}

// ValidatePDFFile validates if the uploaded file is a valid PDF
func ValidatePDFFile(fileHeader *multipart.FileHeader) error {
	// Check file extension
	if !IsValidPDFType(fileHeader.Filename) {
		return fmt.Errorf("invalid file type. Only PDF files are supported")
	}

	// Check file size (max 20MB for PDFs)
	const maxPDFSize = 20 * 1024 * 1024 // 20MB
	if fileHeader.Size > maxPDFSize {
		return fmt.Errorf("PDF file size exceeds maximum limit of 20MB")
	}

	// Basic PDF header validation
	file, err := fileHeader.Open()
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Read first 4 bytes to check PDF signature
	header := make([]byte, 4)
	_, err = file.Read(header)
	if err != nil {
		return fmt.Errorf("failed to read file header: %w", err)
	}

	// PDF files should start with "%PDF"
	if string(header) != "%PDF" {
		return fmt.Errorf("invalid PDF file: missing PDF header")
	}

	return nil
}
