import { registerDecorator, ValidationOptions } from 'class-validator';
import { MAX_PHOTO_BYTES } from './constants';

const DATA_URL_RE =
  /^data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export function base64ImageBytes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = DATA_URL_RE.exec(value);
  if (!match) return null;
  return Buffer.from(match[2], 'base64').length;
}

export function IsBase64Image(
  maxBytes: number = MAX_PHOTO_BYTES,
  options?: ValidationOptions,
) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isBase64Image',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a base64 data URL image (png, jpeg, gif or webp) of at most ${
          maxBytes / 1024 / 1024
        }MB`,
        ...options,
      },
      validator: {
        validate(value: unknown) {
          const bytes = base64ImageBytes(value);
          return bytes !== null && bytes > 0 && bytes <= maxBytes;
        },
      },
    });
}
