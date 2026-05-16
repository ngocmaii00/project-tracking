
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { pool, initializeDatabase } = require('../database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATASET_PATH = path.join(__dirname, '../../../dataset');

async function importDataset() {
  console.log('🚀 Starting dataset import...');
  
  try {
    await initializeDatabase();
    
    // 1. Import People -> Users
    console.log('👤 Importing people...');
    const peopleData = fs.readFileSync(path.join(DATASET_PATH, 'people.csv'), 'utf-8');
    const people = parse(peopleData, { columns: true, skip_empty_lines: true });
    
    const passwordHash = await bcrypt.hash('password123', 10);
    
    for (const person of people) {
      await pool.query(`
        INSERT INTO users (id, email, password_hash, name, role, skills, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          skills = EXCLUDED.skills
      `, [
        person.person_id,
        person.email,
        passwordHash,
        person.display_name,
        person.role.toLowerCase().includes('manager') ? 'project_manager' : 'contributor',
        JSON.stringify([person.discipline])
      ]);
    }
    console.log(`✅ Imported ${people.length} users.`);

    // 2. Import Projects
    console.log('📂 Importing projects...');
    const projectsData = fs.readFileSync(path.join(DATASET_PATH, 'projects.csv'), 'utf-8');
    const projects = parse(projectsData, { columns: true, skip_empty_lines: true });
    
    // Get a default owner for projects (e.g., the first PM or admin)
    const firstUser = await pool.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
    const defaultOwnerId = firstUser.rows[0]?.id || 'admin';

    for (const project of projects) {
      await pool.query(`
        INSERT INTO projects (id, name, description, region, contract_type, start_date, end_date, owner_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          region = EXCLUDED.region,
          contract_type = EXCLUDED.contract_type,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date
      `, [
        project.project_id,
        project.project_name,
        `Project for ${project.region} with ${project.contract_type} contract.`,
        project.region,
        project.contract_type,
        project.start_date,
        project.target_end_date,
        defaultOwnerId
      ]);
    }
    console.log(`✅ Imported ${projects.length} projects.`);

    // 3. Import Tasks
    console.log('📋 Importing tasks...');
    const tasksData = fs.readFileSync(path.join(DATASET_PATH, 'tasks_master.csv'), 'utf-8');
    const tasks = parse(tasksData, { columns: true, skip_empty_lines: true });
    
    for (const task of tasks) {
      // Robust status mapping
      let status = task.status.toLowerCase().trim().replace(/\s+/g, '_');
      if (status === 'not_started') status = 'not_started'; // now allowed
      
      await pool.query(`
        INSERT INTO tasks (id, project_id, title, description, status, priority, owner_id, start_date, due_date, completion_pct, discipline, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          owner_id = EXCLUDED.owner_id,
          start_date = EXCLUDED.start_date,
          due_date = EXCLUDED.due_date,
          completion_pct = EXCLUDED.completion_pct,
          discipline = EXCLUDED.discipline
      `, [
        task.task_id,
        task.project_id,
        task.task_title,
        task.notes || '',
        status,
        task.priority.toLowerCase(),
        task.owner_id,
        task.planned_start,
        task.planned_due,
        parseInt(task.percent_complete) || 0,
        task.discipline
      ]);
    }
    console.log(`✅ Imported ${tasks.length} tasks.`);

    // 4. Import Dependencies
    console.log('🔗 Importing dependencies...');
    const depsData = fs.readFileSync(path.join(DATASET_PATH, 'dependencies.csv'), 'utf-8');
    const dependencies = parse(depsData, { columns: true, skip_empty_lines: true });
    
    for (const dep of dependencies) {
      await pool.query(`
        UPDATE tasks 
        SET dependencies = dependencies || jsonb_build_array($1::text)
        WHERE id = $2 AND NOT (dependencies ? $1)
      `, [dep.predecessor_task_id, dep.successor_task_id]);
    }
    console.log(`✅ Imported ${dependencies.length} dependencies.`);

    // 5. Import Meeting Notes
    console.log('🎙️ Importing meeting notes...');
    const meetingNotesData = fs.readFileSync(path.join(DATASET_PATH, 'meeting_notes.jsonl'), 'utf-8');
    const meetingLines = meetingNotesData.split('\n').filter(l => l.trim());
    
    for (const line of meetingLines) {
      const meet = JSON.parse(line);
      await pool.query(`
        INSERT INTO meetings (id, project_id, title, transcript, scheduled_at, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'completed', NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        meet.meeting_id || uuidv4(),
        meet.project_id,
        meet.title || 'Project Meeting',
        meet.notes || meet.transcript || '',
        meet.date || meet.sent_datetime || new Date()
      ]);
    }
    console.log(`✅ Imported ${meetingLines.length} meetings.`);

    // 6. Import Emails as AI Drafts
    console.log('📧 Importing emails...');
    const emailsData = fs.readFileSync(path.join(DATASET_PATH, 'emails.csv'), 'utf-8');
    const emails = parse(emailsData, { columns: true, skip_empty_lines: true });
    
    for (const email of emails) {
      await pool.query(`
        INSERT INTO ai_drafts (id, project_id, source_type, source_content, ai_summary, created_at)
        VALUES ($1, $2, 'email', $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [
        email.email_id || uuidv4(),
        email.project_id,
        `From: ${email.from}\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.body}`,
        email.subject,
        email.sent_datetime
      ]);
    }
    console.log(`✅ Imported ${emails.length} emails.`);

    console.log('🏁 Dataset import completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error importing dataset:', err.message);
    process.exit(1);
  }
}

importDataset();
