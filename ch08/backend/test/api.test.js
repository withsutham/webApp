const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { after, before, test } = require('node:test');

process.env.JWT_KEY = randomBytes(32).toString('hex');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../app');
const prisma = require('../db/prisma');

let server;
let apiUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  apiUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  const closed = new Promise((resolve) => server.close(resolve));
  server.closeAllConnections();
  await closed;
  await prisma.closeDatabase();
});

const stub = (t, target, methodName, implementation) => {
  const original = target[methodName];
  target[methodName] = implementation;
  t.after(() => {
    target[methodName] = original;
  });
};

const makeToken = (userId) => jwt.sign({ sub: String(userId) }, process.env.JWT_KEY, { expiresIn: '1h' });

const request = async (path, { method = 'GET', body, token } = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { response, body: await response.json() };
};

const regularUser = {
  userId: 11,
  userName: 'alice',
  email: 'alice@example.com',
  role: 'user',
};

test('registration hashes the password and ignores a requested administrator role', async (t) => {
  let created;
  stub(t, prisma.user, 'findFirst', async () => null);
  stub(t, prisma.user, 'create', async ({ data }) => {
    created = data;
    return { userId: 11, userName: data.userName, email: data.email, role: data.role };
  });

  const { response, body } = await request('/auth/register', {
    method: 'POST',
    body: {
      userName: 'alice',
      email: 'alice@example.com',
      password: 'a-strong-password',
      confirmPassword: 'a-strong-password',
      role: 'admin',
    },
  });

  assert.equal(response.status, 201);
  assert.equal(body.user.role, 'user');
  assert.equal(Object.hasOwn(body.user, 'password'), false);
  assert.equal(created.role, 'user');
  assert.notEqual(created.password, 'a-strong-password');
  assert.equal(await bcrypt.compare('a-strong-password', created.password), true);
});

test('registration rejects a duplicate username or email', async (t) => {
  stub(t, prisma.user, 'findFirst', async () => ({ userId: 12 }));
  const { response, body } = await request('/auth/register', {
    method: 'POST',
    body: { userName: 'alice', email: 'alice@example.com', password: 'a-strong-password' },
  });

  assert.equal(response.status, 409);
  assert.match(body.error, /already exists/i);
});

test('login returns a JWT and /auth/me resolves the current public profile', async (t) => {
  const passwordHash = await bcrypt.hash('a-strong-password', 4);
  const storedUser = { ...regularUser, password: passwordHash };
  stub(t, prisma.user, 'findUnique', async ({ where }) =>
    where.userName ? storedUser : regularUser,
  );

  const login = await request('/auth/login', {
    method: 'POST',
    body: { userName: 'alice', password: 'a-strong-password' },
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.body.user.userName, 'alice');
  assert.equal(Object.hasOwn(login.body.user, 'password'), false);
  assert.equal(jwt.verify(login.body.token, process.env.JWT_KEY).sub, '11');

  const me = await request('/auth/me', { token: login.body.token });
  assert.equal(me.response.status, 200);
  assert.deepEqual(me.body.user, regularUser);
  assert.equal(Object.hasOwn(me.body.user, 'password'), false);
});

test('missing, invalid, and expired bearer tokens receive 401', async () => {
  const missing = await request('/auth/me');
  const invalid = await request('/auth/me', { token: 'not-a-jwt' });
  const expired = jwt.sign({ sub: '11' }, process.env.JWT_KEY, { expiresIn: -1 });
  const expiredResponse = await request('/auth/me', { token: expired });

  assert.equal(missing.response.status, 401);
  assert.equal(invalid.response.status, 401);
  assert.equal(expiredResponse.response.status, 401);
});

test('regular users cannot create menus or access admin user APIs', async (t) => {
  let authenticatedUser = regularUser;
  stub(t, prisma.user, 'findUnique', async () => authenticatedUser);
  const token = jwt.sign({ sub: '11', role: 'admin' }, process.env.JWT_KEY, { expiresIn: '1h' });

  const createMenu = await request('/menu', {
    method: 'POST',
    token,
    body: { name: 'Soup', price: 50, isBestSeller: false, typeId: null },
  });
  const listUsers = await request('/users', { token });
  const guestCreate = await request('/menu', {
    method: 'POST',
    body: { name: 'Soup', price: 50, isBestSeller: false, typeId: null },
  });
  authenticatedUser = { ...regularUser, userId: 12, role: 'admin' };
  const adminRating = await request('/menu/1/ratings', {
    method: 'POST',
    token: makeToken(12),
    body: { score: 5 },
  });

  assert.equal(createMenu.response.status, 403);
  assert.equal(listUsers.response.status, 403);
  assert.equal(guestCreate.response.status, 401);
  assert.equal(adminRating.response.status, 403);
});

test('public menu responses include database-backed rating summaries', async (t) => {
  stub(t, prisma.menu, 'findMany', async () => [
    { menuId: 1, name: 'Rice', price: '60', isBestSeller: true, typeId: null, type: null },
  ]);
  stub(t, prisma.rating, 'groupBy', async () => [
    { menuId: 1, _avg: { score: 4.25 }, _count: { _all: 2 } },
  ]);

  const { response, body } = await request('/menu');
  assert.equal(response.status, 200);
  assert.equal(body[0].averageRating, 4.3);
  assert.equal(body[0].ratingCount, 2);
  assert.equal(body[0].myRating, null);
});

test('users can create one rating, duplicates conflict, and existing ratings can be updated', async (t) => {
  stub(t, prisma.user, 'findUnique', async () => regularUser);
  stub(t, prisma.menu, 'findUnique', async () => ({ menuId: 1 }));

  let creates = 0;
  stub(t, prisma.rating, 'create', async ({ data }) => {
    creates += 1;
    if (creates > 1) {
      const error = new Error('duplicate');
      error.code = 'P2002';
      throw error;
    }
    return { ratingId: 21, ...data, createdAt: new Date(), updatedAt: new Date() };
  });
  stub(t, prisma.rating, 'aggregate', async () => ({ _avg: { score: 5 }, _count: { _all: 1 } }));
  stub(t, prisma.rating, 'findUnique', async () => ({ score: 5 }));
  stub(t, prisma.rating, 'update', async ({ where, data }) => ({
    ratingId: 21,
    userId: where.userId_menuId.userId,
    menuId: where.userId_menuId.menuId,
    ...data,
  }));

  const token = makeToken(regularUser.userId);
  const invalid = await request('/menu/1/ratings', { method: 'POST', token, body: { score: 6 } });
  const created = await request('/menu/1/ratings', { method: 'POST', token, body: { score: 5 } });
  const duplicate = await request('/menu/1/ratings', { method: 'POST', token, body: { score: 4 } });
  const updated = await request('/menu/1/ratings/me', { method: 'PUT', token, body: { score: 4 } });

  assert.equal(invalid.response.status, 400);
  assert.equal(created.response.status, 201);
  assert.equal(created.body.summary.averageRating, 5);
  assert.equal(created.body.summary.myRating, 5);
  assert.equal(duplicate.response.status, 409);
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.rating.score, 4);
});

