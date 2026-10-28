const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_NAME_MAX_LENGTH = 50;
const EMAIL_MAX_LENGTH = 191;

const parseRegistration = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object' };
  }

  const userName = typeof body.userName === 'string' ? body.userName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!userName || !email || !password) {
    return { error: 'userName, email, and password are required' };
  }
  if (userName.length > USER_NAME_MAX_LENGTH) {
    return { error: `userName must be at most ${USER_NAME_MAX_LENGTH} characters` };
  }
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { error: 'email must be a valid email address of at most 191 characters' };
  }
  if (password.length < 8) {
    return { error: 'password must be at least 8 characters' };
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return { error: 'password must be at most 72 bytes' };
  }
  if (body.confirmPassword !== undefined && body.confirmPassword !== password) {
    return { error: 'password and confirmPassword must match' };
  }

  return { data: { userName, email, password } };
};

const parseRatingScore = (value) =>
  Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;

const parseRole = (value) =>
  value === 'user' || value === 'admin' ? value : null;

const parsePositiveId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

module.exports = { parseRegistration, parseRatingScore, parseRole, parsePositiveId };
