# CWB Project Intelligence Platform

Ứng dụng quản lý dự án có lớp AI hỗ trợ trích xuất công việc, phân tích rủi ro, mô phỏng kịch bản, họp trực tuyến, chat realtime, audit trail và dashboard Power BI Embedded.

Repo hiện gồm 2 ứng dụng tách biệt:

- `backend/`: Node.js + Express + WebSocket, dùng PostgreSQL làm database chính.
- `frontend/`: React 19 + Vite + Zustand + React Router.
- `dataset/`: bộ dữ liệu mẫu dạng CSV/JSONL để import vào PostgreSQL.

## Công nghệ chính

**Frontend**

- React 19, Vite 6, React Router 7
- Zustand + Immer cho state management
- Axios cho API client
- Lucide React, Framer Motion, React Hot Toast
- DnD Kit cho Kanban drag/drop
- Power BI client cho nhúng report
- Microsoft Cognitive Services Speech SDK cho tính năng họp/voice

**Backend**

- Node.js, Express 5
- PostgreSQL qua `pg`
- JWT auth, bcrypt password hashing
- WebSocket qua `ws`
- Multer upload file
- Azure/OpenAI SDK, Azure AI Search, Azure Blob Storage, Cosmos DB, Azure Speech
- Power BI REST API qua Azure AD client credentials

## Cấu trúc thư mục

```text
.
|-- backend/
|   |-- src/
|   |   |-- index.js              # Express app, WebSocket, routes, webhooks, health, seed
|   |   |-- database.js           # PostgreSQL pool, schema, Power BI views
|   |   |-- middleware/auth.js    # JWT authenticate/authorize
|   |   |-- routes/               # API modules
|   |   |-- services/             # Azure/OpenAI/Blob/Search/Cosmos/Speech services
|   |   `-- utils/importDataset.js
|   |-- data/                     # có file SQLite cũ, code hiện tại không dùng làm DB chính
|   `-- uploads/                  # file upload local
|-- frontend/
|   |-- src/
|   |   |-- App.jsx               # route definitions
|   |   |-- components/Layout.jsx # layout chính + WebSocket notification
|   |   |-- lib/api.js            # axios client
|   |   |-- store/useStore.js     # Zustand store
|   |   `-- pages/                # dashboard, project, AI, meeting, chat...
|   `-- public/
`-- dataset/                      # synthetic sample data
```

## Tính năng chính

- Đăng ký, đăng nhập, JWT auth, phân quyền `viewer`, `contributor`, `project_manager`, `admin`.
- Quản lý user, profile, avatar, skill và đổi role.
- Quản lý project, task, comment, Kanban, Gantt, analytics, project memory.
- AI extraction từ text/email/meeting/manual source, lưu `ai_drafts`, duyệt hoặc từ chối draft.
- AI risk analysis, what-if simulation, resource optimization, standup summary, behavioral insights, timeline prediction.
- AI assistant có lịch sử local trên frontend và API chat theo project context.
- Single source validator và apply proposal cho các đề xuất AI.
- Meeting management: tạo họp, mời người tham gia, lời mời họp, phòng họp, xử lý transcript, đề xuất next steps.
- Chat realtime: conversation DM/group, message history, read state, pin message, reply, file message.
- Friends: tìm user, gửi request, accept/reject, danh sách bạn bè và pending requests.
- Notification và risk register.
- Audit log global và task change log.
- Upload local qua `/api/upload` và upload/download/delete Azure Blob qua `/api/files`.
- Search API: nếu Azure AI Search được cấu hình thì dùng search index; nếu không, một số route có fallback query PostgreSQL.
- Power BI Embedded: cấp embed token khi có cấu hình `POWERBI_*`, trả demo mode nếu chưa cấu hình.
- WebSocket `/ws`: notification, typing indicator, meeting event, screen share data, chat message, pin update, call event.
- Power Automate webhook:
  - `/api/webhooks/daily-risk-scan`
  - `/api/webhooks/github-pr-merged`

## Yêu cầu môi trường

- Node.js 18+.
- npm.
- PostgreSQL đang chạy và có database/user phù hợp.
- Tùy chọn: Azure OpenAI/Azure AI Foundry, Azure AI Search, Azure Blob Storage, Cosmos DB, Azure Speech, Power BI Embedded.

Code backend luôn khởi tạo PostgreSQL schema khi start. Nếu không cấu hình Azure AI, một số tính năng AI sẽ chạy fallback rule-based. Nếu không cấu hình Search/Power BI/Blob/Cosmos, các service tương ứng sẽ bị tắt hoặc trả trạng thái chưa cấu hình.

## Cài đặt

Backend và frontend có `package.json` riêng, không có root package script.

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Cấu hình backend

Tạo file `backend/.env`.

```env
PORT=3001

# PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=postgres
PG_USER=postgres
PG_PASSWORD=postgres
PG_SSL=false

# Auth
JWT_SECRET=change-this-secret

# Azure OpenAI / Azure AI Foundry - optional
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini

