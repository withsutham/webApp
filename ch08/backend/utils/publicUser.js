const publicUser = ({ userId, userName, email, role }) => ({
  userId,
  userName,
  email,
  role,
});

module.exports = { publicUser };
