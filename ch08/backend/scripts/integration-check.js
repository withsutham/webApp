const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../app');
const prisma = require('../db/prisma');

const backendDirectory = path.resolve(__dirname, '..');
const runId = randomUUID().replaceAll('-', '').slice(0, 16);
const password = randomBytes(24).toString('base64url');
const badPassword = randomBytes(24).toString('base64url');
const accounts = [
  { userName: `e2e_${runId}_admin`, email: `e2e_${runId}_admin@example.invalid` },
  { userName: `e2e_${runId}_one`, email: `e2e_${runId}_one@example.invalid` },
  { userName: `e2e_${runId}_two`, email: `e2e_${runId}_two@example.invalid` },
];

const disposableUserIds = new Set();
let temporaryMenuId = null;
let temporaryMenuName = null;
let initialCounts = null;
let initialMenuSnapshot = null;
let initialTypeSnapshot = null;
let initialUserSnapshot = null;
let server = null;
let apiBase = null;
let failure = null;
const passed = [];

const countRows = async () => ({
  menu: await prisma.menu.count(),
  type: await prisma.type.count(),
  user: await prisma.user.count(),
  rating: await prisma.rating.count(),
});

const rememberUser = async (userName, email) => {
  const user = await prisma.user.findUnique({ where: { userName }, select: { userId: true, email: true } });
  if (user && user.email === email) disposableUserIds.add(user.userId);
  return user;
};

const call = async (method, route, options = {}) => {
  const headers = { ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body, headers: response.headers };
};

const expectStatus = (response, expected) => {
  assert.equal(response.status, expected, `expected HTTP ${expected}, received HTTP ${response.status}`);
  return response.body;
};

const passedCheck = (name) => {
  passed.push(name);
  process.stdout.write(`PASS ${name}\n`);
};

const register = async (account, extra = {}) => {
  const response = await call('POST', '/auth/register', {
    body: {
      userName: account.userName,
      email: account.email,
      password,
      confirmPassword: password,
      ...extra,
    },
  });
  const created = await rememberUser(account.userName, account.email);
  if (response.status === 201) {
    assert.ok(created, 'registered account should be present in the database');
    assert.equal(response.body.user.userId, created.userId);
  }
  return { response, created };
};

const makeLogin = async (account, loginPassword = password) => {
  const response = await call('POST', '/auth/login', {
    body: { userName: account.userName, password: loginPassword },
  });
  const body = expectStatus(response, 200);
  assert.equal(typeof body.token, 'string');
  assert.equal(Object.hasOwn(body.user, 'password'), false);
  const payload = jwt.decode(body.token);
  assert.ok(payload.exp > payload.iat, 'JWT should include a future expiration');
  assert.equal(payload.role, undefined, 'JWT must not carry an authorization role claim');
  return { token: body.token, user: body.user };
};

