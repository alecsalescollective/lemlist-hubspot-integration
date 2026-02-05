import axios from 'axios';

// Create axios instance with base URL
// In production, use VITE_API_URL env var; in dev, proxy handles /api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// API functions
export const leadsApi = {
  getSummary: (owner, period = '7d') =>
    api.get('/leads/summary', { params: { owner, period } }).then(r => r.data),

  getLeads: (owner, limit = 50, offset = 0) =>
    api.get('/leads', { params: { owner, limit, offset } }).then(r => r.data),

  getActivities: (owner, limit = 20) =>
    api.get('/leads/activities', { params: { owner, limit } }).then(r => r.data)
};

export const funnelApi = {
  getStats: (owner, period = '30d') =>
    api.get('/funnel/stats', { params: { owner, period } }).then(r => r.data)
};

export const campaignsApi = {
  getAll: (owner) =>
    api.get('/campaigns', { params: { owner } }).then(r => r.data),

  getById: (id) =>
    api.get(`/campaigns/${id}`).then(r => r.data)
};

export const meetingsApi = {
  getAll: (owner, date = 'all') =>
    api.get('/meetings', { params: { owner, date } }).then(r => r.data),

  getStats: (owner, period = '30d') =>
    api.get('/meetings/stats', { params: { owner, period } }).then(r => r.data)
};

export const syncApi = {
  getStatus: () =>
    api.get('/sync/status').then(r => r.data),

  trigger: (type = 'all') =>
    api.post('/sync/trigger', { type }).then(r => r.data)
};

export default api;
