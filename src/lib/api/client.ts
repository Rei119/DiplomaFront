import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),

  register: (username: string, password: string, role: string) =>
    api.post('/auth/register', { username, password, role }),

  me: () => api.get('/auth/me'),

  // Profile management endpoints
  updateProfile: (data: { username?: string; email?: string; full_name?: string }) =>
    api.put('/users/me', data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/users/me/password', data),
};

// Exams API
export const examsAPI = {
  getAll: () => api.get('/exams/'),
  getById: (id: string) => api.get(`/exams/${id}`),
  getByCode: (code: string) => api.get(`/exams/by-code/${code.toUpperCase()}`),

  create: (data: any) =>
    api.post('/exams/', {
      title: data.title,
      description: data.description || '',
      duration_minutes: Number(data.time_limit) || Number(data.duration_minutes) || 60,
      passing_score: Number(data.passing_score) || 70,
      max_tab_switches: Number(data.max_tab_switches) || 3,
      questions: data.questions || [],
      status: data.status || 'draft',
      exam_code: data.exam_code || null,
    }),

  update: (id: string, data: any) =>
    api.put(`/exams/${id}`, {
      title: data.title,
      description: data.description || '',
      duration_minutes: Number(data.time_limit) || Number(data.duration_minutes) || 60,
      passing_score: Number(data.passing_score) || 70,
      max_tab_switches: Number(data.max_tab_switches) || 3,
      questions: data.questions || [],
      status: data.status || 'draft',
      exam_code: data.exam_code || null,
    }),

  delete: (id: string) => api.delete(`/exams/${id}`),
};

// Submissions API
export const submissionsAPI = {
  getAll: () => api.get('/submissions/'),
  getById: (id: string) => api.get(`/submissions/${id}`),

  submit: (examId: string, data: {
    answers: { question_id: string; answer: string | string[] }[];
    tab_switches: number;
    start_time: number;
    student_id_number?: string;
    student_major?: string;
  }) => {
    const answersDict: Record<string, string> = {};
    for (const a of data.answers) {
      answersDict[a.question_id] = Array.isArray(a.answer)
        ? a.answer.join(', ')
        : (a.answer || '');
    }
    return api.post(`/submissions/exams/${examId}/submit`, {
      answers: answersDict,
      tab_switches: data.tab_switches ?? 0,
      behavior_score: 100,
      start_time: data.start_time,
      submit_time: Date.now(),
      student_id_number: data.student_id_number || '',
      student_major: data.student_major || '',
    });
  },

  updateScore: (id: string, score: number) =>
    api.patch(`/submissions/${id}/score`, { score }),

  aiDetect: (id: string, questionId: string) =>
    api.post(`/submissions/${id}/ai-detect`, { question_id: questionId }),
};

// Code execution API
export const codeAPI = {
  execute: (code: string, language: string) =>
    api.post('/code/execute', { code, language }),
};

export default api;