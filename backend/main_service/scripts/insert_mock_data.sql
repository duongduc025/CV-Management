-- Mock data insertion script

-- Insert users
INSERT INTO users (id, employee_code, full_name, email, password, department_id, created_at)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'EMP001', 'Nguyen Van A', 'nguyenvana@vdt.com', '$2a$10$JXcU.UiRfwz4F5ZqZhNFJeoElOVYOFjN2oYpg5Ogb7Z1OsmC2zgBC', '9c6bc29a-1cb9-4018-8397-d318ade4ab64', NOW()),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'EMP002', 'Tran Thi B', 'tranthib@vdt.com', '$2a$10$JXcU.UiRfwz4F5ZqZhNFJeoElOVYOFjN2oYpg5Ogb7Z1OsmC2zgBC', '9c6bc29a-1cb9-4018-8397-d318ade4ab64', NOW()),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'EMP003', 'Le Van C', 'levanc@vdt.com', '$2a$10$JXcU.UiRfwz4F5ZqZhNFJeoElOVYOFjN2oYpg5Ogb7Z1OsmC2zgBC', 'f1648b6b-0a55-4fa5-b28b-4236c0e5266f', NOW()),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d482', 'EMP004', 'Pham Minh D', 'phamminh@vdt.com', '$2a$10$JXcU.UiRfwz4F5ZqZhNFJeoElOVYOFjN2oYpg5Ogb7Z1OsmC2zgBC', 'f1648b6b-0a55-4fa5-b28b-4236c0e5266f', NOW()),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d483', 'EMP005', 'Hoang Thi E', 'hoange@vdt.com', '$2a$10$JXcU.UiRfwz4F5ZqZhNFJeoElOVYOFjN2oYpg5Ogb7Z1OsmC2zgBC', '9c6bc29a-1cb9-4018-8397-d318ade4ab64', NOW());

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'd579db8e-b90c-406b-81e9-21c995808b4f'), -- Employee
  ('f47ac10b-58cc-4372-a567-0e02b2c3d480', '64531b15-45fd-44ad-a9fa-b6063e8651fe'), -- BUL/Lead
  ('f47ac10b-58cc-4372-a567-0e02b2c3d481', '18548070-eeda-427d-8fc5-e4f19244ac21'), -- PM
  ('f47ac10b-58cc-4372-a567-0e02b2c3d482', 'd579db8e-b90c-406b-81e9-21c995808b4f'), -- Employee
  ('f47ac10b-58cc-4372-a567-0e02b2c3d483', 'bd8a31ba-4e82-4990-8a53-4a6cb2d69477'); -- Admin

