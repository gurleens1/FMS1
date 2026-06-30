import { Router, Response } from 'express';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/insights/latest — return most recent active insights for dashboard
router.get('/latest', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const insights = await prisma.aiInsight.findMany({
      where: { isActive: true },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });
    res.json(insights);
  } catch (err) {
    throw err;
  }
});

/**
 * POST /api/insights/generate
 * AI-ready stub. When AI_INSIGHTS_ENABLED=true and API key is configured,
 * this will call the LLM to generate summaries from feedback data.
 *
 * Currently: performs real aggregations and stores as structured insights.
 * Future: feed aggregations to Claude API / OpenAI for natural language summaries.
 */
router.post('/generate', requireRole('Admin', 'SuperAdmin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const aiEnabled = process.env.AI_INSIGHTS_ENABLED === 'true';

    // Always compute real stats
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalRecent,
      totalPrev,
      highPriorityCount,
      topCategories,
    ] = await Promise.all([
      prisma.feedbackTicket.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.feedbackTicket.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.feedbackTicket.count({
        where: { priority: 'High', createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.feedbackTicket.groupBy({
        by: ['category'],
        _count: { category: true },
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { _count: { category: 'desc' } },
        take: 3,
      }),
    ]);

    // Compute average resolution safely in memory to avoid PostgreSQL syntax mapping issues
    const resolvedTickets = await prisma.feedbackTicket.findMany({
      where: {
        status: { in: ['Resolved', 'Closed'] },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, updatedAt: true },
    });

    let avgDays = 0;
    if (resolvedTickets.length > 0) {
      const totalDays = resolvedTickets.reduce((sum, ticket) => {
        const diffTime = ticket.updatedAt.getTime() - ticket.createdAt.getTime();
        return sum + diffTime / (1000 * 60 * 60 * 24);
      }, 0);
      avgDays = Math.round(totalDays / resolvedTickets.length);
    }

    const trendPct = totalPrev > 0
      ? Math.round(((totalRecent - totalPrev) / totalPrev) * 100)
      : 0;

    const topCat = topCategories[0]?.category || 'N/A';

    // FIXED: Convert metadata object to JSON string because Prisma schema expects a String
    const metadataString = JSON.stringify({
      totalRecent,
      totalPrev,
      highPriorityCount,
      topCategories: topCategories.map((c) => ({ category: c.category, count: c._count.category })),
      avgResolutionDays: avgDays,
    });

    // Deactivate old insights
    await prisma.aiInsight.updateMany({ where: { isActive: true }, data: { isActive: false } });

    const insightsToCreate = [
      {
        insightType: 'summary' as const,
        insightText: aiEnabled
          ? '⏳ AI summary generation in progress...'
          : `Last 30 days: ${totalRecent} feedback items received (${trendPct >= 0 ? '+' : ''}${trendPct}% vs prior period).`,
        metadata: metadataString, // Pass the stringified JSON here
      },
      {
        insightType: 'trend' as const,
        insightText: aiEnabled
          ? '⏳ AI trend analysis in progress...'
          : `Most reported category: "${topCat}". High priority items: ${highPriorityCount}.`,
        metadata: metadataString, // Pass the stringified JSON here
      },
      {
        insightType: 'anomaly' as const,
        insightText: aiEnabled
          ? '⏳ AI anomaly detection in progress...'
          : `Average resolution time: ${avgDays} days.`,
        metadata: metadataString, // Pass the stringified JSON here
      },
    ];

    const created = await Promise.all(
      insightsToCreate.map((i) =>
        prisma.aiInsight.create({
          data: {
            ...i,
            periodStart: thirtyDaysAgo,
            periodEnd: new Date(),
            isActive: true,
          },
        })
      )
    );

    if (aiEnabled) {
      logger.info('AI_INSIGHTS_ENABLED is true but no AI service is wired yet.');
    }

    res.json({ message: 'Insights generated successfully', count: created.length, insights: created });
  } catch (err) {
    logger.error("Error generating insights:", err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;