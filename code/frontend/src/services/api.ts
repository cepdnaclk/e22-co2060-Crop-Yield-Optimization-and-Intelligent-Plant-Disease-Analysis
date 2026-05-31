/**
 * Frontend API Service Layer
 * Configures the Axios instance, HTTP interceptors for JWT auth/error handling,
 * and exports organized objects for User, Farm, and Yield endpoints.
 */
import axios from 'axios';
import { clearAuthData } from '../utils/authUtils';

// Base API URL - use relative path in development to work with Vite proxy
// In production, use the full API URL from environment variable
const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '')
  : ''; // Empty string means use relative paths (works in both dev and prod)

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
});

// Set default JSON content type (will be overridden for FormData)
api.defaults.headers.common['Content-Type'] = 'application/json';

const extractChatbotReply = (payload: any): string => {
  if (typeof payload === 'string') {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return 'I received your message, but the chatbot response could not be read.';
  }

  const candidateValues = [
    payload.reply,
    payload.message,
    payload.text,
    payload.output,
    payload.answer,
    payload.response,
  ];

  for (const value of candidateValues) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  if (Array.isArray(payload) && payload.length > 0) {
    return extractChatbotReply(payload[0]);
  }

  if (payload.data) {
    return extractChatbotReply(payload.data);
  }

  return 'I received your message, but the chatbot response could not be read.';
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Don't override Content-Type if FormData is being sent
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    const authData = localStorage.getItem('agriconnect_auth');
    if (authData) {
      const { token } = JSON.parse(authData);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Avoid triggering global unauthenticated redirects if the user is currently trying to log in
    if (error.config?.url?.includes('/api/users/login')) {
      return Promise.reject(error);
    }

    // 403 with emailUnverified flag — let the page/component handle showing the modal
    if (error.response?.status === 403 && error.response?.data?.emailUnverified) {
      return Promise.reject(error);
    }

    if (error.response?.status === 403 || error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to root login page
      clearAuthData();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// User API endpoints
export const userAPI = {
  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    nic: string;
    address: string;
    division: string;
    district: string;
    role: 'farmer' | 'admin';
    isBlocked?: boolean;
    image?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => {
    const response = await api.post('/api/users', userData);
    return response.data;
  },

  login: async (credentials: { email: string; password: string; intendedRole?: string }) => {
    try {
      const response = await api.post('/api/users/login', credentials);
      return response.data;
    } catch (error: any) {
      // Re-throw with better error handling
      throw error;
    }
  },

  fetchProfile: async () => {
    const response = await api.get('/api/users/profile');
    return response.data;
  },

  updateProfile: async (userData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    district?: string;
    division?: string;
    image?: string;
  }) => {
    const response = await api.put('/api/users/profile', userData);
    return response.data;
  },

  getRecentFarmers: async (limit?: number) => {
    const response = await api.get(`/api/users/recent-farmers`, {
      params: limit ? { limit } : {}
    });
    return response.data;
  },

  sendOtp: async (email: string, firstName?: string) => {
    const response = await api.post('/api/users/send-otp', { email, firstName });
    return response.data;
  },

  verifyOtp: async (email: string, code: string) => {
    const response = await api.post('/api/users/verify-otp', { email, code });
    return response.data;
  },

  changeEmail: async (newEmail: string) => {
    const response = await api.post('/api/users/change-email', { newEmail });
    return response.data;
  },
};

// Farm API endpoints
export const farmAPI = {
  createFarm: async (farmData: any) => {
    const response = await api.post('/api/farms', farmData);
    return response.data;
  },

  updateFarm: async (farmId: string, farmData: any) => {
    const response = await api.put(`/api/farms/${farmId}`, farmData);
    return response.data;
  },

  deleteFarm: async (farmId: string) => {
    const response = await api.delete(`/api/farms/${farmId}`);
    return response.data;
  },

  addHarvestAndPoints: async (harvestData: {
    farmId: string;
    season: string;
    year: string;
    harvestQty: number;
  }) => {
    const response = await api.post('/api/farms/addharvestandpoints', harvestData);
    return response.data;
  },

  recalculatePoints: async () => {
    const response = await api.post('/api/farms/recalculate-points');
    return response.data;
  },

  getAllFarms: async () => {
    const response = await api.get('/api/farms');
    return response.data;
  },

  getFarmById: async (farmId: string) => {
    const response = await api.get(`/api/farms/${farmId}`);
    return response.data;
  },

  getHarvestHistory: async () => {
    const response = await api.get('/api/farms/harvests');
    return response.data;
  },

  getFarmerReport: async () => {
    const response = await api.get('/api/farms/my-report');
    return response.data;
  },

  getAllCrops: async () => {
    const response = await api.get('/api/farms/crops/list');
    return response.data;
  },
};

// Average Yield API endpoints
export const avgYieldAPI = {
  getAll: async () => {
    const response = await api.get('/api/avgYields');
    return response.data;
  },

  create: async (yieldData: {
    crop: string;
    location: string;
    avgYield: number;
  }) => {
    const response = await api.post('/api/avgYields', yieldData);
    return response.data;
  },
};

// Inquiry API endpoints
export const inquiryAPI = {
  createInquiry: async (inquiryData: {
    subject: string;
    message: string;
    farmerId?: string;
  }) => {
    const response = await api.post('/api/inquiries', inquiryData);
    return response.data;
  },

  getAllInquiries: async () => {
    const response = await api.get('/api/inquiries');
    return response.data;
  },

  updateStatus: async (inquiryId: string, status: string) => {
    const response = await api.put(`/api/inquiries/${inquiryId}/status`, { status });
    return response.data;
  },

  uploadDocuments: async (inquiryId: string, files: FileList | File[]) => {
    const formData = new FormData();
    
    // Handle both FileList and File array
    for (let i = 0; i < files.length; i++) {
      formData.append('documents', files[i]);
    }

    const response = await api.post(`/api/inquiries/${inquiryId}/documents`, formData);
    return response.data;
  },

  downloadDocument: async (inquiryId: string, documentIndex: number) => {
    const response = await api.get(`/api/inquiries/${inquiryId}/documents/${documentIndex}`, {
      responseType: 'blob',
    });
    return response;
  },

  deleteDocument: async (inquiryId: string, documentIndex: number) => {
    const response = await api.delete(`/api/inquiries/${inquiryId}/documents/${documentIndex}`);
    return response.data;
  },
};

export const chatbotAPI = {
  sendMessage: async (message: string, context?: Record<string, unknown>) => {
    const response = await api.post('/api/chatbot', {
      message,
      text: message,
      query: message,
      input: message,
      ...context,
    });

    return {
      raw: response.data,
      reply: extractChatbotReply(response.data),
    };
  },
};

// Export the axios instance for custom requests
export default api;
