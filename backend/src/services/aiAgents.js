/**
 * AI Agent Service — Core intelligence layer
 * Handles: Extraction, Risk Analysis, Simulation, Critical Path, Resource Optimization
 */

const { OpenAI } = require('openai');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function callAI(systemPrompt, userPrompt, jsonMode = true) {
  if (!openai) {
    return null; // Will use rule-based fallback
  }
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      temperature: 0.3,
      max_tokens: 4000
    });
    const content = response.choices[0].message.content;
    return jsonMode ? JSON.parse(content) : content;
  } catch (err) {
    console.error('AI call failed:', err.message);
    return null;
  }
}

async function extractionAgent(text, sourceType, projectContext) {
  const systemPrompt = `You are an expert project management AI. Extract structured task information from ${sourceType} content.
Return JSON with this exact structure:
{
  "extracted_tasks": [
    {
      "title": "string",
      "description": "string",
      "owner": "string or null",
      "due_date": "YYYY-MM-DD or null",
      "priority": "critical|high|medium|low",
      "status": "todo|in_progress|blocked|done",
      "dependencies": ["task title strings"],
      "tags": ["string"],
      "change_type": "new|update|conflict|ambiguity",
      "confidence": 0.0-1.0,
      "evidence": "exact quote from source text",
      "reasoning": "why this was extracted"
    }
  ],
  "summary": "brief summary of what was extracted",
  "key_decisions": ["list of decisions made"],
  "action_items": ["clear action items"],
  "ambiguities": ["things that need clarification"],
  "overall_confidence": 0.0-1.0,
  "meeting_quality_score": 0.0-1.0
}`;

  const userPrompt = `Project Context: ${JSON.stringify(projectContext)}

Source (${sourceType}):
${text}

Extract all task-related information. Be thorough and precise.`;

  const aiResult = await callAI(systemPrompt, userPrompt);
  if (aiResult) return aiResult;

  return ruleBasedExtraction(text, sourceType);
}

function ruleBasedExtraction(text, sourceType) {
  const tasks = [];
  const lines = text.split('\n').filter(l => l.trim());
  
  const actionWords = ['need to', 'will', 'should', 'must', 'todo', 'action:', 'assigned to', 'complete', 'finish', 'implement', 'develop', 'review', 'update', 'create', 'fix', 'deploy'];
  const priorityWords = { critical: ['urgent', 'asap', 'immediately', 'critical', 'blocker'], high: ['important', 'priority', 'soon', 'high'], low: ['nice to have', 'low', 'optional', 'later'] };
  
  lines.forEach((line, i) => {
    const lower = line.toLowerCase();
    if (actionWords.some(w => lower.includes(w))) {
      let priority = 'medium';
      for (const [p, words] of Object.entries(priorityWords)) {
        if (words.some(w => lower.includes(w))) { priority = p; break; }
      }
      
      const dateMatch = line.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/);
      const ownerMatch = line.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b(?:\s+will|\s+should|\s+to)/);
      
      tasks.push({
        title: line.trim().substring(0, 100),
        description: line.trim(),
        owner: ownerMatch ? ownerMatch[1] : null,
        due_date: dateMatch ? dateMatch[1] : null,
        priority,
        status: 'todo',
        dependencies: [],
        tags: [],
        change_type: 'new',
        confidence: 0.6,
        evidence: line.trim(),
        reasoning: 'Rule-based extraction detected action keyword'
      });
    }
  });

  return {
    extracted_tasks: tasks,
    summary: `Extracted ${tasks.length} tasks from ${sourceType} using rule-based analysis`,
    key_decisions: [],
    action_items: tasks.map(t => t.title),
    ambiguities: [],
    overall_confidence: 0.65,
    meeting_quality_score: 0.7
  };
}

