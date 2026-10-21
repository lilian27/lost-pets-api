const envNumber = (name: string, fallback: number) => () =>
  Number(process.env[name] ?? fallback);

export const THROTTLE_TTL_MS = 60_000;

/** Global per-IP limit for every route. */
export const DEFAULT_THROTTLE = {
  name: 'default',
  ttl: THROTTLE_TTL_MS,
  limit: envNumber('THROTTLE_LIMIT', 300),
};

/** Stricter per-IP limit for auth, comment creation and flagging. */
export const STRICT_THROTTLE = {
  default: {
    ttl: THROTTLE_TTL_MS,
    limit: envNumber('THROTTLE_STRICT_LIMIT', 30),
  },
};
