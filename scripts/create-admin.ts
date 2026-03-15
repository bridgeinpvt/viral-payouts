import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Yarasool12', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'pmdnawaz@gmail.com' },
    update: {
      isAdmin: true,
      password: hashedPassword,
    },
    create: {
      email: 'pmdnawaz@gmail.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'BRAND',
      isAdmin: true,
      isOnboarded: true,
    },
  });

  console.log('✅ Admin user created/updated:');
  console.log('Email:', admin.email);
  console.log('Password: Yarasool12');
  console.log('isAdmin:', admin.isAdmin);
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