const run = async () => {
  assert.ok(process.env.JWT_KEY && Buffer.byteLength(process.env.JWT_KEY) >= 32, 'JWT_KEY must be configured');
  await prisma.$connect();
  initialCounts = await countRows();
  initialMenuSnapshot = (await prisma.menu.findMany({ orderBy: { menuId: 'asc' } })).map((menu) => ({
    menuId: menu.menuId,
    name: menu.name,
    price: menu.price.toString(),
    isBestSeller: menu.isBestSeller,
    typeId: menu.typeId,
  }));
  initialTypeSnapshot = await prisma.type.findMany({ orderBy: { typeId: 'asc' } });
  initialUserSnapshot = (await prisma.user.findMany({ orderBy: { userId: 'asc' } })).map((user) => ({
    userId: user.userId,
    userName: user.userName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  }));

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  apiBase = `http://127.0.0.1:${server.address().port}/api`;

  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  const preflight = await call('OPTIONS', '/menu', {
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  passedCheck('JWT configuration and CORS preflight');

  const menus = expectStatus(await call('GET', '/menu'), 200);
  const types = expectStatus(await call('GET', '/type'), 200);
  assert.ok(Array.isArray(menus) && menus.length === initialCounts.menu);
  assert.ok(Array.isArray(types) && types.length === initialCounts.type);
  const existingMenuId = initialMenuSnapshot[0]?.menuId;
  assert.ok(existingMenuId, 'database should have at least one menu for protected-route checks');

  for (const response of [
    await call('POST', '/menu', { body: { name: 'guest-write-check', price: 1 } }),
    await call('PUT', `/menu/${existingMenuId}`, { body: { name: 'guest-write-check', price: 1 } }),
    await call('DELETE', `/menu/${existingMenuId}`),
    await call('POST', `/menu/${existingMenuId}/ratings`, { body: { score: 5 } }),
    await call('GET', '/users'),
  ]) expectStatus(response, 401);
  passedCheck('guest public reads and protected writes');

  const first = await register(accounts[0], { role: 'admin' });
  expectStatus(first.response, 201);
  assert.equal(first.response.body.user.role, 'user');
  assert.equal(Object.hasOwn(first.response.body.user, 'password'), false);
  const storedUser = await prisma.user.findUnique({ where: { userId: first.created.userId } });
  assert.notEqual(storedUser.password, password);
  assert.match(storedUser.password, /^\$2[aby]\$12\$/);
  assert.equal(await bcrypt.compare(password, storedUser.password), true);

  const duplicateUsername = await call('POST', '/auth/register', {
    body: { userName: accounts[0].userName, email: `other_${runId}@example.invalid`, password },
  });
  expectStatus(duplicateUsername, 409);
  const duplicateEmail = await call('POST', '/auth/register', {
    body: { userName: `other_${runId}`, email: accounts[0].email, password },
  });
  expectStatus(duplicateEmail, 409);
  const invalidRegistration = await call('POST', '/auth/register', {
    body: { userName: `invalid_${runId}`, email: 'not-an-email', password },
  });
  expectStatus(invalidRegistration, 400);
  const mismatchedRegistration = await call('POST', '/auth/register', {
    body: { userName: `mismatch_${runId}`, email: `mismatch_${runId}@example.invalid`, password, confirmPassword: badPassword },
  });
  expectStatus(mismatchedRegistration, 400);

  const second = await register(accounts[1]);
  expectStatus(second.response, 201);
  const third = await register(accounts[2]);
  expectStatus(third.response, 201);
  passedCheck('registration validation, uniqueness, default role, and bcrypt storage');

  const adminSession = await makeLogin(accounts[0]);
  const userOneSession = await makeLogin(accounts[1]);
  const userTwoSession = await makeLogin(accounts[2]);
  for (const session of [adminSession, userOneSession, userTwoSession]) {
    const current = expectStatus(await call('GET', '/auth/me', { token: session.token }), 200);
    assert.equal(current.user.userId, session.user.userId);
    assert.equal(Object.hasOwn(current.user, 'password'), false);
  }
  expectStatus(await call('POST', '/auth/login', { body: { userName: accounts[0].userName, password: badPassword } }), 401);
  expectStatus(await call('POST', '/auth/login', { body: { userName: `unknown_${runId}`, password } }), 401);
  expectStatus(await call('GET', '/auth/me'), 401);
  expectStatus(await call('GET', '/auth/me', { headers: { Authorization: 'Basic malformed' } }), 401);
  expectStatus(await call('GET', '/auth/me', { headers: { Authorization: 'Bearer invalid.token.value' } }), 401);
  const expiredToken = jwt.sign({ sub: String(first.created.userId) }, process.env.JWT_KEY, { algorithm: 'HS256', expiresIn: -1 });
  expectStatus(await call('GET', '/auth/me', { token: expiredToken }), 401);
  passedCheck('login, JWT expiration, current-user lookup, and invalid-token rejection');

  for (const response of [
    await call('POST', '/menu', { token: userOneSession.token, body: { name: 'user-write-check', price: 1 } }),
    await call('PUT', `/menu/${existingMenuId}`, { token: userOneSession.token, body: { name: 'user-write-check', price: 1 } }),
    await call('DELETE', `/menu/${existingMenuId}`, { token: userOneSession.token }),
    await call('GET', '/users', { token: userOneSession.token }),
    await call('PATCH', `/users/${third.created.userId}/role`, { token: userOneSession.token, body: { role: 'admin' } }),
  ]) expectStatus(response, 403);
  passedCheck('regular-user menu and role authorization');

  const missingPromotion = spawnSync(process.execPath, ['scripts/promote-admin.js', `missing_${runId}`], {
    cwd: backendDirectory,
    encoding: 'utf8',
  });
  assert.notEqual(missingPromotion.status, 0, 'promotion CLI should reject an unknown username');
  const promotion = spawnSync(process.execPath, ['scripts/promote-admin.js', accounts[0].userName], {
    cwd: backendDirectory,
    encoding: 'utf8',
  });
  assert.equal(promotion.status, 0, 'promotion CLI should promote an existing disposable account');
  assert.equal((await prisma.user.findUnique({ where: { userId: first.created.userId } })).role, 'admin');

  const usersResponse = expectStatus(await call('GET', '/users', { token: adminSession.token }), 200);
  assert.ok(Array.isArray(usersResponse));
  assert.ok(usersResponse.every((user) => Object.hasOwn(user, 'userId') && Object.hasOwn(user, 'userName') && Object.hasOwn(user, 'email') && Object.hasOwn(user, 'role')));
  assert.ok(usersResponse.every((user) => !Object.hasOwn(user, 'password')));
  expectStatus(await call('PATCH', `/users/${second.created.userId}/role`, { token: adminSession.token, body: { role: 'superadmin' } }), 400);
  passedCheck('admin promotion CLI and password-free user management');

  const type = await prisma.type.findFirst({ orderBy: { typeId: 'asc' } });
  assert.ok(type, 'database should have a type to preserve the menu relationship');
  temporaryMenuName = `__ch08_e2e_${runId}`;
  const createResponse = await call('POST', '/menu', {
    token: adminSession.token,
    body: { name: temporaryMenuName, price: 12.5, isBestSeller: true, typeId: type.typeId },
  });
  if (createResponse.body?.menuId) temporaryMenuId = createResponse.body.menuId;
  if (!temporaryMenuId) {
    const found = await prisma.menu.findFirst({ where: { name: temporaryMenuName }, select: { menuId: true } });
    temporaryMenuId = found?.menuId ?? null;
  }
  const createdMenu = expectStatus(createResponse, 201);
  assert.ok(temporaryMenuId);
  assert.equal(createdMenu.menuId, temporaryMenuId);
  assert.equal(createdMenu.name, temporaryMenuName);
  assert.equal(createdMenu.isBestSeller, true);
  assert.equal(createdMenu.type.typeId, type.typeId);
  assert.ok((await prisma.menu.findUnique({ where: { menuId: temporaryMenuId } })), 'created menu should persist');

  const updatedMenu = expectStatus(await call('PUT', `/menu/${temporaryMenuId}`, {
    token: adminSession.token,
    body: { name: `${temporaryMenuName}_updated`, price: 18.75, isBestSeller: false, typeId: type.typeId },
  }), 200);
  temporaryMenuName = updatedMenu.name;
  assert.equal(updatedMenu.price, '18.75');
  assert.equal(updatedMenu.isBestSeller, false);
  const menuRows = expectStatus(await call('GET', '/menu'), 200);
  assert.ok(menuRows.some((menu) => menu.menuId === temporaryMenuId));
  passedCheck('admin menu create, read, update, and persistence');

  expectStatus(await call('POST', `/menu/${temporaryMenuId}/ratings`, { token: adminSession.token, body: { score: 5 } }), 403);
  expectStatus(await call('POST', `/menu/${temporaryMenuId}/ratings`, { body: { score: 5 } }), 401);
  const firstRating = expectStatus(await call('POST', `/menu/${temporaryMenuId}/ratings`, { token: userOneSession.token, body: { score: 2 } }), 201);
  assert.equal(firstRating.summary.averageRating, 2);
  assert.equal(firstRating.summary.ratingCount, 1);
  expectStatus(await call('POST', `/menu/${temporaryMenuId}/ratings`, { token: userOneSession.token, body: { score: 3 } }), 409);
  expectStatus(await call('POST', `/menu/${temporaryMenuId}/ratings`, { token: userTwoSession.token, body: { score: 6 } }), 400);
  expectStatus(await call('POST', `/menu/${temporaryMenuId}/ratings`, { token: userTwoSession.token, body: { score: 1.5 } }), 400);
  const secondRating = expectStatus(await call('POST', `/menu/${temporaryMenuId}/ratings`, { token: userTwoSession.token, body: { score: 4 } }), 201);
  assert.equal(secondRating.summary.averageRating, 3);
  assert.equal(secondRating.summary.ratingCount, 2);
  const changedRating = expectStatus(await call('PUT', `/menu/${temporaryMenuId}/ratings/me`, {
    token: userOneSession.token,
    body: { score: 5, userId: third.created.userId },
  }), 200);
  assert.equal(changedRating.summary.averageRating, 4.5);
  assert.equal(changedRating.summary.ratingCount, 2);
  const ownOne = expectStatus(await call('GET', `/menu/${temporaryMenuId}/ratings`, { token: userOneSession.token }), 200);
  const ownTwo = expectStatus(await call('GET', `/menu/${temporaryMenuId}/ratings`, { token: userTwoSession.token }), 200);
  const publicSummary = expectStatus(await call('GET', `/menu/${temporaryMenuId}/ratings`), 200);
  assert.equal(ownOne.myRating, 5);
  assert.equal(ownTwo.myRating, 4);
  assert.equal(publicSummary.myRating, null);
  assert.equal(publicSummary.averageRating, 4.5);
  assert.equal(publicSummary.ratingCount, 2);
  assert.equal(await prisma.rating.count({ where: { menuId: temporaryMenuId } }), 2);
  passedCheck('rating permissions, uniqueness, updates, aggregates, and database persistence');

  expectStatus(await call('PATCH', `/users/${second.created.userId}/role`, { token: adminSession.token, body: { role: 'admin' } }), 200);
  expectStatus(await call('GET', '/users', { token: userOneSession.token }), 200);
  expectStatus(await call('PATCH', `/users/${second.created.userId}/role`, { token: adminSession.token, body: { role: 'user' } }), 200);
  expectStatus(await call('GET', '/users', { token: userOneSession.token }), 403);
  assert.equal((await prisma.user.findUnique({ where: { userId: second.created.userId } })).role, 'user');
  expectStatus(await call('PATCH', `/users/${first.created.userId}/role`, { token: adminSession.token, body: { role: 'user' } }), 403);
  assert.equal((await prisma.user.findUnique({ where: { userId: first.created.userId } })).role, 'admin');

  expectStatus(await call('PATCH', `/users/${second.created.userId}/role`, { token: adminSession.token, body: { role: 'admin' } }), 200);
  const [demoteSecond, demoteFirst] = await Promise.all([
    call('PATCH', `/users/${second.created.userId}/role`, { token: adminSession.token, body: { role: 'user' } }),
    call('PATCH', `/users/${first.created.userId}/role`, { token: userOneSession.token, body: { role: 'user' } }),
  ]);
  const roleStatuses = [demoteSecond.status, demoteFirst.status].sort();
  assert.equal(roleStatuses.filter((status) => status === 200).length, 1, 'concurrent demotions should allow only one administrator to be removed');
  assert.ok(roleStatuses.some((status) => status === 403 || status === 409), 'the competing demotion should be rejected');
  const disposableAdminCount = await prisma.user.count({
    where: { userId: { in: [...disposableUserIds] }, role: 'admin' },
  });
  assert.equal(disposableAdminCount, 1, 'one disposable administrator should remain after concurrent demotions');
  const remainingAdminId = (await prisma.user.findMany({
    where: { userId: { in: [...disposableUserIds] }, role: 'admin' },
    select: { userId: true },
  }))[0].userId;
  const remainingAdminToken = remainingAdminId === first.created.userId ? adminSession.token : userOneSession.token;
  expectStatus(await call('GET', '/users', { token: remainingAdminToken }), 200);
  passedCheck('role changes take effect on existing JWTs, self-demotion and last-admin protections');

  expectStatus(await call('DELETE', `/menu/${temporaryMenuId}`, { token: remainingAdminToken }), 200);
  assert.equal(await prisma.menu.findUnique({ where: { menuId: temporaryMenuId } }), null);
  assert.equal(await prisma.rating.count({ where: { menuId: temporaryMenuId } }), 0);
  temporaryMenuId = null;
  passedCheck('admin menu delete and rating cascade');
};

const cleanup = async () => {
  const cleanupErrors = [];
  try {
    if (temporaryMenuId) {
      await prisma.menu.delete({ where: { menuId: temporaryMenuId } }).catch((error) => {
        if (error.code !== 'P2025') throw error;
      });
    }
  } catch (error) {
    cleanupErrors.push(`temporary menu id ${temporaryMenuId}: ${error.code || error.name}`);
  }

  for (const userId of disposableUserIds) {
    try {
      await prisma.user.update({ where: { userId }, data: { role: 'user' } }).catch((error) => {
        if (error.code !== 'P2025') throw error;
      });
      await prisma.user.delete({ where: { userId } }).catch((error) => {
        if (error.code !== 'P2025') throw error;
      });
    } catch (error) {
      cleanupErrors.push(`disposable user id ${userId}: ${error.code || error.name}`);
    }
  }

  if (initialCounts) {
    try {
      const finalCounts = await countRows();
      assert.deepEqual(finalCounts, initialCounts, 'database record counts should return to baseline');
      const finalMenus = (await prisma.menu.findMany({ orderBy: { menuId: 'asc' } })).map((menu) => ({
        menuId: menu.menuId,
        name: menu.name,
        price: menu.price.toString(),
        isBestSeller: menu.isBestSeller,
        typeId: menu.typeId,
      }));
      assert.deepEqual(finalMenus, initialMenuSnapshot, 'original menus should remain unchanged');
      assert.deepEqual(await prisma.type.findMany({ orderBy: { typeId: 'asc' } }), initialTypeSnapshot, 'original types should remain unchanged');
      const finalUsers = (await prisma.user.findMany({ orderBy: { userId: 'asc' } })).map((user) => ({
        userId: user.userId,
        userName: user.userName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      }));
      assert.deepEqual(finalUsers, initialUserSnapshot, 'pre-existing users should remain unchanged');
      process.stdout.write(`DATABASE_COUNTS ${JSON.stringify(finalCounts)}\n`);
      process.stdout.write('PASS disposable records removed; baseline records and counts preserved\n');
    } catch (error) {
      cleanupErrors.push(`final database verification: ${error.code || error.name}`);
    }
  }

  if (server) {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
  try {
    await prisma.closeDatabase();
  } catch (error) {
    cleanupErrors.push(`database connection close: ${error.code || error.name}`);
  }

  if (cleanupErrors.length) {
    process.stderr.write(`CLEANUP_FAILURE ${cleanupErrors.join('; ')}\n`);
    failure ??= new Error('Disposable test data cleanup did not fully verify');
  }
  if (failure) {
    process.stderr.write(`FAIL integration checks: ${failure.message}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`INTEGRATION_CHECKS_PASSED ${passed.length}\n`);
};

run()
  .catch((error) => {
    failure = error;
  })
  .finally(cleanup);
