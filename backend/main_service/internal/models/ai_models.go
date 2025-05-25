package models

// ParseCVRequest represents the request to parse a CV file
type ParseCVRequest struct {
	FilePath string `json:"file_path" binding:"required"`
}

// ParseCVResponse represents the response from the AI service
type ParseCVResponse struct {
	Status   string `json:"status"`
	FilePath string `json:"file_path"`
	Data     any    `json:"data"`
}

// AIServiceRequest represents the request sent to the AI service
type AIServiceRequest struct {
	FilePath string `json:"file_path"`
}

// AIServiceResponse represents the response from the AI service
type AIServiceResponse struct {
	Status   string `json:"status"`
	FilePath string `json:"file_path"`
	Data     any    `json:"data"`
}
