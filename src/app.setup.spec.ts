import { parseCorsOrigin } from './app.setup';

describe('parseCorsOrigin', () => {
  it('allows any origin when unset', () => {
    expect(parseCorsOrigin(undefined)).toBe(true);
  });

  it('splits a comma separated list', () => {
    expect(parseCorsOrigin('http://a.test, http://b.test')).toEqual([
      'http://a.test',
      'http://b.test',
    ]);
  });
});
