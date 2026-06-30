import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tickets = await prisma.feedbackTicket.findMany({
    include: {
      parentTicket: {
        include: {
          employee: true
        }
      }
    }
  });

  console.log('--- Total Tickets Found:', tickets.length);
  for (const t of tickets.slice(0, 5)) {
    console.log(`Ticket ID: ${t.id}, feedbackTitle: "${t.feedbackTitle}", category: "${t.category}", nature: "${t.nature}"`);
    console.log(`  empJoiningDate (from ticket):`, t.empJoiningDate);
    console.log(`  employee.joiningDate (from relation):`, t.parentTicket?.employee?.joiningDate);
    console.log(`  employee.fullName:`, t.parentTicket?.employee?.fullName);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
