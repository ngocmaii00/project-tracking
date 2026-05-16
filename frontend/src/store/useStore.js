import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import api from '../lib/api';
import toast from 'react-hot-toast';

const useStore = create(
  immer((set, get) => ({
    user: JSON.parse(localStorage.getItem('cwb_user') || 'null'),
    token: localStorage.getItem('cwb_token'),
    users: [],

    login: async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('cwb_token', data.token);
      localStorage.setItem('cwb_user', JSON.stringify(data.user));
      set(s => { s.user = data.user; s.token = data.token; });
      return data;
    },
    register: async (payload) => {
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem('cwb_token', data.token);
      localStorage.setItem('cwb_user', JSON.stringify(data.user));
      set(s => { s.user = data.user; s.token = data.token; });
      return data;
    },
    logout: () => {
      localStorage.removeItem('cwb_token');
      localStorage.removeItem('cwb_user');
      set(s => { s.user = null; s.token = null; });
    },
    loadUsers: async () => {
      const { data } = await api.get('/auth/users');
      set(s => { s.users = data.users; });
    },
    updateProfile: async (payload) => {
      const { data } = await api.put('/auth/profile', payload);
      localStorage.setItem('cwb_user', JSON.stringify(data.user));
      set(s => { s.user = data.user; });
      return data;
    },
    createUser: async (payload) => {
      const { data } = await api.post('/auth/users', payload);
      await get().loadUsers();
      toast.success('User created!');
      return data;
    },
    changeUserRole: async (userId, role) => {
      await api.put(`/auth/users/${userId}/role`, { role });
      set(s => {
        const u = s.users.find(x => x.id === userId);
        if (u) u.role = role;
      });
      toast.success('User role updated!');
    },

    projects: [],
    currentProject: null,
    projectAnalytics: null,

    loadProjects: async () => {
      const { data } = await api.get('/projects');
      set(s => { s.projects = data.projects; });
    },
    loadProject: async (id) => {
      const { data } = await api.get(`/projects/${id}`);
      set(s => { s.currentProject = data; });
      return data;
    },
    createProject: async (payload) => {
      const { data } = await api.post('/projects', payload);
      set(s => { s.projects.unshift(data.project); });
      toast.success('Project created!');
      return data.project;
    },
    updateProject: async (id, payload) => {
      const { data } = await api.put(`/projects/${id}`, payload);
      set(s => {
        const idx = s.projects.findIndex(p => p.id === id);
        if (idx > -1) s.projects[idx] = data.project;
        if (s.currentProject?.project?.id === id) s.currentProject.project = data.project;
      });
      return data.project;
    },
    loadAnalytics: async (id) => {
      const { data } = await api.get(`/projects/${id}/analytics`);
      set(s => { s.projectAnalytics = data; });
      return data;
    },

    tasks: [],
    currentTask: null,

    loadTasks: async (filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      const { data } = await api.get(`/tasks?${params}`);
      set(s => { s.tasks = data.tasks; });
    },
    createTask: async (payload) => {
      const { data } = await api.post('/tasks', payload);
      set(s => {
        s.tasks.push(data.task);
        if (s.currentProject?.tasks) s.currentProject.tasks.push(data.task);
      });
      toast.success('Task created!');
      return data.task;
    },
    updateTask: async (id, payload) => {
      const { data } = await api.put(`/tasks/${id}`, payload);
      set(s => {
        const update = (arr) => { const i = arr?.findIndex(t => t.id === id); if (i > -1) arr[i] = { ...arr[i], ...data.task }; };
        update(s.tasks);
        update(s.currentProject?.tasks);
      });
      return data.task;
    },
    deleteTask: async (id) => {
      await api.delete(`/tasks/${id}`);
      set(s => {
        s.tasks = s.tasks.filter(t => t.id !== id);
        if (s.currentProject?.tasks) s.currentProject.tasks = s.currentProject.tasks.filter(t => t.id !== id);
      });
      toast.success('Task deleted');
    },
    loadTask: async (id) => {
      const { data } = await api.get(`/tasks/${id}`);
      set(s => { s.currentTask = data; });
      return data;
    },
    reorderTasks: async (updates) => {
      await api.put('/tasks/bulk/reorder', { tasks: updates });
    },
    addTaskComment: async (taskId, content) => {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { content });
      set(s => {
        if (s.currentTask?.task?.id === taskId) {
          if (!s.currentTask.comments) s.currentTask.comments = [];
          s.currentTask.comments.push(data.comment);
        }
      });
      return data.comment;
    },
    handleRealtimeComment: (taskId, comment) => {
      set(s => {
        if (s.currentTask?.task?.id === taskId) {
          const exists = s.currentTask.comments?.some(c => c.id === comment.id);
          if (!exists) {
            if (!s.currentTask.comments) s.currentTask.comments = [];
            s.currentTask.comments.push(comment);
          }
        }
      });
    },
    handleRealtimeTaskUpdate: (task) => {
      set(s => {
        const update = (arr) => {
          const i = arr?.findIndex(t => t.id === task.id);
          if (i > -1) arr[i] = { ...arr[i], ...task };
        };
        update(s.tasks);
        update(s.currentProject?.tasks);
        if (s.currentTask?.task?.id === task.id) {
          s.currentTask.task = { ...s.currentTask.task, ...task };
        }
      });
    },

    aiDrafts: [],
    aiProcessing: false,

    extractFromText: async (text, source_type, project_id) => {
      set(s => { s.aiProcessing = true; });
      try {
        const { data } = await api.post('/ai/extract', { text, source_type, project_id });
        await get().loadDrafts({ project_id });
        toast.success(`Extracted ${data.result.extracted_tasks?.length || 0} tasks`);
        return data;
      } finally {
        set(s => { s.aiProcessing = false; });
      }
    },
    loadDrafts: async (filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      const { data } = await api.get(`/ai/drafts?${params}`);
      set(s => { s.aiDrafts = data.drafts; });
    },
    approveDraft: async (draftId, payload) => {
      const { data } = await api.post(`/ai/drafts/${draftId}/approve`, payload);
      set(s => {
        const i = s.aiDrafts.findIndex(d => d.id === draftId);
        if (i > -1) s.aiDrafts[i].status = 'approved';
      });
      toast.success(`${data.total_applied} tasks applied!`);
      return data;
    },
    rejectDraft: async (draftId) => {
      await api.post(`/ai/drafts/${draftId}/reject`);
      set(s => {
        const i = s.aiDrafts.findIndex(d => d.id === draftId);
        if (i > -1) s.aiDrafts[i].status = 'rejected';
      });
      toast.success('Draft rejected');
    },
    runRiskAnalysis: async (project_id) => {
      set(s => { s.aiProcessing = true; });
      try {
        const { data } = await api.post('/ai/risk', { project_id });
        toast.success('Risk analysis complete');
        return data;
      } finally {
        set(s => { s.aiProcessing = false; });
      }
    },
    runSimulation: async (payload) => {
      set(s => { s.aiProcessing = true; });
      try {
        const { data } = await api.post('/ai/simulate', payload);
        return data;
      } finally {
        set(s => { s.aiProcessing = false; });
      }
    },
    optimizeResources: async (project_id) => {
      const { data } = await api.post('/ai/optimize-resources', { project_id });
      return data;
    },
    generateStandup: async (project_id) => {
      const { data } = await api.post('/ai/standup', { project_id });
      return data;
    },
    getBehavioralInsights: async (project_id) => {
      const { data } = await api.post('/ai/behavioral-insights', { project_id });
      return data;
    },
    predictTimeline: async (project_id) => {
      const { data } = await api.post('/ai/predict-timeline', { project_id });
      return data;
    },
    chat: async (message, project_id, history) => {
      const { data } = await api.post('/ai/chat', { message, project_id, history });
      return data;
    },
    validateSingleSource: async (project_id) => {
      const { data } = await api.get(`/ai/single-source-validator/${project_id}`);
      return data;
    },

    aiConversations: JSON.parse(localStorage.getItem('cwb_ai_chats') || '[]'),
    activeAiConversationId: localStorage.getItem('cwb_ai_active_id'),

    createNewAiChat: () => set(s => {
      const id = Date.now().toString();
      const newChat = { id, title: 'New Conversation', messages: [], createdAt: new Date().toISOString() };
      s.aiConversations.unshift(newChat);
      s.activeAiConversationId = id;
      localStorage.setItem('cwb_ai_chats', JSON.stringify(s.aiConversations));
      localStorage.setItem('cwb_ai_active_id', id);
    }),
    setActiveAiChat: (id) => set(s => {
      s.activeAiConversationId = id;
      localStorage.setItem('cwb_ai_active_id', id);
    }),
    updateAiChatMessages: (id, messages, title) => set(s => {
      const chat = s.aiConversations.find(c => c.id === id);
      if (chat) {
        chat.messages = messages;
        if (title) chat.title = title;
        localStorage.setItem('cwb_ai_chats', JSON.stringify(s.aiConversations));
      }
    }),
    deleteAiChat: (id) => set(s => {
      s.aiConversations = s.aiConversations.filter(c => c.id !== id);
      if (s.activeAiConversationId === id) {
        s.activeAiConversationId = s.aiConversations[0]?.id || null;
      }
      localStorage.setItem('cwb_ai_chats', JSON.stringify(s.aiConversations));
      localStorage.setItem('cwb_ai_active_id', s.activeAiConversationId || '');
    }),

    meetings: [],

    loadMeetings: async (project_id) => {
      const { data } = await api.get(`/meetings?project_id=${project_id}`);
      set(s => { s.meetings = data.meetings; });
    },
    createMeeting: async (payload) => {
      const { data } = await api.post('/meetings', payload);
      set(s => { s.meetings.unshift(data.meeting); });
      return data.meeting;
    },
    processMeeting: async (id, transcript, extra = {}) => {
      const { data } = await api.post(`/meetings/${id}/process`, { transcript, ...extra });
      toast.success('Hoàn tất xử lý meeting!');
      return data;
    },
    inviteToMeeting: async (meetingId, userId) => {
      await api.post(`/meetings/${meetingId}/invite`, { user_id: userId });
      toast.success('Đã gửi lời mời họp');
    },
    acceptMeetingInvite: async (inviteId) => {
      await api.post(`/meetings/invitations/${inviteId}/accept`);
      toast.success('Đã chấp nhận lời mời họp');
    },
    loadMeetingInvitations: async () => {
      const { data } = await api.get('/meetings/invitations');
      return data.invitations;
    },
    deleteMeeting: async (id) => {
      await api.delete(`/meetings/${id}`);
      set(s => { s.meetings = s.meetings.filter(m => m.id !== id); });
      toast.success('Đã xóa cuộc họp');
    },

    notifications: [],
    unreadCount: 0,

    loadNotifications: async () => {
      const { data } = await api.get('/notifications');
      set(s => { s.notifications = data.notifications; s.unreadCount = data.unread_count; });
    },
    markRead: async (id) => {
      await api.put(`/notifications/${id}/read`);
      set(s => {
        const n = s.notifications.find(n => n.id === id);
        if (n) { n.is_read = 1; s.unreadCount = Math.max(0, s.unreadCount - 1); }
      });
    },
    markAllRead: async () => {
      await api.put('/notifications/read-all/all');
      set(s => { s.notifications.forEach(n => n.is_read = 1); s.unreadCount = 0; });
    },

    risks: [],
    loadRisks: async (project_id) => {
      const { data } = await api.get(`/notifications/risks/${project_id}`);
      set(s => { s.risks = data.risks; });
    },

    sidebarOpen: true,
    toggleSidebar: () => set(s => { s.sidebarOpen = !s.sidebarOpen; }),

    activeMeeting: null, // { id, title, videoStream, audioStream, transcript, chatMessages, isRecording, ... }
    setActiveMeeting: (meeting) => set(s => { s.activeMeeting = meeting; }),
    updateMeetingState: (updater) => set(s => {
      if (s.activeMeeting) {
        if (typeof updater === 'function') {
          updater(s.activeMeeting);
        } else {
          s.activeMeeting = { ...s.activeMeeting, ...updater };
        }
      }
    }),
    endActiveMeeting: () => set(s => {
      if (s.activeMeeting) {
        if (s.activeMeeting.videoStream) s.activeMeeting.videoStream.getTracks().forEach(t => t.stop());
        if (s.activeMeeting.audioStream) s.activeMeeting.audioStream.getTracks().forEach(t => t.stop());
        s.activeMeeting = null;
      }
    }),
  }))
);

export default useStore;
