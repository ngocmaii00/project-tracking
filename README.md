# 🚀 PM Intelligence Platform

> **Nền tảng quản lý dự án thông minh thế hệ mới** — được xây dựng trên hệ sinh thái Microsoft Azure, tích hợp AI đa tầng, phân tích dữ liệu real-time bằng Power BI, tự động hoá quy trình với Power Automate, và tìm kiếm ngữ nghĩa qua Azure AI Search.

[![Azure](https://img.shields.io/badge/Azure-Cloud-0078D4?logo=microsoftazure)](https://azure.microsoft.com)
[![Power BI](https://img.shields.io/badge/Power%20BI-Embedded-F2C811?logo=powerbi)](https://powerbi.microsoft.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Azure-336791?logo=postgresql)](https://azure.microsoft.com/products/postgresql)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react)](https://reactjs.org)

---

## 📖 Giới thiệu

**PM Intelligence Platform** là giải pháp quản lý dự án cấp doanh nghiệp (Enterprise-grade), được thiết kế để tối ưu hoá hiệu suất làm việc thông qua trí tuệ nhân tạo và phân tích dữ liệu chuyên sâu. Hệ thống không chỉ lưu trữ dữ liệu mà còn chủ động phân tích rủi ro, dự báo tiến độ và hỗ trợ ra quyết định cho cấp quản lý.

### 🌟 Điểm nhấn công nghệ
- **AI-First Approach:** Sử dụng Azure AI Foundry và Microsoft Agent Framework để điều phối 10+ AI Agents chuyên biệt.
- **Real-time Synchronization:** WebSocket cho thông báo và cập nhật dữ liệu tức thời.
- **Deep Analytics:** Nhúng trực tiếp Power BI vào ứng dụng với Row-Level Security (RLS).
- **Hybrid Search:** Kết hợp Full-text, Semantic và Vector Search thông qua Azure AI Search.

---

## ✨ Tính năng cốt lõi

### 🤖 Hệ thống AI Agents (Multi-Agent System)
Hệ thống sử dụng **Microsoft Agent Framework** để điều phối các tác vụ thông minh:
- **Extraction Agent:** Tự động tạo task từ biên bản họp hoặc transcript video.
- **Risk Analysis Agent:** Đánh giá rủi ro dựa trên tiến độ, tài nguyên và ngân sách.
- **Simulation Agent (What-if):** Mô phỏng kịch bản thay đổi nhân sự hoặc deadline.
- **Predictive Timeline:** Dự báo ngày hoàn thành theo 3 kịch bản (Lạc quan, Thực tế, Bi quan).

### 📊 Phân tích & Dashboard (Power BI)
- **Project Health:** Theo dõi chỉ số sức khoẻ dự án, điểm rủi ro real-time.
- **Resource Utilization:** Biểu đồ phân bổ nguồn lực, cảnh báo quá tải.
- **Velocity Tracking:** Đo lường tốc độ hoàn thành công việc của đội ngũ.

### ⚡ Tự động hoá (Power Automate)
- **Daily Scans:** Tự động quét rủi ro vào 8:00 mỗi sáng.
- **Smart Notifications:** Nhắc nhở deadline qua Email/Teams dựa trên mức độ ưu tiên.
- **GitHub Sync:** Tự động đóng task khi Pull Request được merge.

---

## 🛠️ Hướng dẫn cài đặt

### 1. Chuẩn bị môi trường
- Node.js v18+ & npm v9+
- PostgreSQL v14+ (Hoặc Azure Database for PostgreSQL)
- Tài khoản Azure (AI Foundry, Cosmos DB, Blob Storage, AI Search)

### 2. Cấu hình biến môi trường
Tạo file `.env` trong thư mục `backend/`:
```env
PORT=3001
PG_HOST=your_host
PG_USER=your_user
PG_PASSWORD=your_password
PG_DATABASE=cwb-project
PG_SSL=true

AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_KEY=...
COSMOS_ENDPOINT=...
COSMOS_KEY=...
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_SEARCH_ENDPOINT=...
AZURE_SEARCH_KEY=...

# Power BI Credentials
PBI_WORKSPACE_ID=...
PBI_REPORT_ID=...
PBI_TENANT_ID=...
PBI_CLIENT_ID=...
PBI_CLIENT_SECRET=...
```

### 3. Chạy ứng dụng
```bash
# Cài đặt
npm install
cd frontend && npm install
cd ../backend && npm install

# Khởi chạy Backend
cd backend && npm start

# Khởi chạy Frontend
cd frontend && npm run dev
```

---

## 📊 Hướng dẫn kết nối Power BI với Data hiện tại

Hệ thống đã được thiết kế sẵn các **Database Views** tối ưu cho việc làm báo cáo. Để kết nối Power BI với dữ liệu PostgreSQL hiện tại, hãy làm theo các bước sau:

### Bước 1: Kết nối Data Source
1. Mở **Power BI Desktop**.
2. Chọn **Get Data** > **PostgreSQL database**.
3. Nhập thông tin Server, Database từ file `.env` của bạn.
4. Ở phần **Data Connectivity mode**, chọn **Import** hoặc **DirectQuery** (Khuyên dùng DirectQuery để dữ liệu real-time).

### Bước 2: Sử dụng các View có sẵn
Thay vì chọn các bảng thô, hãy chọn các **Views** sau để có dữ liệu đã được xử lý logic:
- `pbi_project_health`: Chứa thông tin tổng quan dự án, điểm rủi ro, tỉ lệ hoàn thành và tên PM.
- `pbi_task_velocity`: Chứa chi tiết task, phân loại trạng thái (Overdue, Blocked, On Track) và thông tin người thực hiện.

### Bước 3: Cấu hình Embed lên Web
1. Publish báo cáo lên **Power BI Service (Workspaces)**.
2. Lấy **Workspace ID** và **Report ID**.
3. Cập nhật các ID này vào file `.env` của Backend.
4. Ứng dụng sẽ tự động sinh **Embed Token** thông qua API `/api/powerbi/embed-token` để hiển thị biểu đồ trong trang Dashboard và Project Detail.

---

## 🏗️ Kiến trúc hệ thống
Hệ thống sử dụng kiến trúc **Micro-services ready** với:
- **Frontend:** React + Zustand + Lucide Icons.
- **Backend:** Node.js Express + WebSocket (ws).
- **Database:** PostgreSQL (Relational) & Cosmos DB (Document/Event Log).
- **Storage:** Azure Blob Storage cho Transcript & Document.

---

## 📞 Liên hệ & Đóng góp
Nếu bạn gặp vấn đề trong quá trình triển khai, vui lòng tạo **Issue** hoặc liên hệ đội ngũ phát triển.

---
*© 2026 CWB Intelligence Platform. Build with 💙 on Azure.*
