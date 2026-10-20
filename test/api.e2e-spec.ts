import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../src/users/user.schema';
import { Publication } from '../src/publications/publication.schema';
import {
  BIG_PNG,
  closeTestApp,
  createTestApp,
  newUser,
  petPayload,
  PNG,
  TestCtx,
} from './helpers';

describe('Lost Pets API (integration)', () => {
  let ctx: TestCtx;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function register(overrides: Record<string, string> = {}) {
    const payload = newUser(overrides);
    const res = await ctx
      .http()
      .post('/auth/register')
      .send(payload)
      .expect(201);
    return {
      ...payload,
      token: res.body.accessToken as string,
      id: res.body.user.id as string,
    };
  }

  async function createPet(
    token: string,
    overrides: Record<string, unknown> = {},
  ) {
    const res = await ctx
      .http()
      .post('/pets')
      .set(auth(token))
      .send(petPayload(overrides))
      .expect(201);
    return res.body;
  }

  async function publish(
    token: string,
    petId: string,
    commune = 'Providencia',
  ) {
    const res = await ctx
      .http()
      .post('/publications')
      .set(auth(token))
      .send({ petId, commune, description: 'Lost near the park' })
      .expect(201);
    return res.body;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  describe('health & docs', () => {
    it('GET / returns ok', async () => {
      await ctx.http().get('/').expect(200, { status: 'ok' });
    });

    it('serves the Swagger document', async () => {
      const res = await ctx.http().get('/docs-json').expect(200);
      expect(Object.keys(res.body.paths)).toEqual(
        expect.arrayContaining([
          '/auth/register',
          '/pets',
          '/publications',
          '/publications/{id}/status',
          '/publications/{id}/comments',
          '/comments/{id}/flag',
          '/notifications/unread-count',
        ]),
      );
    });
  });

  describe('auth & users', () => {
    it('registers, logs in and returns the private profile', async () => {
      const u = await register();
      const login = await ctx
        .http()
        .post('/auth/login')
        .send({ email: u.email.toUpperCase(), password: u.password })
        .expect(200);
      expect(login.body.user).toMatchObject({
        alias: u.alias,
        email: u.email,
        phone: u.phone,
        name: u.name,
      });
      expect(login.body.user.passwordHash).toBeUndefined();
      const me = await ctx
        .http()
        .get('/users/me')
        .set(auth(login.body.accessToken))
        .expect(200);
      expect(me.body.alias).toBe(u.alias);
    });

    it('rejects wrong credentials and unknown emails', async () => {
      const u = await register();
      await ctx
        .http()
        .post('/auth/login')
        .send({ email: u.email, password: 'wrongpass' })
        .expect(401);
      await ctx
        .http()
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever' })
        .expect(401);
    });

    it('enforces required fields and formats', async () => {
      const res = await ctx.http().post('/auth/register').send({}).expect(400);
      const msg = (res.body.message as string[]).join(' ');
      for (const f of [
        'alias',
        'name',
        'email',
        'phone',
        'commune',
        'password',
      ]) {
        expect(msg).toContain(f);
      }
      await ctx
        .http()
        .post('/auth/register')
        .send(newUser({ phone: 'abc' }))
        .expect(400);
      await ctx
        .http()
        .post('/auth/register')
        .send({ ...newUser(), extra: 1 })
        .expect(400);
    });

    it('rejects duplicate alias and email', async () => {
      const u = await register();
      const dupAlias = await ctx
        .http()
        .post('/auth/register')
        .send(newUser({ alias: u.alias }))
        .expect(409);
      expect(dupAlias.body.message).toBe('Alias is already taken');
      const dupEmail = await ctx
        .http()
        .post('/auth/register')
        .send(newUser({ email: u.email }))
        .expect(409);
      expect(dupEmail.body.message).toBe('Email is already registered');
    });

    it('updates the profile and keeps alias unique', async () => {
      const a = await register();
      const b = await register();
      const res = await ctx
        .http()
        .patch('/users/me')
        .set(auth(a.token))
        .send({ commune: 'Ñuñoa', alias: a.alias })
        .expect(200);
      expect(res.body.commune).toBe('Ñuñoa');
      await ctx
        .http()
        .patch('/users/me')
        .set(auth(a.token))
        .send({ phone: '+56 2 2222 2222' })
        .expect(200);
      await ctx
        .http()
        .patch('/users/me')
        .set(auth(a.token))
        .send({ alias: b.alias })
        .expect(409);
    });

    it('guards protected routes', async () => {
      await ctx.http().get('/users/me').expect(401);
      await ctx
        .http()
        .get('/users/me')
        .set('Authorization', 'Basic abc')
        .expect(401);
      await ctx
        .http()
        .get('/users/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
      await ctx
        .http()
        .get('/publications')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(200);
      await ctx
        .http()
        .get('/publications/000000000000000000000000')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });

    it('returns 404 when the token user no longer exists', async () => {
      const u = await register();
      await ctx.app
        .get<Model<User>>(getModelToken(User.name))
        .deleteOne({ _id: u.id });
      await ctx.http().get('/users/me').set(auth(u.token)).expect(404);
    });
  });

  describe('pets', () => {
    it('creates, lists, reads and updates own pets', async () => {
      const u = await register();
      const pet = await createPet(u.token);
      expect(pet).toMatchObject({
        name: 'Luna',
        species: 'dog',
        sex: 'male',
        size: 'medium',
        vaccines: 'Rabies 2025',
        photo: PNG,
      });
      const list = await ctx.http().get('/pets').set(auth(u.token)).expect(200);
      expect(list.body).toHaveLength(1);
      await ctx.http().get(`/pets/${pet.id}`).set(auth(u.token)).expect(200);
      const upd = await ctx
        .http()
        .patch(`/pets/${pet.id}`)
        .set(auth(u.token))
        .send({ name: 'Luna II' })
        .expect(200);
      expect(upd.body.name).toBe('Luna II');
    });

    it('returns null for optional fields not provided', async () => {
      const u = await register();
      const pet = await createPet(u.token, {
        color: undefined,
        vaccines: undefined,
      });
      expect(pet.color).toBeNull();
      expect(pet.vaccines).toBeNull();
      expect(pet.description).toBeNull();
    });

    it('validates enums, vaccines length, photo size and required fields', async () => {
      const u = await register();
      const post = (body: Record<string, unknown>) =>
        ctx.http().post('/pets').set(auth(u.token)).send(body);
      await post(petPayload({ species: 'bird' })).expect(400);
      await post(petPayload({ sex: 'other' })).expect(400);
      await post(petPayload({ size: 'huge' })).expect(400);
      await post(petPayload({ vaccines: 'x'.repeat(200) })).expect(201);
      const vac = await post(petPayload({ vaccines: 'x'.repeat(201) })).expect(
        400,
      );
      expect(vac.body.message.join(' ')).toContain('vaccines');
      const big = await post(petPayload({ photo: BIG_PNG })).expect(400);
      expect(big.body.message.join(' ')).toContain('2MB');
      await post(petPayload({ photo: 'not-base64' })).expect(400);
      await post(petPayload({ photo: undefined, name: undefined })).expect(400);
    });

    it('protects pets of other users', async () => {
      const a = await register();
      const b = await register();
      const pet = await createPet(a.token);
      await ctx.http().get(`/pets/${pet.id}`).set(auth(b.token)).expect(403);
      await ctx
        .http()
        .patch(`/pets/${pet.id}`)
        .set(auth(b.token))
        .send({ name: 'x' })
        .expect(403);
      await ctx
        .http()
        .get('/pets/000000000000000000000000')
        .set(auth(a.token))
        .expect(404);
      await ctx.http().get('/pets/not-an-id').set(auth(a.token)).expect(400);
    });
  });

  describe('publications', () => {
    it('publishes with server date and blocks a second active publication', async () => {
      const a = await register();
      const pet = await createPet(a.token);
      const before = Date.now();
      const pub = await publish(a.token, pet.id);
      expect(new Date(pub.lostAt).getTime()).toBeGreaterThanOrEqual(
        before - 1000,
      );
      expect(pub).toMatchObject({
        status: 'active',
        isOwner: true,
        owner: { alias: a.alias },
      });
      const dup = await ctx
        .http()
        .post('/publications')
        .set(auth(a.token))
        .send({ petId: pet.id, commune: 'Providencia' })
        .expect(409);
      expect(dup.body.message).toBe(
        'This pet already has an active publication',
      );
    });

    it('rejects client-provided dates and pets of others', async () => {
      const a = await register();
      const b = await register();
      const pet = await createPet(a.token);
      await ctx
        .http()
        .post('/publications')
        .set(auth(a.token))
        .send({ petId: pet.id, commune: 'X', lostAt: '2020-01-01' })
        .expect(400);
      await ctx
        .http()
        .post('/publications')
        .set(auth(b.token))
        .send({ petId: pet.id, commune: 'X' })
        .expect(403);
      await ctx
        .http()
        .post('/publications')
        .set(auth(a.token))
        .send({ petId: pet.id })
        .expect(400);
      await ctx
        .http()
        .post('/publications')
        .send({ petId: pet.id, commune: 'X' })
        .expect(401);
    });

    it('lists active publications publicly with filters and never exposes owner PII', async () => {
      const a = await register({ commune: 'Maipú' });
      const dog = await createPet(a.token, { name: 'FilterDog' });
      const cat = await createPet(a.token, {
        name: 'FilterCat',
        species: 'cat',
        sex: 'female',
        size: 'small',
      });
      await publish(a.token, dog.id, 'Maipú');
      await publish(a.token, cat.id, 'La Florida');

      const all = await ctx.http().get('/publications').expect(200);
      const raw = JSON.stringify(all.body);
      expect(raw).not.toContain(a.email);
      expect(raw).not.toContain(a.phone);
      expect(raw).not.toContain(a.name);
      expect(all.body[0].owner).toEqual({ id: a.id, alias: a.alias });
      expect(all.body[0].isOwner).toBe(false);

      const byCommune = await ctx
        .http()
        .get('/publications')
        .query({ commune: 'Maipú' })
        .expect(200);
      expect(byCommune.body.map((p: any) => p.pet.name)).toEqual(['FilterDog']);
      const bySpecies = await ctx
        .http()
        .get('/publications')
        .query({ species: 'cat' })
        .expect(200);
      expect(bySpecies.body.every((p: any) => p.pet.species === 'cat')).toBe(
        true,
      );
      expect(bySpecies.body.map((p: any) => p.pet.name)).toContain('FilterCat');
      await ctx
        .http()
        .get('/publications')
        .query({ species: 'bird' })
        .expect(400);
    });

    it('only the owner can change status; found publications are hidden from others', async () => {
      const a = await register();
      const c = await register();
      const pet = await createPet(a.token);
      const pub = await publish(a.token, pet.id);

      const forbidden = await ctx
        .http()
        .patch(`/publications/${pub.id}/status`)
        .set(auth(c.token))
        .send({ status: 'found' })
        .expect(403);
      expect(forbidden.body.message).toBe(
        'Only the owner can change the publication status',
      );
      await ctx
        .http()
        .patch(`/publications/${pub.id}/status`)
        .send({ status: 'found' })
        .expect(401);
      await ctx
        .http()
        .patch(`/publications/${pub.id}/status`)
        .set(auth(a.token))
        .send({ status: 'lost' })
        .expect(400);
      await ctx
        .http()
        .patch('/publications/000000000000000000000000/status')
        .set(auth(a.token))
        .send({ status: 'found' })
        .expect(404);

      const found = await ctx
        .http()
        .patch(`/publications/${pub.id}/status`)
        .set(auth(a.token))
        .send({ status: 'found' })
        .expect(200);
      expect(found.body.status).toBe('found');
      expect(found.body.foundAt).toBeTruthy();

      const list = await ctx.http().get('/publications').expect(200);
      expect(list.body.find((p: any) => p.id === pub.id)).toBeUndefined();
      await ctx.http().get(`/publications/${pub.id}`).expect(404);
      await ctx
        .http()
        .get(`/publications/${pub.id}`)
        .set(auth(c.token))
        .expect(404);
      await ctx.http().get(`/publications/${pub.id}/comments`).expect(404);
      const own = await ctx
        .http()
        .get(`/publications/${pub.id}`)
        .set(auth(a.token))
        .expect(200);
      expect(own.body.isOwner).toBe(true);

      const mine = await ctx
        .http()
        .get('/publications/mine')
        .set(auth(a.token))
        .expect(200);
      expect(mine.body.map((p: any) => p.id)).toContain(pub.id);
      const others = await ctx
        .http()
        .get('/publications/mine')
        .set(auth(c.token))
        .expect(200);
      expect(others.body).toHaveLength(0);

      // a new publication is allowed once the previous one is found
      const second = await publish(a.token, pet.id);
      // re-activating the old one now conflicts
      await ctx
        .http()
        .patch(`/publications/${pub.id}/status`)
        .set(auth(a.token))
        .send({ status: 'active' })
        .expect(409);
      await ctx
        .http()
        .patch(`/publications/${second.id}/status`)
        .set(auth(a.token))
        .send({ status: 'found' })
        .expect(200);
      const reactivated = await ctx
        .http()
        .patch(`/publications/${pub.id}/status`)
        .set(auth(a.token))
        .send({ status: 'active' })
        .expect(200);
      expect(reactivated.body.foundAt).toBeNull();
      await ctx
        .http()
        .patch(`/publications/${pub.id}/status`)
        .set(auth(a.token))
        .send({ status: 'active' })
        .expect(200);
    });

    it('returns 404 for unknown publications and 400 for invalid ids', async () => {
      await ctx
        .http()
        .get('/publications/000000000000000000000000')
        .expect(404);
      await ctx.http().get('/publications/abc').expect(400);
    });

    it('maps duplicate-key races to 409 and rethrows other errors', async () => {
      const a = await register();
      const pet = await createPet(a.token);
      const model = ctx.app.get<Model<Publication>>(
        getModelToken(Publication.name),
      );
      const spy = jest.spyOn(model, 'create');
      spy.mockRejectedValueOnce(
        Object.assign(new Error('dup'), { code: 11000 }),
      );
      await ctx
        .http()
        .post('/publications')
        .set(auth(a.token))
        .send({ petId: pet.id, commune: 'X' })
        .expect(409);
      spy.mockRejectedValueOnce(new Error('boom'));
      await ctx
        .http()
        .post('/publications')
        .set(auth(a.token))
        .send({ petId: pet.id, commune: 'X' })
        .expect(500);
      spy.mockRestore();
    });
  });

  describe('comments & notifications', () => {
    it('supports the full comment thread flow', async () => {
      const a = await register();
      const c = await register();
      const pet = await createPet(a.token, { name: 'Rocky' });
      const pub = await publish(a.token, pet.id);
      const url = `/publications/${pub.id}/comments`;

      // anonymous sighting with photo
      const anon = await ctx
        .http()
        .post(url)
        .send({
          text: 'Saw him near the metro',
          type: 'sighting',
          photo: PNG,
          authorName: 'Pedro',
          authorEmail: 'pedro@example.com',
        })
        .expect(201);
      expect(anon.body).toMatchObject({
        type: 'sighting',
        isAnonymous: true,
        authorName: 'Pedro',
        photo: PNG,
        canEdit: false,
      });
      expect(anon.body.editToken).toHaveLength(48);
      expect(JSON.stringify(anon.body)).not.toContain('pedro@example.com');

      // registered possible finding
      const reg = await ctx
        .http()
        .post(url)
        .set(auth(c.token))
        .send({ text: 'I think I have him', type: 'possible_finding' })
        .expect(201);
      expect(reg.body).toMatchObject({
        type: 'possible_finding',
        isAnonymous: false,
        authorName: c.alias,
        canEdit: true,
        photo: null,
      });
      expect(reg.body.editToken).toBeUndefined();

      // owner reply does not notify the owner
      const own = await ctx
        .http()
        .post(url)
        .set(auth(a.token))
        .send({ text: 'Thanks!' })
        .expect(201);
      expect(own.body.type).toBe('comment');

      // notifications for owner
      const count = await ctx
        .http()
        .get('/notifications/unread-count')
        .set(auth(a.token))
        .expect(200);
      expect(count.body.count).toBe(2);
      const notifs = await ctx
        .http()
        .get('/notifications')
        .set(auth(a.token))
        .expect(200);
      expect(notifs.body[0]).toMatchObject({
        type: 'possible_finding',
        read: false,
        publicationId: pub.id,
      });
      expect(notifs.body[0].message).toContain(c.alias);
      expect(notifs.body[0].message).toContain('Rocky');
      expect(notifs.body[1].message).toContain('Pedro');
      const cCount = await ctx
        .http()
        .get('/notifications/unread-count')
        .set(auth(c.token))
        .expect(200);
      expect(cCount.body.count).toBe(0);

      await ctx
        .http()
        .patch(`/notifications/${notifs.body[0].id}/read`)
        .set(auth(c.token))
        .expect(404);
      const read = await ctx
        .http()
        .patch(`/notifications/${notifs.body[0].id}/read`)
        .set(auth(a.token))
        .expect(200);
      expect(read.body.read).toBe(true);
      const all = await ctx
        .http()
        .patch('/notifications/read-all')
        .set(auth(a.token))
        .expect(200);
      expect(all.body.updated).toBe(1);
      await ctx.http().get('/notifications').expect(401);

      // listing never leaks emails
      const thread = await ctx.http().get(url).expect(200);
      expect(thread.body).toHaveLength(3);
      const raw = JSON.stringify(thread.body);
      expect(raw).not.toContain('pedro@example.com');
      expect(raw).not.toContain(c.email);
      expect(raw).not.toContain(a.email);
      expect(raw).not.toContain(a.phone);

      // editing
      const edited = await ctx
        .http()
        .patch(`/comments/${reg.body.id}`)
        .set(auth(c.token))
        .send({ text: 'Edited text' })
        .expect(200);
      expect(edited.body).toMatchObject({ text: 'Edited text', edited: true });
      await ctx
        .http()
        .patch(`/comments/${reg.body.id}`)
        .set(auth(a.token))
        .send({ text: 'hack' })
        .expect(403);
      await ctx
        .http()
        .patch(`/comments/${reg.body.id}`)
        .send({ text: 'hack' })
        .expect(403);
      await ctx
        .http()
        .patch(`/comments/${anon.body.id}`)
        .set('X-Edit-Token', anon.body.editToken)
        .send({ text: 'Anon edit' })
        .expect(200);
      await ctx
        .http()
        .patch(`/comments/${anon.body.id}`)
        .set('X-Edit-Token', 'wrong')
        .send({ text: 'x' })
        .expect(403);
      await ctx
        .http()
        .patch(`/comments/${anon.body.id}`)
        .set(auth(c.token))
        .send({ text: 'x' })
        .expect(403);
      await ctx
        .http()
        .patch(`/comments/${reg.body.id}`)
        .set(auth(c.token))
        .send({ text: 'y'.repeat(301) })
        .expect(400);
      await ctx
        .http()
        .patch('/comments/000000000000000000000000')
        .set(auth(c.token))
        .send({ text: 'x' })
        .expect(404);

      // deletion is not possible
      await ctx
        .http()
        .delete(`/comments/${reg.body.id}`)
        .set(auth(c.token))
        .expect(405);

      // flag as offensive
      const f1 = await ctx
        .http()
        .post(`/comments/${own.body.id}/flag`)
        .set(auth(c.token))
        .expect(200);
      expect(f1.body).toMatchObject({
        flagged: true,
        flagCount: 1,
        flaggedByMe: true,
      });
      const f2 = await ctx
        .http()
        .post(`/comments/${own.body.id}/flag`)
        .set(auth(c.token))
        .expect(200);
      expect(f2.body.flagCount).toBe(1);
      const f3 = await ctx
        .http()
        .post(`/comments/${own.body.id}/flag`)
        .expect(200);
      expect(f3.body).toMatchObject({ flagCount: 2, flaggedByMe: false });
      await ctx
        .http()
        .post('/comments/000000000000000000000000/flag')
        .expect(404);

      const after = await ctx.http().get(url).set(auth(c.token)).expect(200);
      expect(after.body.find((x: any) => x.id === reg.body.id).text).toBe(
        'Edited text',
      );
    });

    it('validates comments', async () => {
      const a = await register();
      const pet = await createPet(a.token);
      const pub = await publish(a.token, pet.id);
      const url = `/publications/${pub.id}/comments`;
      const anonBase = { authorName: 'Ana', authorEmail: 'ana@example.com' };
      await ctx
        .http()
        .post(url)
        .send({ ...anonBase, text: 'x'.repeat(300) })
        .expect(201);
      const long = await ctx
        .http()
        .post(url)
        .send({ ...anonBase, text: 'x'.repeat(301) })
        .expect(400);
      expect(long.body.message.join(' ')).toContain('300');
      await ctx
        .http()
        .post(url)
        .send({ ...anonBase, text: 'ok', photo: BIG_PNG })
        .expect(400);
      await ctx
        .http()
        .post(url)
        .send({ ...anonBase, text: '' })
        .expect(400);
      await ctx
        .http()
        .post(url)
        .send({ ...anonBase, text: 'ok', type: 'spam' })
        .expect(400);
      const noName = await ctx
        .http()
        .post(url)
        .send({ text: 'hello' })
        .expect(400);
      expect(noName.body.message).toContain('authorName and authorEmail');
      await ctx
        .http()
        .post(url)
        .send({ text: 'hello', authorName: 'Ana' })
        .expect(400);
      await ctx
        .http()
        .post(url)
        .send({ text: 'hello', authorName: 'Ana', authorEmail: 'bad' })
        .expect(400);
      await ctx
        .http()
        .post('/publications/000000000000000000000000/comments')
        .send({ ...anonBase, text: 'x' })
        .expect(404);
    });

    it('rejects payloads above the body limit', async () => {
      await ctx
        .http()
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ alias: 'x'.repeat(6 * 1024 * 1024) }))
        .expect(413);
    });
  });
});
