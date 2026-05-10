import axios from 'axios';

const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed === '') return 'https://api.hairconnekt.de/api/v1';
  if (/\/api\/v1$/.test(trimmed)) return trimmed;
  return `${trimmed}/api/v1`;
};

const api = axios.create({
  baseURL: normalizeBaseUrl(String(import.meta.env.VITE_API_URL ?? '')),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor to handle 401s globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('admin_token');
    }
    return Promise.reject(error);
  }
);

export default api;

export type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type AdminUserSummary = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
};

export type AdminProvider = {
  id: string;
  status: ProviderStatus;
  isEmailVerified?: boolean;
  createdAt: string;
  city?: string | null;
  providerType?: string | null;
  businessName?: string | null;
  avatarUrl?: string | null;
  idDocumentUrl?: string | null;
  user?: AdminUserSummary | null;
};

export type Category = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type PopularStyle = {
  id: string;
  name: string;
  imageUrl: string | null;
  emoji: string;
  colorHex: string;
  sortOrder: number;
  isActive: boolean;
};

export type CreatePopularStyleInput = {
  name: string;
  emoji?: string;
  colorHex?: string;
  sortOrder?: number;
};

export type UpdatePopularStyleInput = Partial<CreatePopularStyleInput> & {
  isActive?: boolean;
};

export async function getPopularStyles(): Promise<PopularStyle[]> {
  const res = await api.get('/admin/popular-styles');
  return res.data;
}

export async function createPopularStyle(
  data: CreatePopularStyleInput,
): Promise<PopularStyle> {
  const res = await api.post('/admin/popular-styles', data);
  return res.data;
}

export async function updatePopularStyle(
  id: string,
  data: UpdatePopularStyleInput,
): Promise<PopularStyle> {
  const res = await api.patch(`/admin/popular-styles/${id}`, data);
  return res.data;
}

export async function deletePopularStyle(id: string): Promise<void> {
  await api.delete(`/admin/popular-styles/${id}`);
}

export async function uploadStyleImage(
  id: string,
  file: File,
): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('styleImage', file);
  const res = await api.post(`/admin/popular-styles/${id}/image`, formData);
  return res.data;
}

export async function deleteStyleImage(id: string): Promise<void> {
  await api.delete(`/admin/popular-styles/${id}/image`);
}

export async function getProviders(
  status?: ProviderStatus,
): Promise<AdminProvider[]> {
  const url = status ? `/admin/providers?status=${status}` : '/admin/providers';
  const res = await api.get(url);
  return res.data as AdminProvider[];
}

export async function getProviderById(id: string): Promise<AdminProvider> {
  const res = await api.get(`/admin/providers/${id}`);
  return res.data as AdminProvider;
}

export async function approveProvider(id: string) {
  const res = await api.patch(`/admin/providers/${id}/approve`);
  return res.data;
}

export async function rejectProvider(id: string, reason?: string) {
  const res = await api.patch(`/admin/providers/${id}/reject`, { reason });
  return res.data;
}

export async function suspendProvider(id: string, reason?: string) {
  const res = await api.patch(`/admin/providers/${id}/suspend`, { reason });
  return res.data;
}

export async function getCategories(): Promise<Category[]> {
  const res = await api.get('/admin/categories');
  return res.data as Category[];
}

export async function createCategory(
  data: Omit<Category, 'id'>,
): Promise<Category> {
  const res = await api.post('/admin/categories', data);
  return res.data as Category;
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<Category, 'id'>>,
): Promise<Category> {
  const res = await api.patch(`/admin/categories/${id}`, data);
  return res.data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/admin/categories/${id}`);
}

export async function adminLogin(
  identifier: string,
  password: string,
): Promise<{ accessToken: string }> {
  const res = await api.post('/auth/admin-login', { identifier, password });
  return res.data as { accessToken: string };
}

export async function getAdminStats(): Promise<{
  pendingProviders: number;
  approvedProviders: number;
  activeCategories: number;
  activePopularStyles: number;
}> {
  const res = await api.get('/admin/stats');
  return res.data;
}
