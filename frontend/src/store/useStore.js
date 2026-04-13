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