# Azure AI Search - optional
AZURE_SEARCH_ENDPOINT=
AZURE_SEARCH_API_KEY=
AZURE_SEARCH_INDEX=cwb-projects-index

# Azure Blob Storage - optional
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER=project-files
AZURE_STORAGE_ACCOUNT_NAME=
AZURE_STORAGE_ACCOUNT_KEY=

# Azure Cosmos DB - optional
COSMOS_ENDPOINT=
COSMOS_KEY=
COSMOS_DATABASE=cwb_intelligence

# Azure Speech - optional
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=

# Power BI Embedded - optional
POWERBI_CLIENT_ID=
POWERBI_CLIENT_SECRET=
POWERBI_TENANT_ID=
POWERBI_WORKSPACE_ID=
POWERBI_REPORT_ID=

# Power Automate webhooks - optional
POWER_AUTOMATE_SECRET=
```

Lưu ý tên biến trong code là `AZURE_OPENAI_API_KEY`, `AZURE_SEARCH_API_KEY` và `POWERBI_*`.

## Cấu hình frontend

Tạo file `frontend/.env` nếu muốn override URL mặc định.

```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001/ws
```

Nếu không tạo file này, frontend mặc định gọi:

- API: `http://localhost:3001/api`
- WebSocket: `ws://localhost:3001/ws`

## Chạy ứng dụng

Terminal 1:

```bash
cd backend
npm run dev
```

Backend chạy ở `http://localhost:3001`. Health check:

```bash
curl http://localhost:3001/api/health
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Vite sẽ in URL frontend, thường là `http://localhost:5173`.

## API chính

Các route chính được mount trong `backend/src/index.js`:

| Prefix | Nội dung |
| --- | --- |
| `/api/auth` | register, login, profile, users, role |
| `/api/projects` | CRUD project, analytics, changes, memory |
| `/api/tasks` | CRUD task, comments, reorder |
| `/api/ai` | extract, drafts, risk, simulate, optimize, standup, chat, proposals |
| `/api/meetings` | meeting CRUD, invitations, transcript processing, Speech credentials |
| `/api/notifications` | notifications và risk register |
| `/api/files` | Azure Blob upload/download/delete |
| `/api/upload` | upload local vào `backend/uploads` |
| `/api/search` | search global/tasks/meetings |
| `/api/powerbi` | embed token và report list |
| `/api/chat` | conversations, messages, group members |
| `/api/friends` | user search, friend requests, friends list |
| `/api/audit` | audit logs |

Ngoài ra:

- `GET /api/health`
- `POST /api/seed`
- `POST /api/webhooks/daily-risk-scan`
- `POST /api/webhooks/github-pr-merged`
- `ws://localhost:3001/ws?userId=<id>`

## Frontend routes

Các route chính nằm trong `frontend/src/App.jsx`:

- `/login`
- `/dashboard`
- `/projects`
- `/projects/:id`
- `/projects/:id/kanban`
- `/projects/:id/gantt`
- `/projects/:id/risks`
- `/projects/:id/simulation`
- `/projects/:id/resources`
- `/projects/:id/audit`
- `/ai/extract`
- `/ai/assistant`
- `/meetings`
- `/meetings/:id/room`
- `/chat`
- `/profile`

Tất cả route ngoài `/login` được bọc bởi `ProtectedRoute` và cần user trong Zustand/localStorage.

## Database

Schema PostgreSQL được tạo trong `backend/src/database.js`, gồm các bảng chính:

- `users`
- `projects`
- `tasks`
- `task_changes`
- `ai_drafts`
- `meetings`
- `risks`
- `allocations`
- `notifications`
- `simulations`
- `comments`
- `project_memory`
- `conversations`
- `conversation_members`
- `friendships`
- `meeting_invitations`
- `messages`
- `audit_logs`

Views Power BI được tạo khi backend start:

- `pbi_project_health`
- `pbi_task_velocity`

File `backend/src/database/views.sql` còn định nghĩa thêm:

- `pbi_plan_changes`
- `pbi_resource_workload`

Nếu cần các view bổ sung này trong database, chạy nội dung file SQL đó thủ công hoặc thêm vào migration.

## Ghi chú về tích hợp Azure

- `services/aiAgents.js` dùng Azure OpenAI nếu có `AZURE_OPENAI_ENDPOINT`; nếu không, nhiều agent trả rule-based fallback.
- `services/azureSearch.js` chỉ bật khi có `AZURE_SEARCH_ENDPOINT` và `AZURE_SEARCH_API_KEY`.
- `routes/powerbi.js` trả `{ configured: false }` nếu thiếu `POWERBI_CLIENT_ID`, `POWERBI_CLIENT_SECRET` hoặc `POWERBI_TENANT_ID`.
- `services/blobStorage.js` hỗ trợ connection string hoặc account name/key tùy cấu hình.
- `services/cosmosDb.js` dùng Cosmos DB cho audit/event memory khi có cấu hình; nếu không thì service bị disable.
