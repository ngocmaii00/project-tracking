/**
 * Azure Database for PostgreSQL — thay thế SQLite
 * Kết nối và khởi tạo schema toàn bộ bảng
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'postgres',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err.message);
});

/**
 * Helper: chạy query với params, trả về rows
 */
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Helper: lấy một row duy nhất
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Helper: chạy nhiều query trong transaction
 */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Khởi tạo schema PostgreSQL — tương đương SQLite schema cũ
 */
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Users & Auth
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer','contributor','project_manager','admin')),
        avatar TEXT,
        skills JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
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
        risk_score NUMERIC DEFAULT 0,
        health_score NUMERIC DEFAULT 100,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
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
        estimated_hours NUMERIC DEFAULT 0,
        actual_hours NUMERIC DEFAULT 0,
        completion_pct INTEGER DEFAULT 0,
        dependencies JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',
        risk_score NUMERIC DEFAULT 0,
        confidence_score NUMERIC DEFAULT 1.0,
        source TEXT DEFAULT 'manual',
        parent_task_id TEXT REFERENCES tasks(id),
        is_milestone BOOLEAN DEFAULT FALSE,
        is_critical_path BOOLEAN DEFAULT FALSE,
        position INTEGER DEFAULT 0,
        blob_attachment_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Task Change Log (Audit Trail) — chi tiết lưu Cosmos DB, đây là index
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
        approved_at TIMESTAMPTZ,
        cosmos_event_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- AI Drafts (Human-in-the-loop)
      CREATE TABLE IF NOT EXISTS ai_drafts (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
        source_type TEXT NOT NULL CHECK(source_type IN ('meeting','email','chat','manual','blob')),
        source_content TEXT NOT NULL,
        blob_source_url TEXT,
        extracted_tasks JSONB DEFAULT '[]',
        proposed_changes JSONB DEFAULT '[]',
        risk_analysis JSONB DEFAULT '{}',
        confidence_score NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','partial')),
        reviewed_by TEXT REFERENCES users(id),
        reviewed_at TIMESTAMPTZ,
        ai_summary TEXT,
        ai_reasoning TEXT,
        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Meetings
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
        title TEXT NOT NULL,
        scheduled_at TIMESTAMPTZ,
        duration_minutes INTEGER DEFAULT 60,
        attendees JSONB DEFAULT '[]',
        transcript TEXT,
        transcript_blob_url TEXT,
        summary TEXT,
        action_items JSONB DEFAULT '[]',
        decisions JSONB DEFAULT '[]',
        next_steps_plan JSONB DEFAULT '[]',
        next_meeting_proposal JSONB DEFAULT '{}',
        quality_score NUMERIC DEFAULT 0,
        meeting_type TEXT DEFAULT 'standup',
        status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','in_progress','completed','cancelled')),
        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Risk Register
      CREATE TABLE IF NOT EXISTS risks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        task_id TEXT REFERENCES tasks(id),
        title TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'schedule' CHECK(category IN ('schedule','resource','scope','technical','external')),
        probability NUMERIC DEFAULT 0.5,
        impact NUMERIC DEFAULT 0.5,
        risk_score NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'open' CHECK(status IN ('open','mitigated','closed','accepted')),
        mitigation TEXT,
        owner_id TEXT REFERENCES users(id),
        due_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Resource Allocations
      CREATE TABLE IF NOT EXISTS allocations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        task_id TEXT NOT NULL REFERENCES tasks(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        allocated_hours NUMERIC DEFAULT 0,
        start_date DATE,
        end_date DATE,
        workload_pct NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Notifications
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        data JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT FALSE,
        priority TEXT DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Simulations (What-if)
      CREATE TABLE IF NOT EXISTS simulations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        name TEXT NOT NULL,
        scenario TEXT NOT NULL,
        input_changes JSONB DEFAULT '[]',
        result JSONB DEFAULT '{}',
        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Comments
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id),
        author_id TEXT NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        mentions JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Project Context Memory (AI Brain) — lightweight index, full data in Cosmos DB
      CREATE TABLE IF NOT EXISTS project_memory (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        memory_type TEXT NOT NULL CHECK(memory_type IN ('decision','change','discussion','milestone','risk')),
        content TEXT NOT NULL,
        referenced_entities JSONB DEFAULT '[]',
        cosmos_doc_id TEXT,
        search_doc_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Conversations (DM or Group)
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        name TEXT, -- Null for DMs
        type TEXT DEFAULT 'dm' CHECK(type IN ('dm','group')),
        avatar TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Conversation Members
      CREATE TABLE IF NOT EXISTS conversation_members (
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        last_read_at TIMESTAMPTZ DEFAULT NOW(),
        role TEXT DEFAULT 'member' CHECK(role IN ('member','admin')),
        PRIMARY KEY (conversation_id, user_id)
      );

      -- Migration for conversation_members
      ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

      -- Friendships
      CREATE TABLE IF NOT EXISTS friendships (
        id TEXT PRIMARY KEY,
        user_id1 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_id2 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','blocked')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id1, user_id2)
      );

      -- Meeting Invitations
      CREATE TABLE IF NOT EXISTS meeting_invitations (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(meeting_id, user_id)
      );

      -- Messages (Updated to support conversations)
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text' CHECK(type IN ('text','file','ai_suggestion')),
        file_url TEXT,
        is_pinned BOOLEAN DEFAULT FALSE,
        reply_to JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Migration for existing messages table
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to JSONB;

      -- Global Audit Log
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
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
      CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(user_id1, user_id2);
    `);

    console.log('✅ PostgreSQL schema initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, query, queryOne, transaction, initializeDatabase };