async function riskAnalysisAgent(tasks, project, resources) {
  const systemPrompt = `You are a risk management AI for software projects. Analyze the project for risks.
Return JSON:
{
  "project_risk_score": 0-100,
  "risks": [
    {
      "title": "string",
      "description": "string",
      "category": "schedule|resource|scope|technical|external",
      "probability": 0.0-1.0,
      "impact": 0.0-1.0,
      "risk_score": 0-100,
      "affected_tasks": ["task ids"],
      "mitigation": "suggested action",
      "early_warning": "what to watch for",
      "confidence": 0.0-1.0
    }
  ],
  "overloaded_resources": [
    { "user_id": "string", "workload_pct": 0-200, "tasks": ["task ids"] }
  ],
  "critical_warnings": ["string"],
  "health_score": 0-100,
  "overall_reasoning": "explanation"
}`;

  const today = new Date().toISOString().split('T')[0];
  const userPrompt = `Today: ${today}
Project: ${JSON.stringify(project)}
Tasks: ${JSON.stringify(tasks)}
Resources: ${JSON.stringify(resources)}

Analyze all risks including schedule, resource overload, dependency conflicts, and scope issues.`;

  const aiResult = await callAI(systemPrompt, userPrompt);
  if (aiResult) return aiResult;

  return ruleBasedRiskAnalysis(tasks, project, resources);
}

function ruleBasedRiskAnalysis(tasks, project, resources) {
  const today = new Date();
  const risks = [];
  let riskScore = 0;

  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < today && t.status !== 'done');
  if (overdueTasks.length > 0) {
    const r = { title: 'Overdue Tasks', description: `${overdueTasks.length} tasks past deadline`, category: 'schedule', probability: 0.9, impact: 0.8, risk_score: 72, affected_tasks: overdueTasks.map(t => t.id), mitigation: 'Review and reschedule overdue tasks', early_warning: 'Tasks past deadline', confidence: 0.95 };
    risks.push(r);
    riskScore += 30;
  }

  const imminent = tasks.filter(t => { const d = new Date(t.due_date); return d > today && (d - today) / 86400000 <= 3 && t.status !== 'done'; });
  if (imminent.length > 0) {
    risks.push({ title: 'Imminent Deadlines', description: `${imminent.length} tasks due within 3 days`, category: 'schedule', probability: 0.7, impact: 0.6, risk_score: 42, affected_tasks: imminent.map(t => t.id), mitigation: 'Prioritize and focus team', early_warning: '3-day deadline window', confidence: 0.9 });
    riskScore += 15;
  }

  const ownerLoad = {};
  tasks.filter(t => t.status !== 'done').forEach(t => {
    if (t.owner_id) ownerLoad[t.owner_id] = (ownerLoad[t.owner_id] || 0) + (t.estimated_hours || 8);
  });
  const overloaded = Object.entries(ownerLoad).filter(([, h]) => h > 40).map(([id, h]) => ({ user_id: id, workload_pct: Math.round(h / 40 * 100), tasks: tasks.filter(t => t.owner_id === id && t.status !== 'done').map(t => t.id) }));
  if (overloaded.length > 0) riskScore += 20;

  const blocked = tasks.filter(t => t.status === 'blocked');
  if (blocked.length > 0) {
    risks.push({ title: 'Blocked Tasks', description: `${blocked.length} tasks are blocked`, category: 'schedule', probability: 0.85, impact: 0.7, risk_score: 60, affected_tasks: blocked.map(t => t.id), mitigation: 'Resolve blockers immediately', early_warning: 'Tasks in blocked state', confidence: 0.95 });
    riskScore += 25;
  }

  return {
    project_risk_score: Math.min(100, riskScore),
    risks,
    overloaded_resources: overloaded,
    critical_warnings: overdueTasks.length > 0 ? [`${overdueTasks.length} tasks are overdue`] : [],
    health_score: Math.max(0, 100 - riskScore),
    overall_reasoning: 'Rule-based risk analysis completed'
  };
}

