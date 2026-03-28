// Centralized API base URL — import this in every screen instead of defining a local constant.
// Set EXPO_PUBLIC_API_URL=https://api.hairconnekt.de/api/v1 in your production .env / EAS secrets.
// No localhost/IP fallback — fail loudly in dev so misconfiguration is caught immediately.
export const API = process.env.EXPO_PUBLIC_API_URL!;
