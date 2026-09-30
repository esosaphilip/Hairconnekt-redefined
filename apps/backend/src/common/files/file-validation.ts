import { BadRequestException } from '@nestjs/common';

const IMAGE_SIGNATURES: Array<{
  mime: string;
  matches: (buffer: Buffer) => boolean;
}> = [
  {
    mime: 'image/jpeg',
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  {
    mime: 'image/png',
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  {
    mime: 'image/webp',
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

const PDF_SIGNATURE = {
  mime: 'application/pdf',
  matches: (buffer: Buffer) =>
    buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF',
};

export const ensureAllowedImageUpload = (file: Express.Multer.File): void => {
  const match = IMAGE_SIGNATURES.find((entry) => entry.mime === file.mimetype);
  if (!match || !match.matches(file.buffer)) {
    throw new BadRequestException('Ungueltiges Bildformat.');
  }
};

export const ensureAllowedChatMediaUpload = (
  file: Express.Multer.File,
): void => {
  if (file.mimetype === PDF_SIGNATURE.mime) {
    if (!PDF_SIGNATURE.matches(file.buffer)) {
      throw new BadRequestException('Ungueltiges Dokumentformat.');
    }
    return;
  }

  ensureAllowedImageUpload(file);
};
