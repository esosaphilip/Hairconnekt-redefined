import { apiFetch, apiJson } from '@/services/apiClient';

export async function getFavouriteIds(): Promise<string[]> {
  try {
    const data = await apiJson<any>('/favourites', { auth: true });
    const list: any[] = data.data ?? data ?? [];
    // Extract provider IDs from the response
    return list.map((f: any) => f.id ?? f.providerId ?? f.provider?.id).filter(Boolean);
  } catch {
    return [];
  }
}

export async function addFavourite(providerId: string): Promise<boolean> {
  try {
    // DOC08 Section 11: POST /favourites/:providerId — no body
    const res = await apiFetch(`/favourites/${providerId}`, {
      auth: true,
      method: 'POST',
    });
    return res.ok || res.status === 409; // 409 = already favourited, still OK
  } catch {
    return false;
  }
}

export async function removeFavourite(providerId: string): Promise<boolean> {
  try {
    // DOC08 Section 11: DELETE /favourites/:providerId
    const res = await apiFetch(`/favourites/${providerId}`, {
      auth: true,
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}
