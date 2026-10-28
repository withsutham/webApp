require('dotenv').config();
const prisma = require('../db/prisma');

const userName = process.argv[2]?.trim();

const promote = async () => {
  if (!userName) {
    throw new Error('Usage: npm run promote-admin -- <existing-userName>');
  }

  const user = await prisma.user.findUnique({
    where: { userName },
    select: { userId: true },
  });
  if (!user) {
    throw new Error(`No registered user named "${userName}" was found`);
  }

  await prisma.user.update({
    where: { userId: user.userId },
    data: { role: 'admin' },
  });
  console.log('Administrator role assigned.');
};

promote()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.closeDatabase());