async function simulationAgent(scenario, currentPlan, tasks) {
  const systemPrompt = `You are a project simulation AI. Analyze what would happen if the described scenario occurred.
Return JSON:
{
  "scenario_summary": "what the scenario entails",
  "timeline_impact": {
    "days_added": 0,
    "new_end_date": "YYYY-MM-DD",
    "critical_path_changed": true|false
  },
  "affected_tasks": [
    { "task_id": "string", "task_title": "string", "impact": "description", "new_due_date": "YYYY-MM-DD or null" }
  ],
  "resource_impact": [
    { "user": "string", "impact": "description", "new_workload_pct": 0-200 }
  ],
  "risk_delta": { "before": 0-100, "after": 0-100, "change": "increased|decreased|stable" },
  "recommendations": ["actionable recommendations"],
  "alternative_options": [
    { "option": "description", "pros": ["string"], "cons": ["string"], "timeline_impact_days": 0 }
  ],
  "trade_off_summary": "brief PM-friendly summary"
}`;

  const userPrompt = `Scenario: "${scenario}"
Current Plan End Date: ${currentPlan.end_date}
Risk Score: ${currentPlan.risk_score}
Tasks: ${JSON.stringify(tasks.slice(0, 50))}`;

  const aiResult = await callAI(systemPrompt, userPrompt);
  if (aiResult) return aiResult;

  return {
    scenario_summary: scenario,
    timeline_impact: { days_added: 3, new_end_date: null, critical_path_changed: false },
    affected_tasks: [],
    resource_impact: [],
    risk_delta: { before: currentPlan.risk_score, after: currentPlan.risk_score + 10, change: 'increased' },
    recommendations: ['Review affected tasks', 'Update stakeholders', 'Consider resource reallocation'],
    alternative_options: [
      { option: 'Extend timeline', pros: ['Less pressure'], cons: ['Delayed delivery'], timeline_impact_days: 5 },
      { option: 'Add resources', pros: ['Maintain timeline'], cons: ['Higher cost'], timeline_impact_days: 0 }
    ],
    trade_off_summary: 'Simulation requires AI configuration for detailed analysis'
  };
}

function criticalPathAgent(tasks) {
  const taskMap = {};
  tasks.forEach(t => { taskMap[t.id] = { ...t, deps: JSON.parse(t.dependencies || '[]'), earlyStart: 0, earlyFinish: 0, lateStart: 0, lateFinish: 0, slack: 0 }; });

  const sorted = topologicalSort(tasks, taskMap);
  
  sorted.forEach(id => {
    const t = taskMap[id];
    if (!t) return;
    const depFinish = t.deps.reduce((max, depId) => {
      return taskMap[depId] ? Math.max(max, taskMap[depId].earlyFinish) : max;
    }, 0);
    t.earlyStart = depFinish;
    t.earlyFinish = t.earlyStart + (t.estimated_hours || 8) / 8;
  });

  const projectEnd = Math.max(...Object.values(taskMap).map(t => t.earlyFinish || 0));

  [...sorted].reverse().forEach(id => {
    const t = taskMap[id];
    if (!t) return;
    const dependents = tasks.filter(other => JSON.parse(other.dependencies || '[]').includes(id));
    t.lateFinish = dependents.length === 0 ? projectEnd : Math.min(...dependents.map(d => taskMap[d.id]?.lateStart || projectEnd));
    t.lateStart = t.lateFinish - (t.estimated_hours || 8) / 8;
    t.slack = t.lateStart - t.earlyStart;
    t.is_critical = t.slack <= 0;
  });

  const criticalPath = sorted.filter(id => taskMap[id]?.is_critical);
  const bottlenecks = tasks.filter(t => {
    const deps = JSON.parse(t.dependencies || '[]');
    return deps.length > 2 || tasks.filter(other => JSON.parse(other.dependencies || '[]').includes(t.id)).length > 2;
  });

  return {
    critical_path_ids: criticalPath,
    critical_path_tasks: criticalPath.map(id => taskMap[id]).filter(Boolean),
    bottleneck_tasks: bottlenecks,
    project_duration_days: projectEnd,
    task_details: taskMap
  };
}

function topologicalSort(tasks, taskMap) {
  const visited = new Set();
  const result = [];
  
  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const t = taskMap[id];
    if (t) t.deps.forEach(dep => visit(dep));
    result.push(id);
  }
  
  tasks.forEach(t => visit(t.id));
  return result;
}

