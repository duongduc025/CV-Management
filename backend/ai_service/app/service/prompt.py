RESUME_DETAILS_EXTRACTOR = """<objective>
Phân tích hiệu quả một bản CV ở định dạng văn bản thuần (plain text) và trích xuất các dữ liệu đa dạng của ứng viên thành định dạng JSON có cấu trúc.
</objective>

<input>
Đoạn văn sau là bản CV của ứng viên ở dạng văn bản thuần:

{resume_text}
</input>

<instructions>
Thực hiện theo các bước sau để trích xuất và cấu trúc thông tin từ CV:

1. Phân tích cấu trúc:
   - Xem xét bản CV dạng văn bản để xác định các mục chính (ví dụ: thông tin cá nhân, học vấn, kinh nghiệm, kỹ năng, chứng chỉ).
   - Lưu ý bất kỳ định dạng hoặc tổ chức đặc biệt nào trong CV.

2. Trích xuất thông tin:
   - Phân tích từng mục một cách hệ thống, lấy các chi tiết liên quan.
   - Chú ý đến ngày tháng, chức danh, tổ chức, và mô tả công việc.

3. Xử lý các biến thể:
   - Tính đến các kiểu CV khác nhau, định dạng và thứ tự mục khác nhau.
   - Điều chỉnh quy trình trích xuất để nắm bắt dữ liệu chính xác từ nhiều cách trình bày khác nhau.

5. Tối ưu đầu ra:
   - Mỗi trường đầu ra đều là một chuỗi (string).
   - Xử lý các thông tin bị thiếu hoặc không đầy đủ một cách phù hợp (sử dụng giá trị null hoặc mảng/đối tượng rỗng khi cần).
   - Chuẩn hóa định dạng ngày tháng nếu có thể.
   - Thêm ký tự xuống dòng (\n) cho các phần nội dung cần phân tách dòng để đảm bảo dễ đọc.
   - Dịch toàn bộ nội dung sang tiếng Việt, ngoại trừ những phần không cần thiết phải dịch (như tên riêng, thuật ngữ kỹ thuật, từ khóa công nghệ, v.v.).

6. Kiểm tra lại:
   - Xem xét dữ liệu trích xuất để đảm bảo tính nhất quán và đầy đủ.
   - Đảm bảo tất cả các trường bắt buộc được điền nếu thông tin có trong CV.

</instructions>

{format_instructions}"""
