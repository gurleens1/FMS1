import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const t1 = await prisma.feedbackTicket.updateMany({
    where: { empEmail: 'voicebox@system', feedbackSource: 'Web' },
    data: { feedbackSource: 'VoiceBox' }
  });
  console.log('Updated tickets:', t1.count);

  const employees = await prisma.employee.findMany({ where: { email: 'voicebox@system' } });
  for (const emp of employees) {
    const p1 = await prisma.parentTicket.updateMany({
      where: { employeeId: emp.id, feedbackSource: 'Web' },
      data: { feedbackSource: 'VoiceBox' }
    });
    console.log('Updated parent tickets for', emp.id, ':', p1.count);
  }
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
