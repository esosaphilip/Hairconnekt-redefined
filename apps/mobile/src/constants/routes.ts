// App Route Configuration Constants
export const APP_ROUTES = {
  // Auth routes
  AUTH: {
    LOGIN: '/(auth)/login',
    REGISTER: '/(auth)/register',
    PASSWORD_RESET: '/(auth)/password-reset',
  },
  
  // Client routes
  CLIENT: {
    HOME: '/(client)',
    APPOINTMENTS: '/(client)/appointments',
    APPOINTMENT_DETAIL: '/(client)/appointments/[id]',
    APPOINTMENT_CANCEL: '/(client)/appointments/cancel/[id]',
    APPOINTMENT_RESCHEDULE: '/(client)/appointments/reschedule/[id]',
    SEARCH: '/(client)/search',
    FAVOURITES: '/(client)/favourites',
    PROFILE: '/(client)/profile',
    REVIEWS: '/(client)/profile/reviews',
    CHAT: '/(client)/chat',
    CHAT_DETAIL: '/(client)/chat/[id]',
    PROVIDER_DETAIL: '/(client)/provider/[id]',
    ADDRESSES: '/(client)/addresses',
    BOOKING: '/(client)/booking',
    BOOKING_CONFIRM: '/(client)/booking/confirm',
    BOOKING_SUCCESS: '/(client)/booking/success',
  },
  
  // Provider routes
  PROVIDER: {
    HOME: '/(provider)',
    APPOINTMENTS: '/(provider)/appointments',
    APPOINTMENT_DETAIL: '/(provider)/appointments/[id]',
    CALENDAR: '/(provider)/calendar',
    AVAILABILITY: '/(provider)/availability',
    BLOCK_TIME: '/(provider)/block-time',
    SERVICES: '/(provider)/services',
    PORTFOLIO: '/(provider)/portfolio',
    REVIEWS: '/(provider)/reviews',
    PROFILE: '/(provider)/profile',
    SETTINGS: '/(provider)/settings',
    CHAT: '/(provider)/chat',
    CHAT_DETAIL: '/(provider)/chat/[id]',
    BOOKING_REQUEST: '/(provider)/booking-request/[id]',
    PENDING: '/(provider)/pending',
    REGISTER: '/(provider)/register',
  },
  
  // Shared routes
  SHARED: {
    NOTIFICATIONS: '/(shared)/notifications',
    CHAT: '/(shared)/chat',
    CHAT_DETAIL: '/(shared)/chat/[id]',
    ADDRESSES: '/(shared)/addresses',
  },
} as const;

// Route Parameters
export const ROUTE_PARAMS = {
  ID: '[id]',
  BOOKING_ID: '[id]',
  CONVERSATION_ID: '[id]',
  PROVIDER_ID: '[id]',
  MESSAGE_ID: '[id]',
} as const;

// Query Parameters
export const QUERY_PARAMS = {
  TAB: 'tab',
  STATUS: 'status',
  PAGE: 'page',
  LIMIT: 'limit',
  SEARCH: 'search',
  FILTER: 'filter',
  SORT: 'sort',
  DATE: 'date',
  ROLE: 'role',
} as const;

// Tab Names
export const TAB_NAMES = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  SERVICES: 'services',
  PORTFOLIO: 'portfolio',
  REVIEWS: 'reviews',
  INFO: 'info',
  AVAILABILITY: 'availability',
  SETTINGS: 'settings',
} as const;