-- Insert CVs
INSERT INTO cv (id, user_id, last_updated_by, last_updated_at, status)
VALUES
  ('a47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NOW(), 'Đã cập nhật'),
  ('a47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', NOW(), 'Đã cập nhật'),
  ('a47ac10b-58cc-4372-a567-0e02b2c3d481', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', NOW(), 'Đã cập nhật'),
  ('a47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', NULL, NULL, 'Chưa cập nhật'),
  ('a47ac10b-58cc-4372-a567-0e02b2c3d483', 'f47ac10b-58cc-4372-a567-0e02b2c3d483', 'f47ac10b-58cc-4372-a567-0e02b2c3d483', NOW(), 'Đã cập nhật');

-- Insert CV details
INSERT INTO cv_details (id, cv_id, ho_ten, chuc_danh, tom_tat, thong_tin_ca_nhan, thong_tin_dao_tao, thong_tin_khoa_hoc, thong_tin_ki_nang)
VALUES
  ('b47ac10b-58cc-4372-a567-0e02b2c3d479', 'a47ac10b-58cc-4372-a567-0e02b2c3d479', 
   'Nguyễn Văn A', 
   'Kỹ sư phần mềm', 
   'Kỹ sư phần mềm với 5 năm kinh nghiệm phát triển ứng dụng web và mobile. Có kinh nghiệm làm việc với các công nghệ hiện đại và quy trình phát triển Agile.',
   'Email: nguyenvana@vdt.com, SĐT: 0912345678, Ngày sinh: 01/01/1990, Địa chỉ: Hà Nội',
   'Đại học Bách Khoa Hà Nội, Kỹ sư CNTT, 2010-2014; Thạc sĩ CNTT, Đại học Quốc gia Hà Nội, 2015-2017',
   'AWS Certified Developer Associate; Microsoft Certified: Azure Developer Associate; ISTQB Foundation Level',
   'Ngôn ngữ lập trình: Java, Python, JavaScript, TypeScript; Framework: Spring Boot, React, Vue.js; Database: MySQL, PostgreSQL, MongoDB; Tools: Git, Docker, Jenkins'),
   
  ('b47ac10b-58cc-4372-a567-0e02b2c3d480', 'a47ac10b-58cc-4372-a567-0e02b2c3d480', 
   'Trần Thị B', 
   'Team Lead', 
   'Team Lead với 8 năm kinh nghiệm quản lý dự án phần mềm. Có khả năng lãnh đạo và phối hợp hiệu quả giữa các bộ phận để đảm bảo dự án hoàn thành đúng tiến độ.',
   'Email: tranthib@vdt.com, SĐT: 0923456789, Ngày sinh: 15/05/1988, Địa chỉ: Hà Nội',
   'Đại học Công nghệ - Đại học Quốc gia Hà Nội, Kỹ sư CNTT, 2006-2010',
   'PMP Certification; Certified Scrum Master; Agile Leadership',
   'Quản lý dự án: Scrum, Kanban, Waterfall; Công cụ: Jira, Confluence, Trello; Kỹ năng mềm: Lãnh đạo, Giao tiếp, Thuyết trình, Đàm phán; Ngôn ngữ lập trình: Java, C#'),
   
  ('b47ac10b-58cc-4372-a567-0e02b2c3d481', 'a47ac10b-58cc-4372-a567-0e02b2c3d481', 
   'Lê Văn C', 
   'Project Manager', 
   'Project Manager với 10 năm kinh nghiệm quản lý dự án CNTT quy mô lớn. Chuyên môn sâu trong quản lý dự án phần mềm cho lĩnh vực tài chính và ngân hàng.',
   'Email: levanc@vdt.com, SĐT: 0934567890, Ngày sinh: 20/08/1985, Địa chỉ: Hồ Chí Minh',
   'Đại học Kinh tế Thành phố Hồ Chí Minh, Cử nhân Quản trị kinh doanh, 2003-2007; MBA, Đại học Kinh tế TP.HCM, 2010-2012',
   'PMP Certification; PRINCE2 Practitioner; Certified SAFe Agilist',
   'Quản lý dự án: PMP, PRINCE2, Agile, SAFe; Quản lý rủi ro; Quản lý ngân sách; Kỹ năng lãnh đạo và tổ chức; Phân tích kinh doanh'),
   
  ('b47ac10b-58cc-4372-a567-0e02b2c3d483', 'a47ac10b-58cc-4372-a567-0e02b2c3d483', 
   'Hoàng Thị E', 
   'System Administrator', 
   'System Administrator với 7 năm kinh nghiệm quản lý hệ thống CNTT doanh nghiệp. Chuyên môn vận hành và tối ưu hóa hệ thống máy chủ, mạng và bảo mật.',
   'Email: hoange@vdt.com, SĐT: 0956789012, Ngày sinh: 12/12/1992, Địa chỉ: Đà Nẵng',
   'Đại học Đà Nẵng, Kỹ sư Mạng máy tính và Truyền thông, 2010-2014',
   'CCNA; MCSA: Windows Server 2016; CompTIA Security+; Red Hat Certified System Administrator (RHCSA)',
   'Hệ điều hành: Windows Server, Linux (CentOS, Ubuntu); Hạ tầng: VMware, Hyper-V; Mạng: Cisco, Juniper; Cloud: AWS, Azure; Bảo mật: Firewall, IDS/IPS; Monitoring: Nagios, Prometheus, Grafana');

-- Insert CV update requests
INSERT INTO cv_update_requests (id, cv_id, requested_by, requested_at, status)
VALUES
  ('c47ac10b-58cc-4372-a567-0e02b2c3d479', 'a47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', NOW(), 'Đang yêu cầu'),
  ('c47ac10b-58cc-4372-a567-0e02b2c3d480', 'a47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', (NOW() - INTERVAL '2 DAY'), 'Đã xử lý'),
  ('c47ac10b-58cc-4372-a567-0e02b2c3d481', 'a47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', (NOW() - INTERVAL '5 DAY'), 'Đã huỷ');

-- Insert projects
INSERT INTO projects (id, name, start_date, end_date)
VALUES
  ('d47ac10b-58cc-4372-a567-0e02b2c3d479', 'Project Alpha', '2023-01-01', '2023-12-31'),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d480', 'Project Beta', '2023-03-15', '2024-03-14'),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d481', 'Project Gamma', '2023-06-01', '2024-06-30'),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d482', 'Project Delta', '2023-09-15', NULL);

-- Insert project members
INSERT INTO project_members (project_id, user_id, role_in_project, joined_at, left_at)
VALUES
  ('d47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 'Project Manager', '2023-01-01', NULL),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Team Lead', '2023-01-01', NULL),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Developer', '2023-01-01', NULL),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', 'Developer', '2023-01-15', '2023-08-15'),
  
  ('d47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 'Project Manager', '2023-03-15', NULL),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Developer', '2023-03-15', NULL),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', 'QA Engineer', '2023-03-15', NULL),
  
  ('d47ac10b-58cc-4372-a567-0e02b2c3d481', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 'Project Manager', '2023-06-01', NULL),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d481', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Team Lead', '2023-06-01', NULL),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d481', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Developer', '2023-06-01', NULL),
  
  ('d47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 'Project Manager', '2023-09-15', NULL),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d483', 'System Administrator', '2023-09-15', NULL),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Team Lead', '2023-09-15', NULL),
  ('d47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Developer', '2023-09-15', NULL); 