async function resourceOptimizationAgent(tasks, users, project) {
  const systemPrompt = `You are a resource optimization AI for project management. Suggest optimal task assignments.
Return JSON:
{
  "suggestions": [
    {
      "task_id": "string",
      "task_title": "string",
      "current_owner": "string or null",
      "suggested_owner": "string",
      "reason": "explanation",
      "confidence": 0.0-1.0,
      "impact": "workload improvement description"
    }
  ],
  "workload_summary": [
    { "user_id": "string", "name": "string", "current_load_pct": 0-200, "optimized_load_pct": 0-200, "tasks_count": 0 }
  ],
  "optimization_score": 0-100,
  "recommendations": ["string"],
  "schedule_adjustments": [
    { "task_id": "string", "suggestion": "delay|split|reassign|expedite", "details": "string" }
  ]
}`;

  const userPrompt = `Project: ${JSON.stringify(project)}
Team Members: ${JSON.stringify(users.map(u => ({ id: u.id, name: u.name, role: u.role, skills: u.skills })))}
Tasks: ${JSON.stringify(tasks)}`;

  const aiResult = await callAI(systemPrompt, userPrompt);
  if (aiResult) return aiResult;

  return ruleBasedResourceOptimization(tasks, users);
}

function ruleBasedResourceOptimization(tasks, users) {
  const ownerLoad = {};
  users.forEach(u => { ownerLoad[u.id] = { user: u, tasks: [], hours: 0 }; });
  
  tasks.filter(t => t.status !== 'done').forEach(t => {
    if (t.owner_id && ownerLoad[t.owner_id]) {
      ownerLoad[t.owner_id].tasks.push(t);
      ownerLoad[t.owner_id].hours += t.estimated_hours || 8;
    }
  });

  const avgHours = Object.values(ownerLoad).reduce((s, o) => s + o.hours, 0) / Math.max(users.length, 1);
  const suggestions = [];

  Object.entries(ownerLoad).forEach(([uid, data]) => {
    if (data.hours > avgHours * 1.3 && data.tasks.length > 0) {
      const underloadedUser = Object.values(ownerLoad).find(o => o.hours < avgHours * 0.7 && o.user.id !== uid);
      if (underloadedUser) {
        const taskToMove = data.tasks.find(t => t.priority !== 'critical');
        if (taskToMove) {
          suggestions.push({
            task_id: taskToMove.id,
            task_title: taskToMove.title,
            current_owner: data.user.name,
            suggested_owner: underloadedUser.user.name,
            reason: `${data.user.name} is overloaded (${Math.round(data.hours / 40 * 100)}%), ${underloadedUser.user.name} has capacity`,
            confidence: 0.75,
            impact: 'Better workload balance'
          });
        }
      }
    }
  });

  return {
    suggestions,
    workload_summary: Object.values(ownerLoad).map(o => ({
      user_id: o.user.id,
      name: o.user.name,
      current_load_pct: Math.round(o.hours / 40 * 100),
      optimized_load_pct: Math.round(o.hours / 40 * 100),
      tasks_count: o.tasks.length
    })),
    optimization_score: 70,
    recommendations: suggestions.length > 0 ? suggestions.map(s => s.reason) : ['Workload appears balanced'],
    schedule_adjustments: []
  };
}

async function dailyStandupGenerator(project, tasks, recentChanges) {
  const systemPrompt = `You are an AI that generates concise, useful daily standup agendas for project teams.
Return JSON:
{
  "date": "today",
  "yesterday_summary": ["what was completed"],
  "today_focus": ["what needs to happen today"],
  "blockers": ["issues needing immediate attention"],
  "risks_to_discuss": ["risk items"],
  "team_spotlight": "motivational team message",
  "agenda_items": [
    { "topic": "string", "presenter": "string or null", "duration_min": 5, "priority": "high|medium|low" }
  ],
  "key_metrics": { "tasks_done": 0, "tasks_in_progress": 0, "tasks_blocked": 0, "sprint_health": "on_track|at_risk|off_track" },
  "suggested_duration_minutes": 15
}`;

  const today = new Date().toISOString().split('T')[0];
  const userPrompt = `Today: ${today}
Project: ${project.name}
Recent Changes (last 24h): ${JSON.stringify(recentChanges.slice(0, 20))}
Active Tasks: ${JSON.stringify(tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').slice(0, 30))}`;

  const aiResult = await callAI(systemPrompt, userPrompt);
  if (aiResult) return aiResult;

  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;

  return {
    date: today,
    yesterday_summary: recentChanges.slice(0, 3).map(c => c.ai_reasoning || `${c.change_type} on task`),
    today_focus: tasks.filter(t => t.status === 'in_progress').slice(0, 5).map(t => t.title),
    blockers: tasks.filter(t => t.status === 'blocked').map(t => t.title),
    risks_to_discuss: overdue > 0 ? [`${overdue} tasks overdue`] : [],
    team_spotlight: "Let's make today count! Focus on unblocking critical path items.",
    agenda_items: [
      { topic: 'Progress Updates', presenter: null, duration_min: 5, priority: 'high' },
      { topic: 'Blocker Review', presenter: null, duration_min: 5, priority: 'high' },
      { topic: 'Today\'s Priorities', presenter: null, duration_min: 5, priority: 'medium' }
    ],
    key_metrics: {
      tasks_done: done,
      tasks_in_progress: inProgress,
      tasks_blocked: blocked,
      sprint_health: blocked > 0 || overdue > 0 ? 'at_risk' : 'on_track'
    },
    suggested_duration_minutes: 15
  };
}

