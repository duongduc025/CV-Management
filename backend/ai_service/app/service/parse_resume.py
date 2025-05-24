import os
import sys
import PyPDF2
import re

from dotenv import load_dotenv, find_dotenv
from langchain_openai import AzureChatOpenAI
from langchain.schema import HumanMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain.prompts import PromptTemplate
from .prompt import RESUME_DETAILS_EXTRACTOR

# Add the parent directory to Python path to import schema
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from schema import ResumeSchema


# Load environment variables from .env file
_ = load_dotenv(find_dotenv())

class ResumeParser:
    def __init__(self, resume_file=None):
        # Lấy biến môi trường với tên chuẩn Azure OpenAI
        self.api_key = os.getenv("AZURE_OPENAI_API_KEY")
        self.azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
        self.api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
        self.resume_file = resume_file
        self.llm = self._init_llm()



    def _init_llm(self):
        # Khởi tạo AzureChatOpenAI với thông số từ biến môi trường
        return AzureChatOpenAI(
            azure_endpoint=self.azure_endpoint,
            api_version=self.api_version,
            api_key=self.api_key,
            azure_deployment=self.deployment_name,
        )

    def extract_text(self, pdf_path: str):
        """
        Đọc nội dung text từ file PDF, trả về toàn bộ text dưới dạng chuỗi.
        """
        resume_text = ""

        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            num_pages = len(pdf_reader.pages)

            for page_num in range(num_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text().split("\n")

                # Loại bỏ các ký tự Unicode không phải ASCII
                cleaned_text = [re.sub(r'[^\x00-\x7F]+', '', line) for line in text]

                # Ghép lại thành chuỗi
                cleaned_text_string = '\n'.join(cleaned_text)
                resume_text += cleaned_text_string

        return resume_text

    def resume_to_json(self, pdf_path):
        """
        Chuyển CV dạng PDF thành JSON (dữ liệu cấu trúc) bằng cách:
         - đọc text từ PDF,
         - gọi LLM để phân tích trích xuất thông tin CV ra dạng JSON.

        Args:
            pdf_path (str): Đường dẫn file PDF CV.

        Returns:
            dict: CV đã được chuyển thành JSON.
        """
        resume_text = self.extract_text(pdf_path)

        # Khởi tạo parser JSON dựa trên schema ResumeSchema (định nghĩa cấu trúc CV)
        json_parser = JsonOutputParser(pydantic_object=ResumeSchema)

        # Tạo prompt cho LLM
        prompt = PromptTemplate(
            template=RESUME_DETAILS_EXTRACTOR,
            input_variables=["resume_text"],
            partial_variables={"format_instructions": json_parser.get_format_instructions()}
        )

        # Format prompt với resume text
        formatted_prompt = prompt.format(resume_text=resume_text)

        # Gọi LLM để phân tích CV
        response = self.llm.invoke([HumanMessage(content=formatted_prompt)])

        # Parse response thành JSON
        parsed_result = json_parser.parse(response.content)

        return parsed_result
