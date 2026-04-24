import { tokenStorage } from './token-storage';
import { API } from './api';

export async function getFavouriteIds(): Promise<string[]> {
  try {
    const token = await tokenStorage.getAccessToken();
    const res = await fetch(`${API}/favourites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list: any[] = data.data ?? data ?? [];
    // Extract provider IDs from the response
    return list.map((f: any) => f.id ?? f.providerId ?? f.provider?.id).filter(Boolean);
  } catch {
    return [];
  }
}

export async function addFavourite(providerId: string): Promise<boolean> {
  try {
    const token = await tokenStorage.getAccessToken();
    // DOC08 Section 11: POST /favourites/:providerId — no body
    const res = await fetch(`${API}/favourites/${providerId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 409; // 409 = already favourited, still OK
  } catch {
    return false;
  }
}

export async function removeFavourite(providerId: string): Promise<boolean> {
  try {
    const token = await tokenStorage.getAccessToken();
    // DOC08 Section 11: DELETE /favourites/:providerId
    const res = await fetch(`${API}/favourites/${providerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
