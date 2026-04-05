// API Configuration Constants
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_OTP: '/auth/verify-otp',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // User endpoints
  USERS: {
    ME: '/users/me',
    ADDRESSES: '/users/me/addresses',
  },
  
  // Provider endpoints
  PROVIDERS: {
    ME: '/providers/me',
    SERVICES: '/providers/me/services',
    AVAILABILITY: '/providers/me/availability',
    BLOCKS: '/providers/me/blocks',
    PORTFOLIO: '/providers/me/portfolio',
    REVIEWS: '/providers/me/reviews',
    SLOTS: '/providers/:id/slots',
  },
  
  // Booking endpoints
  BOOKINGS: {
    LIST: '/bookings',
    DETAIL: '/bookings/:id',
    CREATE: '/bookings',
    CONFIRM: '/bookings/:id/confirm',
    START: '/bookings/:id/start',
    COMPLETE: '/bookings/:id/complete',
    CANCEL: '/bookings/:id/cancel',
    RESCHEDULE: '/bookings/:id/reschedule',
  },
  
  // Chat endpoints
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    MESSAGES: '/chat/conversations/:id/messages',
    SEND_MESSAGE: '/chat/conversations/:id/messages',
    MARK_READ: '/chat/conversations/:id/messages/:messageId/read',
    MARK_ALL_READ: '/chat/conversations/:id/read',
  },
  
  // Other endpoints
  FAVOURITES: '/favourites',
  NOTIFICATIONS: '/notifications',
  REVIEWS: '/reviews',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Request Timeout (in milliseconds)
export const REQUEST_TIMEOUT = 30000;

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
} as const;
