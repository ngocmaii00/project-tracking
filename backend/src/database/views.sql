
-- Power BI Views for SJ Project Planner Agent

-- 1. Project Health Overview
CREATE OR REPLACE VIEW pbi_project_health AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    p.risk_score,
    p.health_score,
    p.start_date,
    p.end_date,
    p.baseline_end_date,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as completed_tasks,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'blocked') as blocked_tasks,
    u.name as project_manager
FROM projects p
LEFT JOIN users u ON p.owner_id = u.id;

-- 2. Task Velocity & Progress
CREATE OR REPLACE VIEW pbi_task_velocity AS
SELECT 
    t.project_id,
    p.name as project_name,
    t.status,
    t.priority,
    t.discipline, -- derived from tags or metadata
    t.owner_id,
    u.name as owner_name,
    t.due_date,
    t.baseline_due_date,
    t.completion_pct,
    t.is_critical_path,
    CASE 
        WHEN t.due_date < NOW() AND t.status != 'done' THEN 'Overdue'
        WHEN t.status = 'blocked' THEN 'Blocked'
        WHEN t.status = 'done' THEN 'Completed'
        ELSE 'On Track'
    END as status_category
FROM tasks t
JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.owner_id = u.id;

-- 3. Change Log Analysis (Delta Detection)
CREATE OR REPLACE VIEW pbi_plan_changes AS
SELECT 
    tc.id as change_id,
    tc.project_id,
    p.name as project_name,
    t.title as task_title,
    tc.change_type,
    tc.field_name,
    tc.old_value,
    tc.new_value,
    tc.ai_reasoning,
    tc.created_at as changed_at,
    u.name as changed_by
FROM task_changes tc
JOIN projects p ON tc.project_id = p.id
JOIN tasks t ON tc.task_id = t.id
LEFT JOIN users u ON tc.changed_by = u.id;

-- 4. Resource Workload
CREATE OR REPLACE VIEW pbi_resource_workload AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.role,
    COUNT(t.id) as assigned_tasks,
    SUM(CASE WHEN t.status != 'done' THEN 1 ELSE 0 END) as active_tasks,
    SUM(t.estimated_hours) as total_estimated_hours,
    p.name as project_name
FROM users u
JOIN tasks t ON u.id = t.owner_id
JOIN projects p ON t.project_id = p.id
GROUP BY u.id, u.name, u.role, p.name;