async function behavioralInsightAgent(taskHistory, users) {
  const systemPrompt = `You are a people analytics AI. Analyze team performance patterns.
Return JSON:
{
  "team_insights": [
    {
      "user_id": "string",
      "name": "string",
      "patterns": ["pattern description"],
      "strengths": ["string"],
      "risk_factors": ["string"],
      "recommendation": "string",
      "on_time_rate": 0.0-1.0,
      "avg_delay_days": 0
    }
  ],
  "task_type_patterns": [
    { "type": "category", "avg_delay_days": 0, "underestimate_rate": 0.0-1.0, "risk_level": "high|medium|low" }
  ],
  "team_velocity": { "avg_tasks_per_week": 0, "trend": "improving|stable|declining" },
  "predictive_alerts": ["string"],
  "recommendations": ["string"]
}`;

  const userPrompt = `Task History: ${JSON.stringify(taskHistory.slice(0, 100))}
Team: ${JSON.stringify(users)}`;

  const aiResult = await callAI(systemPrompt, userPrompt);
  if (aiResult) return aiResult;

  return {
    team_insights: users.map(u => ({
      user_id: u.id,
      name: u.name,
      patterns: ['Insufficient historical data for pattern detection'],
      strengths: ['Analysis pending more data'],
      risk_factors: [],
      recommendation: 'Collect more task completion data for accurate insights',
      on_time_rate: 0.8,
      avg_delay_days: 1
    })),
    task_type_patterns: [],
    team_velocity: { avg_tasks_per_week: 5, trend: 'stable' },
    predictive_alerts: [],
    recommendations: ['Track task completion times to unlock behavioral insights']
  };
}

async function conversationAgent(message, projectContext, chatHistory) {
  const systemPrompt = `You are CWB Project Intelligence AI — an expert AI project management assistant.
You help project managers with:
- Answering questions about their project
- Analyzing risks and suggesting solutions
- Explaining changes and decisions with traceable evidence
- Resource optimization
- Timeline prediction
- "What-if" scenario analysis
- Daily planning and prioritization

Always be concise, actionable, and reference specific data from the project context.
When you identify risks or issues, explain them clearly.
Format numbers and dates clearly.
If asked about specific people, tasks, or dates, reference the actual data.`;

  const recentHistory = (chatHistory || []).slice(-10).map(m => ({
    role: m.role,
    content: m.content
  }));

  if (!openai) {
    return ruleBasedConversation(message, projectContext);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt + '\n\nProject Context:\n' + JSON.stringify(projectContext) },
        ...recentHistory,
        { role: 'user', content: message }
      ],
      temperature: 0.5,
      max_tokens: 1000
    });
    return { reply: response.choices[0].message.content, confidence: 0.9 };
  } catch (err) {
    return ruleBasedConversation(message, projectContext);
  }
}

