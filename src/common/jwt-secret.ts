import { ConfigService } from '@nestjs/config';

export const DEV_JWT_SECRET = 'dev-secret-change-me';

export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (secret) return secret;
  if (config.get<string>('NODE_ENV') === 'production') {
    throw new Error('JWT_SECRET must be set when NODE_ENV=production');
  }
  return DEV_JWT_SECRET;
}
