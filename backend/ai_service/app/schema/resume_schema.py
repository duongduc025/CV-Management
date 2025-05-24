from typing import Optional
from pydantic import BaseModel, Field


class ResumeSchema(BaseModel):
    """Schema for parsed resume data matching the CV structure in the database"""
    ho_ten: str = Field(description="Họ và tên đầy đủ của ứng viên")
    chuc_danh: str = Field(description="Chức danh hoặc vị trí công việc mong muốn, ví dụ như Software Engineer, AI Engineer, Project Manager, v.v.")
    tom_tat: str = Field(description="Tóm tắt về bản thân, kinh nghiệm và mục tiêu nghề nghiệp")
    thong_tin_ca_nhan: str = Field(description="Thông tin cá nhân bao gồm ngày sinh, địa chỉ, số điện thoại, email")
    thong_tin_dao_tao: str = Field(description="Thông tin về quá trình đào tạo, học vấn, bằng cấp")
    thong_tin_khoa_hoc: Optional[str] = Field(default="", description="Thông tin về các khóa học, chứng chỉ bổ sung")
    thong_tin_ki_nang: str = Field(description="Thông tin về kỹ năng chuyên môn, kỹ năng mềm, ngôn ngữ lập trình")
