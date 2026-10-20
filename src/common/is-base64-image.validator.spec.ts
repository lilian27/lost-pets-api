import { validate } from 'class-validator';
import { base64ImageBytes, IsBase64Image } from './is-base64-image.validator';

class Sample {
  @IsBase64Image(10)
  photo: unknown;
}

const check = async (photo: unknown) => {
  const s = new Sample();
  s.photo = photo;
  return (await validate(s)).length === 0;
};

describe('IsBase64Image', () => {
  it('computes decoded byte size of data URLs', () => {
    expect(base64ImageBytes('data:image/png;base64,AAAA')).toBe(3);
    expect(base64ImageBytes('data:image/jpeg;base64,AAAA')).toBe(3);
    expect(base64ImageBytes('AAAA')).toBeNull();
    expect(base64ImageBytes('data:text/plain;base64,AAAA')).toBeNull();
    expect(base64ImageBytes(42)).toBeNull();
  });

  it('validates size limits', async () => {
    expect(await check('data:image/webp;base64,AAAA')).toBe(true);
    expect(await check('data:image/gif;base64,' + 'A'.repeat(16))).toBe(false);
    expect(await check('data:image/png;base64,A')).toBe(false);
    expect(await check(undefined)).toBe(false);
  });
});
