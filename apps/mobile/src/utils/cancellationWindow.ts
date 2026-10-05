export type CancellationWindowHours = 24 | 48 | 72;

export function cancellationWindowHours(policy: unknown): CancellationWindowHours {
  if (policy === '24h') return 24;
  if (policy === '48h') return 48;
  if (policy === '72h') return 72;
  return 24;
}

interface CancellationWindowInput {
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  policy: unknown;
  now: Date;
}

export function isInsideCancellationWindow(input: CancellationWindowInput): boolean {
  const { scheduledDate, scheduledTime, policy, now } = input;
  if (!scheduledDate || typeof scheduledDate !== 'string') return false;
  if (!scheduledTime || typeof scheduledTime !== 'string') return false;

  const dateParts = scheduledDate.split('-');
  const timeParts = scheduledTime.split(':');
  if (dateParts.length < 3 || timeParts.length < 2) return false;

  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  const day = Number(dateParts[2]);
  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return false;
  }

  const appointmentDate = new Date(year, month - 1, day, hours, minutes);
  const diffMs = appointmentDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const windowHours = cancellationWindowHours(policy);
  return diffHours > 0 && diffHours < windowHours;
}
