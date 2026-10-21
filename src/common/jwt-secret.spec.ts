import { ConfigService } from '@nestjs/config';
import { DEV_JWT_SECRET, resolveJwtSecret } from './jwt-secret';

const config = (env: Record<string, string>) =>
  ({ get: (key: string) => env[key] }) as unknown as ConfigService;

describe('resolveJwtSecret', () => {
  it('uses JWT_SECRET when set', () => {
    expect(
      resolveJwtSecret(
        config({ JWT_SECRET: 's3cret', NODE_ENV: 'production' }),
      ),
    ).toBe('s3cret');
  });

  it('falls back to the dev secret outside production', () => {
    expect(resolveJwtSecret(config({}))).toBe(DEV_JWT_SECRET);
  });

  it('refuses to start in production without a secret', () => {
    expect(() => resolveJwtSecret(config({ NODE_ENV: 'production' }))).toThrow(
      'JWT_SECRET must be set',
    );
  });
});
