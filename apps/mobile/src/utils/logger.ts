const sanitizeDebugArg = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (value && typeof value === 'object') {
    const maybeError = value as {
      message?: unknown;
      status?: unknown;
      code?: unknown;
      name?: unknown;
    };
    const parts = [
      typeof maybeError.name === 'string' ? maybeError.name : null,
      typeof maybeError.message === 'string' ? maybeError.message : null,
      typeof maybeError.status === 'number' ? `status=${maybeError.status}` : null,
      typeof maybeError.code === 'string' ? `code=${maybeError.code}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' ');
    }

    return '[object]';
  }

  return String(value);
};

const sanitizeDebugArgs = (args: unknown[]): string[] => args.map(sanitizeDebugArg);

export const debugLog = (...args: unknown[]): void => {
  if (__DEV__) {
    console.log(...sanitizeDebugArgs(args));
  }
};

export const debugError = (...args: unknown[]): void => {
  if (__DEV__) {
    console.error(...sanitizeDebugArgs(args));
  }
};
