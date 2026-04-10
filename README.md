# 🚀 CWB Project Intelligence Platform

> **Nền tảng quản lý dự án thông minh thế hệ mới** — được xây dựng trên hệ sinh thái Microsoft Azure, tích hợp AI đa tầng, phân tích dữ liệu real-time bằng Power BI, tự động hoá quy trình với Power Automate, và tìm kiếm ngữ nghĩa qua Azure AI Search.

[![Azure](https://img.shields.io/badge/Azure-Cloud-0078D4?logo=microsoftazure)](https://azure.microsoft.com)
[![Power BI](https://img.shields.io/badge/Power%20BI-Embedded-F2C811?logo=powerbi)](https://powerbi.microsoft.com)
[![GitHub Actions](https://img.shields.io/badge/GitHub-Actions%20CI%2FCD-181717?logo=github)](https://github.com/features/actions)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Azure-336791?logo=postgresql)](https://azure.microsoft.com/products/postgresql)

---

## 📖 Giới thiệu dự án

**CWB Project Intelligence Platform** là ứng dụng web full-stack quản lý dự án phần mềm cấp doanh nghiệp, được xây dựng toàn bộ trên **Microsoft Azure ecosystem**. Nền tảng này kết hợp:

- 🤖 **AI đa tầng** với Azure AI Foundry + Microsoft Agent Framework để tự động phân tích rủi ro, trích xuất task từ ngôn ngữ tự nhiên, và hỗ trợ quyết định cho Project Manager
- 📊 **Phân tích kinh doanh** nhúng trực tiếp từ Power BI — biểu đồ tiến độ, health score, resource utilization
- ⚡ **Tự động hoá quy trình** với Power Automate — cảnh báo rủi ro, thông báo deadline, tạo báo cáo tự động
- 🔍 **Tìm kiếm ngữ nghĩa** qua Azure AI Search để tìm task, cuộc họp, quyết định từ hàng nghìn bản ghi
- ☁️ **Hạ tầng đám mây Azure** đảm bảo khả năng mở rộng, bảo mật enterprise, và độ sẵn sàng cao

---

## ✨ Tính năng chính

### 🤖 AI Intelligence — Powered by Azure AI Foundry + Microsoft Agent Framework

| Agent | Công nghệ | Mô tả |
|-------|-----------|-------|
| **Extraction Agent** | Azure AI Foundry / GPT-4o | Trích xuất tác vụ từ biên bản họp, email, yêu cầu kỹ thuật bằng ngôn ngữ tự nhiên |
| **Risk Analysis Agent** | Microsoft Agent Framework | Phân tích rủi ro toàn dự án theo schedule, resource, scope, technical |
| **Simulation Agent** | Azure AI Foundry | Mô phỏng "what-if": ảnh hưởng khi thêm/bớt người, thay đổi deadline |
| **Critical Path Agent** | Microsoft Agent Framework | Tính toán critical path, phát hiện bottleneck và task gây tắc nghẽn |
| **Resource Optimizer** | Azure AI Foundry | Gợi ý phân công lại task khi phát hiện thành viên quá tải |
| **Standup Generator** | Azure AI Foundry | Tự động tạo agenda họp standup mỗi ngày |
| **Behavioral Insight Agent** | Microsoft Agent Framework | Phân tích pattern làm việc, dự đoán delay của từng thành viên |
| **Timeline Predictor** | Azure AI Foundry | Dự đoán ngày hoàn thành (optimistic / realistic / pessimistic) |
| **Change Detection Agent** | Microsoft Agent Framework | So sánh với baseline, tóm tắt "What changed this week" |
| **AI Assistant (Chat)** | Azure AI Foundry + Cosmos DB | Hỏi đáp hội thoại thông minh, lưu lịch sử chat vào Cosmos DB |

### 📊 Dashboard & Báo cáo — Power BI Embedded

- **Project Overview Dashboard** — KPI theo dõi: health score, tiến độ, số task theo trạng thái
- **Risk Heatmap Report** — Ma trận xác suất × tác động, drill-down theo category
- **Resource Utilization** — Workload từng thành viên theo tuần/tháng
- **Velocity Tracking** — Tốc độ hoàn thành task theo sprint
- **Burndown Chart** — Theo dõi effort còn lại vs. planned
- **AI Insight Panel** — Tổng hợp phát hiện từ các AI agent trong 24h

> Tất cả biểu đồ được nhúng trực tiếp qua **Power BI Embedded SDK**, cho phép người dùng tương tác, lọc, drill-down mà không rời khỏi ứng dụng.

### ⚡ Tự động hoá — Power Automate

| Flow | Trigger | Hành động |
|------|---------|-----------|
| **Daily Risk Scan** | Lịch (8:00 AM mỗi ngày) | Chạy Risk Analysis Agent → lưu kết quả → gửi email/Teams nếu rủi ro cao |
| **Deadline Reminder** | 24h/48h trước due date | Gửi thông báo tới owner task qua email + Teams |
| **New Task Notification** | Task được tạo từ AI Extract | Gửi tóm tắt tới project channel trên Microsoft Teams |
| **Blocked Task Escalation** | Task chuyển sang "blocked" | Tự động escalate lên PM → tạo notification khẩn |
| **Weekly Report** | Thứ 6 hàng tuần 17:00 | Tổng hợp tiến độ tuần → xuất PDF → gửi cho stakeholder |
| **GitHub PR Sync** | PR merged trên GitHub | Cập nhật trạng thái task liên quan → log audit trail |

### 🔍 Tìm kiếm thông minh — Azure AI Search

- **Full-text search** trên toàn bộ dữ liệu: task, meeting, audit log, comment
- **Semantic search** — hiểu ngữ nghĩa câu hỏi, không cần khớp chính xác keyword
- **Vector search** — tìm kiếm theo embedding, phù hợp truy vấn ngôn ngữ tự nhiên kiểu "task liên quan tới authentication"
- **Faceted filtering** — lọc theo project, priority, owner, date range, status
- **Search Analytics** — theo dõi query phổ biến để cải thiện UX

### 📁 Quản lý dự án (Core PM Features)

- **Dashboard** — Tổng quan toàn bộ danh mục dự án
- **Kanban Board** — Drag & drop task, swimlanes theo priority
- **Gantt Chart** — Timeline trực quan, baseline vs. actual
- **Project Detail** — Task management, members, tags, dependencies
- **Risk Register** — Quản lý rủi ro với mitigation plan
- **Resource Management** — Theo dõi và cân bằng workload
- **Meeting Hub** — Lưu trữ biên bản họp, action items, upload transcript
- **Audit Trail** — Lịch sử thay đổi toàn dự án, AI reasoning, traceability

### 🔐 Bảo mật & Phân quyền

- Xác thực via **Azure Active Directory (Entra ID)** — SSO cho enterprise
- JWT stateless token với refresh mechanism
- Role-based access: `admin`, `project_manager`, `contributor`
- Azure-managed secrets và environment variables

---

## 🛠️ Tech Stack

### ☁️ Microsoft Azure Platform

| Dịch vụ | Mục đích trong dự án |
|---------|----------------------|
| **Azure AI Foundry** | Trung tâm quản lý và triển khai các AI model (GPT-4o, GPT-4o-mini). Build, test, deploy AI agents. Thay thế việc gọi trực tiếp OpenAI API |
| **Microsoft Agent Framework** | Orchestration framework điều phối các AI agent (Risk, Simulation, Critical Path, Behavioral). Quản lý multi-agent workflow, memory, và tool-calling |
| **Azure Database for PostgreSQL** | Cơ sở dữ liệu chính (Flexible Server). Lưu trữ: users, projects, tasks, risks, meetings. Hỗ trợ pgvector cho vector similarity search |
| **Azure Cosmos DB** | NoSQL database cho dữ liệu phi cấu trúc: lịch sử chat AI, audit events, notification logs, session data. Tự động scale, multi-region |
| **Azure AI Search** | Search engine ngữ nghĩa trên toàn bộ dữ liệu dự án. Hỗ trợ full-text, semantic, và vector search. Index tự động từ PostgreSQL và Cosmos DB |
| **Azure Blob Storage** | Lưu trữ file uploads: biên bản họp, tài liệu dự án, transcript audio, file đính kèm. Kết hợp với SAS token bảo mật |
| **Power BI Embedded** | Nhúng báo cáo kinh doanh tương tác vào ứng dụng. Dashboard KPI, velocity chart, risk heatmap. Token-based row-level security |
| **Power Automate** | Tự động hoá quy trình: cảnh báo rủi ro, nhắc deadline, đồng bộ GitHub, gửi báo cáo tuần |

### 🖥️ Frontend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **React** | 19 | UI framework, component-based SPA |
| **Vite** | 6 | Build tool siêu nhanh, Hot Module Replacement |
| **React Router DOM** | 7 | Client-side routing, protected routes |
| **Zustand** | 5 | Global state management (nhẹ hơn Redux) |
| **Axios** | 1.x | HTTP client, gọi REST API backend |
| **Power BI Client SDK** | latest | Nhúng báo cáo Power BI Embedded |
| **@dnd-kit** | core/sortable | Drag & drop cho Kanban board |
| **date-fns** | 4.x | Xử lý và format ngày tháng |
| **lucide-react** | 1.x | Icon library |
| **react-hot-toast** | 2.x | Toast notifications |
| **Vanilla CSS** | — | Custom design system: dark mode, glassmorphism, animations |

### ⚙️ Backend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **Node.js** | 18+ | Runtime |
| **Express.js** | 5 | REST API framework |
| **@azure/openai** | latest | Gọi Azure AI Foundry (GPT-4o) thay vì OpenAI trực tiếp |
| **@azure/search-documents** | latest | SDK tích hợp Azure AI Search |
| **@azure/storage-blob** | latest | SDK upload/download file Azure Blob |
| **@azure/cosmos** | latest | SDK tích hợp Azure Cosmos DB |
| **pg / node-postgres** | 8.x | Kết nối Azure Database for PostgreSQL |
| **ws** | 8.x | WebSocket server cho real-time notifications |
| **JSON Web Token** | 9.x | Xác thực stateless |
| **bcryptjs** | 3.x | Hash mật khẩu |
| **morgan** | 1.x | HTTP request logging |
| **express-validator** | 7.x | Validate API input |
| **dotenv** | 17.x | Quản lý biến môi trường |
| **uuid** | 9.x | Tạo ID duy nhất |

### 🔄 CI/CD & Source Control

| Công nghệ | Mục đích |
|-----------|----------|
| **GitHub** | Source control, code review, pull request workflow |
| **GitHub Actions** | CI/CD pipeline: test → build → deploy lên Azure |
| **GitHub Environments** | Quản lý secrets và approval gate cho staging/production |
| **Power Automate → GitHub** | Tự động cập nhật task status khi PR được merge |

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│  Pages: Dashboard, Kanban, Gantt, AI Chat, Simulation, ...      │
│  Power BI Embedded SDK  │  Zustand Store  │  WebSocket Client   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST API / WebSocket
┌───────────────────────────────▼─────────────────────────────────┐
│                    BACKEND (Node.js + Express)                   │
│  Routes: /auth /projects /tasks /ai /meetings /notifications    │
│  Middleware: JWT Auth │ Validator │ Morgan Logger               │
│  WebSocket Server (real-time push)                              │
└──────┬──────────┬──────────┬──────────┬──────────┬─────────────┘
       │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼
 ┌──────────┐ ┌────────┐ ┌───────┐ ┌────────┐ ┌──────────────┐
 │Azure DB  │ │Cosmos  │ │Azure  │ │Azure   │ │Azure AI      │
 │PostgreSQL│ │  DB    │ │Blob   │ │AI      │ │Foundry +     │
 │(projects │ │(chat   │ │Storage│ │Search  │ │Agent         │
 │tasks,    │ │history,│ │(files,│ │(full-  │ │Framework     │
 │users,    │ │audit,  │ │docs,  │ │text +  │ │(10 AI agents)│
 │risks)    │ │notifs) │ │media) │ │vector) │ └──────────────┘
 └──────────┘ └────────┘ └───────┘ └────────┘
       │
       ▼
 ┌─────────────────────────────────────────────┐
 │           POWER PLATFORM                    │
 │  Power BI Embedded (dashboard reports)      │
 │  Power Automate (workflow automation)       │
 └─────────────────────────────────────────────┘
       │
       ▼
 ┌─────────────────────────────────────────────┐
 │         GITHUB + GITHUB ACTIONS             │
 │  Source control → CI/CD → Azure Deploy      │
 └─────────────────────────────────────────────┘
```

### Luồng AI Agent (Microsoft Agent Framework)

```
User Request (chat / extract / simulate)
            │
            ▼
    Agent Orchestrator
    (Microsoft Agent Framework)
            │
     ┌──────┼──────────────────────┐
     ▼      ▼                      ▼
Risk     Extraction           Simulation
Agent    Agent                Agent
  │          │                    │
  └──────────┴─────┬──────────────┘
                   ▼
         Azure AI Foundry (GPT-4o)
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
   PostgreSQL              Cosmos DB
   (lưu kết quả)          (lưu lịch sử)
                   │
                   ▼
         WebSocket → Client (real-time)
```

### Luồng Upload & Search

```
User Upload Meeting Transcript
            │
            ▼
      Azure Blob Storage
      (lưu file gốc)
            │
            ▼
   Azure AI Foundry Extraction
   (trích xuất task từ nội dung)
            │
            ▼
    Azure AI Search Indexer
    (index nội dung để search)
            │
            ▼
  User tìm kiếm: "ai authentication task"
            │
            ▼
   Azure AI Search (semantic)
   → trả về kết quả liên quan nhất
```

---

## 🚀 Hướng dẫn cài đặt & chạy

### Yêu cầu
- Node.js >= 18
- npm >= 9
- Azure Subscription (Free tier đủ để demo)
- GitHub account

### 1. Clone repository

```bash
git clone https://github.com/your-org/cwb-project-tracking.git
cd cwb-project-tracking
```

### 2. Cài đặt dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### 3. Cấu hình Azure resources

Tạo các resource trên Azure Portal hoặc dùng Azure CLI:

```bash
# Resource Group
az group create --name cwb-project-rg --location southeastasia

# PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group cwb-project-rg \
  --name cwb-postgres \
  --database-name cwbdb \
  --admin-user cwbadmin \
  --admin-password <your-password>

# Cosmos DB (NoSQL)
az cosmosdb create \
  --name cwb-cosmos \
  --resource-group cwb-project-rg \
  --default-consistency-level Session

# Storage Account
az storage account create \
  --name cwbstorage \
  --resource-group cwb-project-rg \
  --sku Standard_LRS

# Azure AI Search
az search service create \
  --name cwb-ai-search \
  --resource-group cwb-project-rg \
  --sku basic
```

### 4. Cấu hình biến môi trường

**`backend/.env`**
```env
PORT=3001
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Azure PostgreSQL
PG_HOST=cwb-postgres.postgres.database.azure.com
PG_PORT=5432
PG_DATABASE=cwbdb
PG_USER=cwbadmin
PG_PASSWORD=your_postgres_password
PG_SSL=true

# Azure AI Foundry
AZURE_OPENAI_ENDPOINT=https://your-foundry.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-10-21

# Azure Cosmos DB
COSMOS_ENDPOINT=https://cwb-cosmos.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=cwb_intelligence

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https...
AZURE_STORAGE_CONTAINER=project-files
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account
AZURE_STORAGE_ACCOUNT_KEY=your_storage_key

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://cwb-ai-search.search.windows.net
AZURE_SEARCH_API_KEY=your_search_api_key
AZURE_SEARCH_INDEX=cwb-projects-index

# Power BI Embedded
POWERBI_CLIENT_ID=your_app_client_id
POWERBI_CLIENT_SECRET=your_app_client_secret
POWERBI_TENANT_ID=your_tenant_id
POWERBI_WORKSPACE_ID=your_workspace_id
POWERBI_REPORT_ID=your_default_report_id

# Power Automate Webhooks & GitHub
POWER_AUTOMATE_SECRET=your_shared_webhook_secret
GITHUB_TOKEN=ghp_your_github_token
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_POWERBI_EMBED_URL=https://app.powerbi.com/reportEmbed
```

### 5. Khởi động

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### 6. Seed dữ liệu demo

```bash
curl -X POST http://localhost:3001/api/seed
```

**Tài khoản demo:**
| Email | Password | Role |
|-------|----------|------|
| `admin@cwb.com` | `password123` | Admin |
| `pm@cwb.com` | `password123` | Project Manager |
| `dev1@cwb.com` | `password123` | Contributor |

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/auth/login` | Đăng nhập, nhận JWT |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Huỷ session |

### Projects & Tasks
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/projects` | Danh sách dự án |
| `POST` | `/api/projects` | Tạo dự án mới |
| `GET` | `/api/projects/:id` | Chi tiết dự án |
| `PATCH` | `/api/projects/:id` | Cập nhật dự án |
| `GET` | `/api/tasks` | Danh sách task |
| `POST` | `/api/tasks` | Tạo task |
| `PATCH` | `/api/tasks/:id` | Cập nhật task |

### AI Endpoints (Azure AI Foundry + Agent Framework)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/ai/extract` | Trích xuất task từ text (AI Foundry) |
| `POST` | `/api/ai/chat` | AI assistant hội thoại |
| `POST` | `/api/ai/simulate` | What-if simulation |
| `GET` | `/api/ai/risk-analysis/:id` | Phân tích rủi ro dự án |
| `GET` | `/api/ai/critical-path/:id` | Critical path analysis |
| `GET` | `/api/ai/resources/:id` | Resource optimization |
| `GET` | `/api/ai/timeline/:id` | Timeline prediction |
| `GET` | `/api/ai/standup/:id` | Generate standup agenda |

### Search (Azure AI Search)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/search?q=<query>` | Semantic search toàn hệ thống |
| `GET` | `/api/search/tasks?q=<query>` | Tìm trong tasks |
| `GET` | `/api/search/meetings?q=<query>` | Tìm trong biên bản họp |

### Files (Azure Blob Storage)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/files/upload` | Upload file lên Azure Blob |
| `GET` | `/api/files/:id` | Lấy SAS URL để download |
| `DELETE` | `/api/files/:id` | Xoá file |

### Real-time
| Protocol | Endpoint | Mô tả |
|----------|----------|-------|
| `WebSocket` | `ws://localhost:3001/ws?userId=<id>` | Kết nối nhận push notification |

### Power BI
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/powerbi/embed-token` | Lấy embed token cho Power BI Embedded |

---

## 🔄 CI/CD với GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: CWB Platform — CI/CD to Azure

on:
  push:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install & Build
        run: cd frontend && npm ci && npm run build && cd ../backend && npm ci

  deploy-frontend:
    needs: lint-and-build
    runs-on: ubuntu-latest
    steps:
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_TOKEN }}
          app_location: /frontend
          output_location: dist

  deploy-backend:
    needs: lint-and-build
    runs-on: ubuntu-latest
    steps:
      - uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: backend

  notify-power-automate:
    needs: [deploy-frontend, deploy-backend]
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Power Automate Flow
        run: curl -X POST "${{ secrets.POWER_AUTOMATE_WEBHOOK_URL }}" -d '{"event":"deploy_success"}'
```

**Power Automate → GitHub trigger:** Mỗi khi pull request được merge trên GitHub, Power Automate flow tự động cập nhật trạng thái các task liên quan trong hệ thống.

---

## 📊 Cấu trúc Database

### Azure Database for PostgreSQL (Relational)

```sql
-- Dữ liệu chính, quan hệ rõ ràng
users           -- id, email, password_hash, name, role, azure_oid
projects        -- id, name, description, status, start_date, end_date, risk_score
tasks           -- id, project_id, title, status, priority, owner_id, due_date, dependencies
risks           -- id, project_id, title, category, probability, impact, mitigation
meetings        -- id, project_id, title, date, transcript_blob_url, summary
notifications   -- id, user_id, type, title, message, priority, read_at
```

### Azure Cosmos DB (NoSQL — Document Store)

```json
// Container: chat_history
{
  "id": "uuid",
  "userId": "u1",
  "projectId": "p1",
  "messages": [
    { "role": "user", "content": "...", "timestamp": "..." },
    { "role": "assistant", "content": "...", "confidence": 0.9 }
  ],
  "ttl": 2592000
}

// Container: audit_events
{
  "id": "uuid",
  "projectId": "p1",
  "entityType": "task",
  "entityId": "t5",
  "changeType": "status_change",
  "oldValue": "in_progress",
  "newValue": "done",
  "aiReasoning": "...",
  "actor": "u2",
  "timestamp": "2026-04-09T14:30:00Z"
}
```

### Azure Blob Storage (Files)

```
cwb-storage/
  project-files/
    {projectId}/
      meetings/         ← transcript audio, PDF biên bản
      documents/        ← spec, design doc, requirement
      attachments/      ← file đính kèm task
  exports/
    reports/            ← báo cáo PDF từ Power Automate
```

### Azure AI Search Index Schema

```json
{
  "name": "cwb-projects-index",
  "fields": [
    { "name": "id", "type": "Edm.String", "key": true },
    { "name": "type", "type": "Edm.String" },
    { "name": "title", "type": "Edm.String", "searchable": true },
    { "name": "content", "type": "Edm.String", "searchable": true },
    { "name": "projectId", "type": "Edm.String", "filterable": true },
    { "name": "embedding", "type": "Collection(Edm.Single)", "dimensions": 1536, "vectorSearchProfile": "hnsw-profile" }
  ],
  "semanticSearch": { "configurations": [{ "name": "semantic-config" }] }
}
```

---

## 🎨 Thiết kế UI

- **Color system**: Deep navy dark mode (`#0a1628` → `#141e35`)
- **Glassmorphism**: backdrop-filter blur, transparent panels với subtle borders
- **Micro-animations**: hover effects, skeleton loading, transition mượt
- **Typography**: Inter (Google Fonts)
- **Power BI reports** nhúng seamlessly vào layout với custom theme matching dark mode

---

## 🗺️ Roadmap

- [ ] Tích hợp **Azure Active Directory** SSO hoàn chỉnh
- [ ] **Microsoft Teams bot** từ Agent Framework
- [ ] **Power Automate approval workflow** cho task có priority critical
- [ ] **Azure AI Search** vector search với pgvector hybrid
- [ ] **Multi-project Portfolio View** trong Power BI
- [ ] **Mobile app** với React Native + Azure backend

---

## 📝 License

MIT License — © 2026 CWB Team

---

## 🤝 Contributing

1. Fork repository trên **GitHub**
2. Tạo feature branch: `git checkout -b feature/ai-risk-v2`
3. Commit changes: `git commit -m 'feat: add behavioral pattern detection'`
4. Push và tạo Pull Request
5. CI/CD tự động chạy lint + build qua **GitHub Actions**
6. Merge → **Power Automate** tự động notify team và cập nhật task tracker