function ruleBasedConversation(message, ctx) {
  const lower = message.toLowerCase();
  const { project, tasks = [], risks = [] } = ctx;

  if (lower.includes('risk') || lower.includes('rủi ro')) {
    const highRisks = risks.filter(r => r.risk_score > 50);
    return { reply: `Currently ${risks.length} risks identified. ${highRisks.length} are high priority: ${highRisks.slice(0, 3).map(r => r.title).join(', ')}. Focus on mitigating schedule risks first.`, confidence: 0.8 };
  }
  if (lower.includes('overdue') || lower.includes('trễ') || lower.includes('deadline')) {
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done');
    return { reply: `There are ${overdue.length} overdue tasks. Immediate attention needed on: ${overdue.slice(0, 3).map(t => t.title).join(', ')}.`, confidence: 0.85 };
  }
  if (lower.includes('status') || lower.includes('progress') || lower.includes('tiến độ')) {
    const done = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    return { reply: `Project "${project?.name}": ${done}/${total} tasks completed (${total > 0 ? Math.round(done/total*100) : 0}%). ${tasks.filter(t => t.status === 'in_progress').length} in progress, ${tasks.filter(t => t.status === 'blocked').length} blocked.`, confidence: 0.9 };
  }
  if (lower.includes('who') || lower.includes('ai')) {
    return { reply: 'I am CWB Project Intelligence AI. I can help you analyze project risks, track task progress, simulate scenarios, optimize resources, and more. What would you like to know about your project?', confidence: 1.0 };
  }
  
  return { reply: `I understand you're asking about: "${message}". To give you the best analysis, please configure your OpenAI API key for advanced AI features. Currently running in rule-based mode. I can see your project has ${tasks.length} total tasks with ${tasks.filter(t => t.status !== 'done').length} remaining.`, confidence: 0.5 };
}

function changeDetectionAgent(currentTasks, baselineTasks) {
  const changes = [];
  const baselineMap = {};
  baselineTasks.forEach(t => { baselineMap[t.id] = t; });

  currentTasks.forEach(task => {
    const baseline = baselineMap[task.id];
    if (!baseline) {
      changes.push({ task_id: task.id, task_title: task.title, change_type: 'new_task', description: 'Task added after baseline', impact: 'scope_increase', severity: 'medium' });
      return;
    }

    if (task.due_date !== baseline.due_date) {
      const days = task.due_date && baseline.due_date ? Math.round((new Date(task.due_date) - new Date(baseline.due_date)) / 86400000) : 0;
      changes.push({ task_id: task.id, task_title: task.title, change_type: 'date_change', field: 'due_date', old_value: baseline.due_date, new_value: task.due_date, days_delta: days, description: `Deadline ${days > 0 ? 'delayed' : 'moved forward'} by ${Math.abs(days)} days`, impact: days > 0 ? 'schedule_delay' : 'schedule_improvement', severity: days > 7 ? 'high' : days > 3 ? 'medium' : 'low' });
    }
    if (task.owner_id !== baseline.owner_id) {
      changes.push({ task_id: task.id, task_title: task.title, change_type: 'owner_change', old_value: baseline.owner_id, new_value: task.owner_id, description: 'Task owner changed', impact: 'resource_change', severity: 'medium' });
    }
    if (task.status !== baseline.status) {
      changes.push({ task_id: task.id, task_title: task.title, change_type: 'status_change', old_value: baseline.status, new_value: task.status, description: `Status changed from ${baseline.status} to ${task.status}`, impact: 'progress_update', severity: 'low' });
    }
    if (task.priority !== baseline.priority) {
      changes.push({ task_id: task.id, task_title: task.title, change_type: 'priority_change', old_value: baseline.priority, new_value: task.priority, description: `Priority changed from ${baseline.priority} to ${task.priority}`, impact: 'scope_change', severity: 'medium' });
    }
  });

  const removedTasks = baselineTasks.filter(b => !currentTasks.find(t => t.id === b.id));
  removedTasks.forEach(t => {
    changes.push({ task_id: t.id, task_title: t.title, change_type: 'removed_task', description: 'Task removed from plan', impact: 'scope_decrease', severity: 'high' });
  });

  return {
    total_changes: changes.length,
    changes,
    summary: {
      date_changes: changes.filter(c => c.change_type === 'date_change').length,
      owner_changes: changes.filter(c => c.change_type === 'owner_change').length,
      status_changes: changes.filter(c => c.change_type === 'status_change').length,
      new_tasks: changes.filter(c => c.change_type === 'new_task').length,
      removed_tasks: changes.filter(c => c.change_type === 'removed_task').length
    },
    high_severity: changes.filter(c => c.severity === 'high'),
    what_changed_this_week: changes.slice(0, 10).map(c => c.description)
  };
}

