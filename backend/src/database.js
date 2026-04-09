const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'project_intelligence.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    -- Users & Auth
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer','contributor','project_manager','admin')),
      avatar TEXT,
      skills TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('planning','active','on_hold','completed','cancelled')),
      start_date DATE,
      end_date DATE,
      baseline_end_date DATE,
      owner_id TEXT REFERENCES users(id),
      risk_score REAL DEFAULT 0,
      health_score REAL DEFAULT 100,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo' CHECK(status IN ('todo','in_progress','blocked','review','done','cancelled')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('critical','high','medium','low')),
      owner_id TEXT REFERENCES users(id),
      due_date DATE,
      baseline_due_date DATE,
      start_date DATE,
      estimated_hours REAL DEFAULT 0,
      actual_hours REAL DEFAULT 0,
      completion_pct INTEGER DEFAULT 0,
      dependencies TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      risk_score REAL DEFAULT 0,
      confidence_score REAL DEFAULT 1.0,
      source TEXT DEFAULT 'manual',
      parent_task_id TEXT REFERENCES tasks(id),
      is_milestone INTEGER DEFAULT 0,
      is_critical_path INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Task Change Log (Audit Trail)
    CREATE TABLE IF NOT EXISTS task_changes (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL,
      changed_by TEXT REFERENCES users(id),
      change_type TEXT NOT NULL,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      ai_reasoning TEXT,
      source TEXT DEFAULT 'manual',
      approved_by TEXT REFERENCES users(id),
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- AI Draft Updates (Human-in-the-loop)
    CREATE TABLE IF NOT EXISTS ai_drafts (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      source_type TEXT NOT NULL CHECK(source_type IN ('meeting','email','chat','manual')),
      source_content TEXT NOT NULL,
      extracted_tasks TEXT DEFAULT '[]',
      proposed_changes TEXT DEFAULT '[]',
      risk_analysis TEXT DEFAULT '{}',
      confidence_score REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','partial')),
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at DATETIME,
      ai_summary TEXT,
      ai_reasoning TEXT,
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Meetings
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      title TEXT NOT NULL,
      scheduled_at DATETIME,
      duration_minutes INTEGER DEFAULT 60,
      attendees TEXT DEFAULT '[]',
      transcript TEXT,
      summary TEXT,
      action_items TEXT DEFAULT '[]',
      decisions TEXT DEFAULT '[]',
      quality_score REAL DEFAULT 0,
      meeting_type TEXT DEFAULT 'standup',
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','in_progress','completed','cancelled')),
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Risk Register
    CREATE TABLE IF NOT EXISTS risks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES tasks(id),
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'schedule' CHECK(category IN ('schedule','resource','scope','technical','external')),
      probability REAL DEFAULT 0.5,
      impact REAL DEFAULT 0.5,
      risk_score REAL DEFAULT 0,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','mitigated','closed','accepted')),
      mitigation TEXT,
      owner_id TEXT REFERENCES users(id),
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Resource Allocations
    CREATE TABLE IF NOT EXISTS allocations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      task_id TEXT NOT NULL REFERENCES tasks(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      allocated_hours REAL DEFAULT 0,
      start_date DATE,
      end_date DATE,
      workload_pct REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      data TEXT DEFAULT '{}',
      is_read INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Simulations (What-if)
    CREATE TABLE IF NOT EXISTS simulations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      name TEXT NOT NULL,
      scenario TEXT NOT NULL,
      input_changes TEXT DEFAULT '[]',
      result TEXT DEFAULT '{}',
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Comments / Discussion
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      mentions TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Project Context Memory (AI Brain)
    CREATE TABLE IF NOT EXISTS project_memory (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      memory_type TEXT NOT NULL CHECK(memory_type IN ('decision','change','discussion','milestone','risk')),
      content TEXT NOT NULL,
      referenced_entities TEXT DEFAULT '[]',
      embedding_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_changes_task ON task_changes(task_id);
    CREATE INDEX IF NOT EXISTS idx_changes_project ON task_changes(project_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_risks_project ON risks(project_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_user ON allocations(user_id);
  `);

  console.log('✅ Database initialized');
}

initializeDatabase();

module.exports = db;
