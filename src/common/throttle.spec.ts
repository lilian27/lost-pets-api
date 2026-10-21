import { DEFAULT_THROTTLE, STRICT_THROTTLE } from './throttle';

describe('throttle limits', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('reads limits from the environment', () => {
    process.env.THROTTLE_LIMIT = '7';
    process.env.THROTTLE_STRICT_LIMIT = '3';
    expect(DEFAULT_THROTTLE.limit()).toBe(7);
    expect(STRICT_THROTTLE.default.limit()).toBe(3);
  });

  it('falls back to sane defaults', () => {
    delete process.env.THROTTLE_LIMIT;
    delete process.env.THROTTLE_STRICT_LIMIT;
    expect(DEFAULT_THROTTLE.limit()).toBe(300);
    expect(STRICT_THROTTLE.default.limit()).toBe(30);
  });
});
