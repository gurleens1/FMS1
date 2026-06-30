import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.userRoleModel.findMany({
    include: {
      employee: true
    }
  });
  console.log("=== USERS IN SYSTEM ===");
  for (const u of users) {
    console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | FullName: ${u.employee?.fullName}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
