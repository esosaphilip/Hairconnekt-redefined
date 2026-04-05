// Error Message Constants
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK: {
    NO_CONNECTION: 'Keine Internetverbindung',
    TIMEOUT: 'Zeitüberschreitung bei der Anfrage',
    SERVER_UNAVAILABLE: 'Server nicht erreichbar',
  },
  
  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: 'Ungültige Anmeldedaten',
    TOKEN_EXPIRED: 'Sitzung abgelaufen',
    NO_TOKEN: 'Keine Authentifizierung',
    UNAUTHORIZED: 'Nicht autorisiert',
    FORBIDDEN: 'Zugriff verweigert',
  },
  
  // Validation errors
  VALIDATION: {
    REQUIRED_FIELD: 'Dieses Feld ist erforderlich',
    INVALID_EMAIL: 'Ungültige E-Mail-Adresse',
    INVALID_PHONE: 'Ungültige Telefonnummer',
    PASSWORD_TOO_SHORT: 'Passwort muss mindestens 8 Zeichen haben',
    PASSWORDS_DONT_MATCH: 'Passwörter stimmen nicht überein',
    INVALID_DATE: 'Ungültiges Datum',
    INVALID_TIME: 'Ungültige Uhrzeit',
    INVALID_INPUT: 'Ungültige Eingabe',
  },
  
  // Booking errors
  BOOKING: {
    NOT_FOUND: 'Termin nicht gefunden',
    ALREADY_BOOKED: 'Dieser Termin ist bereits belegt',
    INVALID_STATUS: 'Ungültiger Terminstatus',
    CANNOT_CANCEL: 'Termin kann nicht storniert werden',
    CANNOT_RESCHEDULE: 'Termin kann nicht verschoben werden',
    PAST_DATE: 'Datum liegt in der Vergangenheit',
    SERVICE_UNAVAILABLE: 'Dienst nicht verfügbar',
  },
  
  // Chat errors
  CHAT: {
    CONVERSATION_NOT_FOUND: 'Gespräch nicht gefunden',
    MESSAGE_NOT_FOUND: 'Nachricht nicht gefunden',
    CANNOT_SEND: 'Nachricht konnte nicht gesendet werden',
    PERMISSION_DENIED: 'Keine Berechtigung für dieses Gespräch',
  },
  
  // File upload errors
  FILE: {
    TOO_LARGE: 'Datei ist zu groß',
    INVALID_FORMAT: 'Ungültiges Dateiformat',
    UPLOAD_FAILED: 'Upload fehlgeschlagen',
  },
  
  // Generic errors
  GENERIC: {
    UNKNOWN_ERROR: 'Ein unbekannter Fehler ist aufgetreten',
    SOMETHING_WENT_WRONG: 'Etwas ist schiefgelaufen',
    TRY_AGAIN: 'Bitte versuche es erneut',
    CONTACT_SUPPORT: 'Bitte kontaktiere den Support',
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

// User-Friendly Error Messages
export const getUserFriendlyError = (error: any, context?: string): string => {
  const defaultMessage = ERROR_MESSAGES.GENERIC.UNKNOWN_ERROR;
  
  if (!error) return defaultMessage;
  
  // Handle HTTP status codes
  if (error.status || error.response?.status) {
    const status = error.status || error.response?.status;
    
    switch (status) {
      case 400:
        return ERROR_MESSAGES.VALIDATION.INVALID_INPUT;
      case 401:
        return ERROR_MESSAGES.AUTH.UNAUTHORIZED;
      case 403:
        return ERROR_MESSAGES.AUTH.FORBIDDEN;
      case 404:
        return context === 'booking' 
          ? ERROR_MESSAGES.BOOKING.NOT_FOUND
          : ERROR_MESSAGES.GENERIC.UNKNOWN_ERROR;
      case 409:
        return ERROR_MESSAGES.BOOKING.ALREADY_BOOKED;
      case 422:
        return ERROR_MESSAGES.VALIDATION.INVALID_INPUT;
      case 500:
        return ERROR_MESSAGES.NETWORK.SERVER_UNAVAILABLE;
      case 503:
        return ERROR_MESSAGES.NETWORK.SERVER_UNAVAILABLE;
      default:
        return defaultMessage;
    }
  }
  
  // Handle network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
    return ERROR_MESSAGES.NETWORK.NO_CONNECTION;
  }
  
  // Handle timeout errors
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return ERROR_MESSAGES.NETWORK.TIMEOUT;
  }
  
  return defaultMessage;
};
