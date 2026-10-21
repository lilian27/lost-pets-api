export interface DuplicateKeyError {
  code: 11000;
  keyPattern?: Record<string, unknown>;
}

export function isDuplicateKey(err: unknown): err is DuplicateKeyError {
  return (err as { code?: number } | null)?.code === 11000;
}
