export function identityMethodLabel(
  method: 'video_call' | 'id_upload' | null | undefined,
): string {
  switch (method) {
    case 'video_call':
      return 'Videocall';
    case 'id_upload':
      return 'Ausweis-Upload';
    default:
      return '';
  }
}

export function formatDeDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('de-DE');
}