test('an admin can manage menus and roles but cannot remove their own administrator role', async (t) => {
  const administrator = { ...regularUser, userId: 1, userName: 'admin', role: 'admin' };
  const otherUser = { ...regularUser, userId: 2, userName: 'bob', email: 'bob@example.com' };
  let transactionTarget = administrator;
  stub(t, prisma.user, 'findUnique', async () => administrator);
  stub(t, prisma.user, 'findMany', async () => [{ ...administrator, password: 'must-not-leak' }]);
  stub(t, prisma.menu, 'create', async ({ data }) => ({
    menuId: 31,
    ...data,
    type: null,
  }));
  stub(t, prisma.menu, 'update', async ({ where, data }) => ({
    menuId: where.menuId,
    ...data,
    type: null,
  }));
  stub(t, prisma.menu, 'delete', async ({ where }) => ({ menuId: where.menuId }));
  stub(t, prisma, '$transaction', async (callback) => callback({
    user: {
      findUnique: async () => transactionTarget,
      count: async () => 2,
      update: async ({ data }) => ({ ...transactionTarget, ...data }),
    },
  }));

  const token = makeToken(administrator.userId);
  const create = await request('/menu', {
    method: 'POST', token,
    body: { name: 'Rice', price: 60, isBestSeller: true, typeId: null },
  });
  const update = await request('/menu/31', {
    method: 'PUT', token,
    body: { name: 'Rice Deluxe', price: 70, isBestSeller: false, typeId: null },
  });
  const remove = await request('/menu/31', { method: 'DELETE', token });
  const listUsers = await request('/users', { token });
  transactionTarget = otherUser;
  const promote = await request('/users/2/role', {
    method: 'PATCH', token, body: { role: 'admin' },
  });
  transactionTarget = { ...otherUser, role: 'admin' };
  const demoteOtherAdmin = await request('/users/2/role', {
    method: 'PATCH', token, body: { role: 'user' },
  });
  const invalidRole = await request('/users/2/role', {
    method: 'PATCH', token, body: { role: 'guest' },
  });
  transactionTarget = administrator;
  const selfDemotion = await request('/users/1/role', {
    method: 'PATCH', token, body: { role: 'user' },
  });

  assert.equal(create.response.status, 201);
  assert.equal(update.response.status, 200);
  assert.equal(remove.response.status, 200);
  assert.equal(listUsers.response.status, 200);
  assert.equal(Object.hasOwn(listUsers.body[0], 'password'), false);
  assert.equal(promote.response.status, 200);
  assert.equal(promote.body.user.role, 'admin');
  assert.equal(demoteOtherAdmin.response.status, 200);
  assert.equal(invalidRole.response.status, 400);
  assert.equal(selfDemotion.response.status, 403);
});

test('a role update cannot remove the last remaining administrator', async (t) => {
  const actor = { ...regularUser, userId: 1, userName: 'admin', role: 'admin' };
  const target = { ...regularUser, userId: 2, userName: 'other-admin', role: 'admin' };
  stub(t, prisma.user, 'findUnique', async () => actor);
  stub(t, prisma, '$transaction', async (callback) => callback({
    user: {
      findUnique: async () => target,
      count: async () => 1,
      update: async () => assert.fail('the last administrator must not be demoted'),
    },
  }));

  const { response, body } = await request('/users/2/role', {
    method: 'PATCH',
    token: makeToken(actor.userId),
    body: { role: 'user' },
  });

  assert.equal(response.status, 409);
  assert.match(body.error, /at least one administrator/i);
});
