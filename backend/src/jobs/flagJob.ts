import cron from 'node-cron';
import prisma from '../utils/prisma';
// Removed FeedbackStatus and FlagType imports as they cause undefined errors in SQLite
import { logger } from '../utils/logger';
import { differenceInDays } from '../utils/dateUtils';

/**
 * Auto-flag job — exact port of Power Fx OnStart logic:
 *
 * Rules:
 * 1. If existing flag is "LateInput" → preserve it (never override)
 * 2. If ticket is not closed AND age > 5 days → set "UrgentAttention"
 * 3. Otherwise → leave flag unchanged
 */
export async function runFlagUpdate(): Promise<void> {
  try {
    logger.info('Running auto-flag update job...');

    const now = new Date();

    // Fetch all tickets that are NOT 'Closed'
    // CHANGED: Using literal string 'Closed' instead of enum object
    const openTickets = await prisma.feedbackTicket.findMany({
      where: {
        status: { not: 'Closed' }, 
      },
      select: {
        id: true,
        flag: true,
        createdAt: true,
        status: true,
      },
    });

    let updatedCount = 0;

    await Promise.all(
      openTickets.map(async (ticket) => {
        // Rule 1: Preserve "LateInput" flag — never override
        // CHANGED: Using literal string 'LateInput'
        if (ticket.flag === 'LateInput') return;

        // Rule 2: Age > 5 days and not closed → set UrgentAttention
        const ageDays = differenceInDays(now, ticket.createdAt);
        
        // CHANGED: Using literal strings 'Closed' and 'UrgentAttention'
        const shouldFlag = ageDays > 5 && ticket.status !== 'Closed';

        const newFlag = shouldFlag ? 'UrgentAttention' : null;

        // Only update if flag needs to change
        if (newFlag !== ticket.flag) {
          await prisma.feedbackTicket.update({
            where: { id: ticket.id },
            data: { flag: newFlag as any }, // 'as any' helps TS ignore the missing Enum type
          });
          updatedCount++;
        }
      })
    );

    logger.info(`Auto-flag job complete. Updated ${updatedCount} tickets.`);
  } catch (err) {
    logger.error('Auto-flag job error:', err);
  }
}

/**
 * Schedule: runs at midnight every day
 */
export function startFlagJob(): void {
  // Run once on startup
  runFlagUpdate();

  // Then run daily at midnight
  cron.schedule('0 0 * * *', () => {
    runFlagUpdate();
  });

  logger.info('Flag update cron job scheduled (daily at midnight)');
}