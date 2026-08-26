import type { Lang } from '@/contexts/LanguageContext';
import { TRANSLATIONS } from '@/contexts/LanguageContext';

type TransDict = typeof TRANSLATIONS;
type TransKey = keyof TransDict;

export function pickError(key: TransKey, lang: Lang = 'de'): string {
  const entry = (TRANSLATIONS as Record<TransKey, { de: string; en: string } | undefined>)[key];
  return entry?.[lang] ?? entry?.de ?? String(key);
}

export const ERROR_KEYS = {
  NETWORK: {
    NO_CONNECTION: 'errorNetworkNoConnection' as TransKey,
    TIMEOUT: 'errorNetworkTimeout' as TransKey,
    SERVER_UNAVAILABLE: 'errorNetworkServerUnavailable' as TransKey,
  },
  AUTH: {
    INVALID_CREDENTIALS: 'errorAuthInvalidCredentials' as TransKey,
    TOKEN_EXPIRED: 'errorAuthTokenExpired' as TransKey,
    NO_TOKEN: 'errorAuthNoToken' as TransKey,
    UNAUTHORIZED: 'errorAuthUnauthorized' as TransKey,
    FORBIDDEN: 'errorAuthForbidden' as TransKey,
  },
  VALIDATION: {
    REQUIRED_FIELD: 'errorValidationRequiredField' as TransKey,
    INVALID_EMAIL: 'errorValidationInvalidEmail' as TransKey,
    INVALID_PHONE: 'errorValidationInvalidPhone' as TransKey,
    PASSWORD_TOO_SHORT: 'errorValidationPasswordTooShort' as TransKey,
    PASSWORDS_DONT_MATCH: 'errorValidationPasswordsDontMatch' as TransKey,
    INVALID_DATE: 'errorValidationInvalidDate' as TransKey,
    INVALID_TIME: 'errorValidationInvalidTime' as TransKey,
    INVALID_INPUT: 'errorValidationInvalidInput' as TransKey,
  },
  BOOKING: {
    NOT_FOUND: 'errorBookingNotFound' as TransKey,
    ALREADY_BOOKED: 'errorBookingAlreadyBooked' as TransKey,
    INVALID_STATUS: 'errorBookingInvalidStatus' as TransKey,
    CANNOT_CANCEL: 'errorBookingCannotCancel' as TransKey,
    CANNOT_RESCHEDULE: 'errorBookingCannotReschedule' as TransKey,
    PAST_DATE: 'errorBookingPastDate' as TransKey,
    SERVICE_UNAVAILABLE: 'errorBookingServiceUnavailable' as TransKey,
  },
  CHAT: {
    CONVERSATION_NOT_FOUND: 'errorChatConversationNotFound' as TransKey,
    MESSAGE_NOT_FOUND: 'errorChatMessageNotFound' as TransKey,
    CANNOT_SEND: 'errorChatCannotSend' as TransKey,
    PERMISSION_DENIED: 'errorChatPermissionDenied' as TransKey,
  },
  FILE: {
    TOO_LARGE: 'errorFileTooLarge' as TransKey,
    INVALID_FORMAT: 'errorFileInvalidFormat' as TransKey,
    UPLOAD_FAILED: 'errorFileUploadFailed' as TransKey,
  },
  GENERIC: {
    UNKNOWN_ERROR: 'errorGenericUnknownError' as TransKey,
    SOMETHING_WENT_WRONG: 'errorGenericSomethingWentWrong' as TransKey,
    TRY_AGAIN: 'errorGenericTryAgain' as TransKey,
    CONTACT_SUPPORT: 'errorGenericContactSupport' as TransKey,
  },
} as const;

// Error Types
export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  BOOKING: 'booking',
  CHAT: 'chat',
  FILE: 'file',
  GENERIC: 'generic',
} as const;

// Error Severity Levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const getUserFriendlyError = (error: unknown, lang: Lang = 'de', context?: string): string => {
  const defaultMessage = pickError(ERROR_KEYS.GENERIC.UNKNOWN_ERROR, lang);

  if (!error) return defaultMessage;

  if (error && typeof error === 'object') {
    const err = error as { status?: number; response?: { status?: number }; code?: string; message?: string };
    const status = err.status ?? err.response?.status;

    if (typeof status === 'number') {
      switch (status) {
        case 400:
          return pickError(ERROR_KEYS.VALIDATION.INVALID_INPUT, lang);
        case 401:
          return pickError(ERROR_KEYS.AUTH.UNAUTHORIZED, lang);
        case 403:
          return pickError(ERROR_KEYS.AUTH.FORBIDDEN, lang);
        case 404:
          return context === 'booking'
            ? pickError(ERROR_KEYS.BOOKING.NOT_FOUND, lang)
            : pickError(ERROR_KEYS.GENERIC.UNKNOWN_ERROR, lang);
        case 409:
          return pickError(ERROR_KEYS.BOOKING.ALREADY_BOOKED, lang);
        case 422:
          return pickError(ERROR_KEYS.VALIDATION.INVALID_INPUT, lang);
        case 500:
        case 503:
          return pickError(ERROR_KEYS.NETWORK.SERVER_UNAVAILABLE, lang);
        default:
          return defaultMessage;
      }
    }

    if (err.code === 'NETWORK_ERROR' || (typeof err.message === 'string' && err.message.includes('network'))) {
      return pickError(ERROR_KEYS.NETWORK.NO_CONNECTION, lang);
    }

    if (err.code === 'TIMEOUT' || (typeof err.message === 'string' && err.message.includes('timeout'))) {
      return pickError(ERROR_KEYS.NETWORK.TIMEOUT, lang);
    }
  }

  return defaultMessage;
};
