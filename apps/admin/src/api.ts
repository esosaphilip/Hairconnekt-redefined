import axios from 'axios';

const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed === '') return 'https://api.hairconnekt.de/api/v1';
  if (/\/api\/v1$/.test(trimmed)) return trimmed;
  return `${trimmed}/api/v1`;
};

const API_BASE_URL = normalizeBaseUrl(String(import.meta.env.VITE_API_URL ?? ''));

const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Response interceptor to handle 401s globally
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;

export type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type AdminUserSummary = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
  role?: 'client' | 'provider' | 'admin';
};

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'client' | 'provider' | 'admin';
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
};

export type AdminUsersListResponse = {
  data: AdminUser[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminUsersBulkDeleteResponse = {
  deleted: number;
  skippedAdmin: number;
  notFound: number;
  alreadyDeleted: number;
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
  hasIdDocument?: boolean;
  user?: AdminUserSummary | null;
};

export type AdminSessionResponse = {
  user: AdminUserSummary;
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

export async function getUsers(params?: {
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}): Promise<AdminUsersListResponse> {
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;
  const includeDeleted = params?.includeDeleted ?? false;
  const res = await api.get(
    `/admin/users?limit=${limit}&offset=${offset}&includeDeleted=${includeDeleted ? 1 : 0}`,
  );
  return res.data as AdminUsersListResponse;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

export async function bulkDeleteUsers(
  ids: string[],
): Promise<AdminUsersBulkDeleteResponse> {
  const res = await api.post('/admin/users/bulk-delete', { ids });
  return res.data as AdminUsersBulkDeleteResponse;
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
): Promise<AdminSessionResponse> {
  const res = await api.post('/auth/admin-login', { identifier, password });
  return res.data as AdminSessionResponse;
}

export async function getAdminSession(): Promise<AdminSessionResponse> {
  const res = await api.get('/auth/admin-session');
  return res.data as AdminSessionResponse;
}

export async function adminLogout(): Promise<void> {
  await api.post('/auth/admin-logout');
}

export function getAdminProviderIdDocumentUrl(providerId: string): string {
  return buildApiUrl(`/admin/providers/${providerId}/id-document`);
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