function smartNotificationDecider(task, changeType, userRole) {
  const notifications = [];
  
  const rules = [
    { condition: () => task.status === 'blocked', message: `Task "${task.title}" is BLOCKED and needs attention`, priority: 'urgent', roles: ['project_manager', 'admin', task.owner_id] },
    { condition: () => task.due_date && (new Date(task.due_date) - new Date()) / 86400000 <= 1 && task.status !== 'done', message: `Task "${task.title}" is due tomorrow!`, priority: 'high', roles: [task.owner_id, 'project_manager'] },
    { condition: () => task.risk_score > 70, message: `High risk detected on task "${task.title}" (risk score: ${task.risk_score})`, priority: 'high', roles: ['project_manager', 'admin'] },
    { condition: () => changeType === 'owner_change', message: `You've been assigned task "${task.title}"`, priority: 'normal', roles: [task.owner_id] },
    { condition: () => task.is_critical_path && changeType === 'date_change', message: `Critical path task "${task.title}" schedule has changed`, priority: 'high', roles: ['project_manager', 'admin'] }
  ];

  rules.forEach(rule => {
    if (rule.condition()) notifications.push({ message: rule.message, priority: rule.priority, target_roles: rule.roles });
  });

  return notifications;
}

async function timelinePredictionAgent(project, tasks, historicalData) {
  const systemPrompt = `You are a project timeline prediction AI. Based on current progress and historical patterns, predict project completion.
Return JSON:
{
  "predicted_end_date": "YYYY-MM-DD",
  "confidence": 0.0-1.0,
  "delay_probability": 0.0-1.0,
  "predicted_delay_days": 0,
  "velocity_analysis": { "planned_tasks_per_week": 0, "actual_tasks_per_week": 0, "trend": "improving|stable|declining" },
  "completion_scenarios": [
    { "scenario": "optimistic|realistic|pessimistic", "end_date": "YYYY-MM-DD", "probability": 0.0-1.0 }
  ],
  "key_risk_factors": ["string"],
  "recommendation": "string"
}`;

  const completedTasks = tasks.filter(t => t.status === 'done');
  const remainingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
  
  const userPrompt = `Project: ${JSON.stringify(project)}
Completed Tasks: ${completedTasks.length}
Remaining Tasks: ${remainingTasks.length}
Blocked Tasks: ${tasks.filter(t => t.status === 'blocked').length}
Historical: ${JSON.stringify(historicalData)}`;

  const aiResult = await callAI(systemPrompt, userPrompt);
  if (aiResult) return aiResult;

  const totalTasks = tasks.length;
  const done = completedTasks.length;
  const completionRate = totalTasks > 0 ? done / totalTasks : 0;
  const remaining = remainingTasks.length;
  const avgDaysPerTask = 3; // assumption
  const predictedDays = remaining * avgDaysPerTask;
  const predictedEnd = new Date();
  predictedEnd.setDate(predictedEnd.getDate() + predictedDays);

  return {
    predicted_end_date: predictedEnd.toISOString().split('T')[0],
    confidence: 0.65,
    delay_probability: tasks.filter(t => t.status === 'blocked').length > 0 ? 0.7 : 0.4,
    predicted_delay_days: tasks.filter(t => t.status === 'blocked').length * 2,
    velocity_analysis: { planned_tasks_per_week: 5, actual_tasks_per_week: Math.round(done / 4), trend: 'stable' },
    completion_scenarios: [
      { scenario: 'optimistic', end_date: new Date(Date.now() + predictedDays * 0.8 * 86400000).toISOString().split('T')[0], probability: 0.25 },
      { scenario: 'realistic', end_date: predictedEnd.toISOString().split('T')[0], probability: 0.5 },
      { scenario: 'pessimistic', end_date: new Date(Date.now() + predictedDays * 1.3 * 86400000).toISOString().split('T')[0], probability: 0.25 }
    ],
    key_risk_factors: tasks.filter(t => t.status === 'blocked').map(t => `Blocked: ${t.title}`),
    recommendation: completionRate < 0.5 ? 'Project is behind schedule. Consider resource reallocation.' : 'Project is progressing well. Maintain current pace.'
  };
}

module.exports = {
  extractionAgent,
  riskAnalysisAgent,
  simulationAgent,
  criticalPathAgent,
  resourceOptimizationAgent,
  dailyStandupGenerator,
  behavioralInsightAgent,
  conversationAgent,
  changeDetectionAgent,
  smartNotificationDecider,
  timelinePredictionAgent
};
