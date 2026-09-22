/**
 * MyDashboard API Client
 * Automatically connects to backend at http://localhost:5000/api
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any[];

  constructor(statusCode: number, message: string, code = 'API_ERROR', details?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('mydashboard_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes httpOnly JWT cookie
  });

  if (response.status === 204) {
    return {} as T;
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorInfo = json?.error || {};
    throw new ApiError(
      response.status,
      errorInfo.message || 'An error occurred during API request',
      errorInfo.code || 'HTTP_ERROR',
      errorInfo.details
    );
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

// Auth API
export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await api.post<{ user: any; token: string; isNewRegistration: boolean }>('/auth/register', data);
    if (res?.token) {
      localStorage.setItem('mydashboard_token', res.token);
    }
    return res;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await api.post<{ user: any; token: string }>('/auth/login', data);
    if (res?.token) {
      localStorage.setItem('mydashboard_token', res.token);
    }
    return res;
  },
  logout: async () => {
    try {
      await api.post<{ message: string }>('/auth/logout');
    } catch {} finally {
      localStorage.removeItem('mydashboard_token');
    }
  },
  getMe: () => api.get<{ user: any }>('/auth/me'),
};

// Profile API
export const profileApi = {
  get: () => api.get<{ profile: any }>('/profile'),
  update: (data: any) => api.put<{ profile: any }>('/profile', data),
};

// Academics API
export const academicsApi = {
  getSubjects: () => api.get<{ subjects: any[] }>('/academics/subjects'),
  getSubjectDetail: (id: string) => api.get<any>(`/academics/subjects/${id}`),
  createSubject: (data: any) => api.post<{ subject: any }>('/academics/subjects', data),
  deleteSubject: (id: string) => api.delete(`/academics/subjects/${id}`),
  getSchedule: () => api.get<{ schedule: any[] }>('/academics/schedule'),
  addScheduleSlot: (data: any) => api.post<{ session: any }>('/academics/schedule', data),
  updateScheduleSlot: (id: string, data: any) => api.put<{ session: any }>(`/academics/schedule/${id}`, data),
  deleteScheduleSlot: (id: string) => api.delete(`/academics/schedule/${id}`),
  getHolidays: () => api.get<{ holidays: any[] }>('/academics/holidays'),
  addHoliday: (data: any) => api.post<{ holiday: any }>('/academics/holidays', data),
  deleteHoliday: (id: string) => api.delete(`/academics/holidays/${id}`),
  markAttendance: (data: { subjectId: string; classId?: string; date?: string; status: 'present' | 'absent' }) =>
    api.post<{ record: any }>('/academics/attendance/mark', data),
  getSummary: () => api.get<any>('/academics/attendance/summary'),
};

// Common Works (Habits) API
export const commonWorksApi = {
  getAll: () => api.get<{ habits: any[] }>('/common-works'),
  create: (data: { title: string; icon?: string; color?: string }) =>
    api.post<{ habit: any }>('/common-works', data),
  update: (id: string, data: { title?: string; icon?: string; color?: string }) =>
    api.put<{ habit: any }>(`/common-works/${id}`, data),
  delete: (id: string) => api.delete(`/common-works/${id}`),
  toggle: (id: string, date?: string) =>
    api.post<{ record: any; streak: number }>(`/common-works/${id}/toggle`, { date }),
};

// Social Media API
export const socialMediaApi = {
  getPlatforms: () => api.get<{ platforms: any[] }>('/social-media/platforms'),
  createPlatform: (data: { name: string; color?: string; icon?: string }) =>
    api.post<{ platform: any }>('/social-media/platforms', data),
  getRecords: (params?: { startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return api.get<{ records: any[] }>(`/social-media/records${qs ? `?${qs}` : ''}`);
  },
  logUsage: (data: { platformId: string; date: string; minutesSpent: number }) =>
    api.post<{ record: any }>('/social-media/records', data),
  getGraph: () => api.get<{ graphData: any[] }>('/social-media/graph'),
};

// Daily Works (Tasks) API
export const dailyWorksApi = {
  getAll: (filter?: string) =>
    api.get<{ tasks: any[] }>(`/daily-works${filter ? `?filter=${filter}` : ''}`),
  create: (data: { title: string; priority?: 'high' | 'medium' | 'low'; type?: 'daily' | 'permanent' }) =>
    api.post<{ task: any }>('/daily-works', data),
  toggle: (id: string, forceConfirmLowerPriority = false) =>
    api.post<{ task: any }>(`/daily-works/${id}/toggle`, { forceConfirmLowerPriority }),
  updatePriority: (id: string, priority: 'high' | 'medium' | 'low') =>
    api.patch<{ task: any }>(`/daily-works/${id}/priority`, { priority }),
  update: (id: string, data: { title?: string; priority?: 'high' | 'medium' | 'low'; type?: 'daily' | 'permanent' }) =>
    api.put<{ task: any }>(`/daily-works/${id}`, data),
  delete: (id: string) => api.delete(`/daily-works/${id}`),
  resetDaily: () => api.post<{ message: string }>('/daily-works/reset'),
  getChart: () => api.get<{ chartData: any[] }>('/daily-works/chart'),
};

// Goals API
export const goalsApi = {
  getAll: (type?: string) => api.get<{ goals: any[] }>(`/goals${type ? `?type=${type}` : ''}`),
  create: (data: any) => api.post<{ goal: any }>('/goals', data),
  update: (id: string, data: any) => api.put<{ goal: any }>(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
  addAchievement: (goalId: string, data: { text: string; date?: string }) =>
    api.post<{ goal: any }>(`/goals/${goalId}/achievements`, data),
  deleteAchievement: (goalId: string, achievementId: string) =>
    api.delete<{ goal: any }>(`/goals/${goalId}/achievements/${achievementId}`),
};

// Blog API
export const blogApi = {
  getAll: (tag?: string) => api.get<{ blogs: any[] }>(`/blogs${tag ? `?tag=${tag}` : ''}`),
  create: (data: any) => api.post<{ blog: any }>('/blogs', data),
  update: (id: string, data: any) => api.put<{ blog: any }>(`/blogs/${id}`, data),
  delete: (id: string) => api.delete(`/blogs/${id}`),
};

// Exams API
export const examsApi = {
  getAll: () => api.get<{ exams: any[] }>('/exams'),
  create: (data: any) => api.post<{ exam: any }>('/exams', data),
  update: (id: string, data: any) => api.put<{ exam: any }>(`/exams/${id}`, data),
  delete: (id: string) => api.delete(`/exams/${id}`),
};

// Dashboard Summary API
export const dashboardApi = {
  getSummary: () => api.get<any>('/dashboard/summary'),
};
