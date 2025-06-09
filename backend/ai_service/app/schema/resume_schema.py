from typing import Optional, List
from pydantic import BaseModel, Field


class CVEducationRequest(BaseModel):
    """Schema cho dữ liệu học vấn phù hợp với struct CVEducationRequest"""
    organization: str = Field(description="Tên trường học hoặc tổ chức giáo dục (bắt buộc)")
    degree: Optional[str] = Field(default=None, description="Loại bằng cấp (ví dụ: Cử nhân, Thạc sĩ, Tiến sĩ)")
    major: Optional[str] = Field(default=None, description="Chuyên ngành học")
    graduation_year: Optional[int] = Field(default=None, description="Năm tốt nghiệp")


class CVCourseRequest(BaseModel):
    """Schema cho dữ liệu khóa học phù hợp với struct CVCourseRequest"""
    course_name: str = Field(description="Tên khóa học (bắt buộc)")
    organization: Optional[str] = Field(default="", description="Tổ chức cung cấp khóa học")
    finish_date: Optional[str] = Field(default="", description="Ngày hoàn thành khóa học theo định dạng YYYY-MM-DD")


class CVSkillRequest(BaseModel):
    """Schema cho dữ liệu kỹ năng phù hợp với struct CVSkillRequest"""
    skill_name: str = Field(description="Tên kỹ năng (bắt buộc)")
    description: Optional[str] = Field(default="", description="Mô tả kỹ năng hoặc mức độ thành thạo")


class ResumeSchema(BaseModel):
    """Schema cho dữ liệu CV đã phân tích phù hợp với cấu trúc Go CV request"""
    full_name: str = Field(description="Họ và tên đầy đủ của ứng viên")
    job_title: str = Field(description="Chức danh hoặc vị trí công việc mong muốn, ví dụ như Software Engineer, AI Engineer, Project Manager")
    summary: str = Field(description="Tóm tắt về bản thân, kinh nghiệm và mục tiêu nghề nghiệp")
    birthday: Optional[str] = Field(default="", description="Ngày sinh theo định dạng YYYY-MM-DD")
    gender: Optional[str] = Field(default="", description="Giới tính")
    email: Optional[str] = Field(default="", description="Địa chỉ email")
    phone: Optional[str] = Field(default="", description="Số điện thoại")
    address: Optional[str] = Field(default="", description="Địa chỉ nhà")
    education: List[CVEducationRequest] = Field(default_factory=list, description="Danh sách thông tin học vấn")
    courses: List[CVCourseRequest] = Field(default_factory=list, description="Danh sách khóa học và chứng chỉ")
    skills: List[CVSkillRequest] = Field(default_factory=list, description="Danh sách kỹ năng và năng lực")
