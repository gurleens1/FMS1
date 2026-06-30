import { Router, Response } from 'express';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

const router = Router();

// Only SuperAdmin can manage categories
const SUPER_ONLY = ['SuperAdmin'];

/* ────────── CATEGORY ENDPOINTS ────────── */

// GET all categories with their primary assignees
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        primaryAssignees: {
          include: {
            assignee: {
              include: {
                employee: {
                  select: {
                    id: true,
                    fullName: true,
                    employeeCode: true,
                    department: true,
                    designation: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST create a new category
router.post('/', requireRole(...SUPER_ONLY), async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body as { name: string };
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }
  try {
    const existing = await prisma.category.findFirst({ where: { name: { equals: name.trim() } } });
    if (existing) {
      res.status(400).json({ error: 'Category already exists' });
      return;
    }
    const category = await prisma.category.create({
      data: { name: name.trim() },
      include: {
        primaryAssignees: {
          include: {
            assignee: {
              include: {
                employee: true,
              },
            },
          },
        },
      },
    });
    res.status(201).json(category);
  } catch (error) {
    logger.error('Error creating category', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PATCH update a category name
router.patch('/:id', requireRole(...SUPER_ONLY), async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { name } = req.body as { name: string };
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }
  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name: name.trim() },
      include: {
        primaryAssignees: {
          include: {
            assignee: {
              include: {
                employee: true,
              },
            },
          },
        },
      },
    });
    res.json(updated);
  } catch (error) {
    logger.error('Error updating category', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE a category (cascades to category_assignees)
router.delete('/:id', requireRole(...SUPER_ONLY), async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    logger.error('Error deleting category', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/* ────────── CATEGORY-ASSIGNEE MAPPING ENDPOINTS ────────── */

// GET all assignees for a specific category
router.get('/:categoryId/assignees', requireRole(...SUPER_ONLY), async (req: AuthenticatedRequest, res: Response) => {
  const categoryId = parseInt(req.params.categoryId);
  try {
    const mappings = await prisma.categoryAssignee.findMany({
      where: { categoryId },
      include: {
        assignee: {
          include: {
            employee: {
              select: {
                id: true,
                fullName: true,
                employeeCode: true,
                department: true,
                designation: true,
              },
            },
          },
        },
      },
    });
    res.json(mappings);
  } catch (error) {
    logger.error('Error fetching category assignees', error);
    res.status(500).json({ error: 'Failed to fetch assignees' });
  }
});

// POST assign primary assignee to category
router.post('/:categoryId/assignees', requireRole(...SUPER_ONLY), async (req: AuthenticatedRequest, res: Response) => {
  const categoryId = parseInt(req.params.categoryId);
  const { assigneeId } = req.body as { assigneeId: number };

  if (!assigneeId) {
    res.status(400).json({ error: 'Assignee ID is required' });
    return;
  }

  try {
    // Check if category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // Check if assignee exists
    const assignee = await prisma.userRoleModel.findUnique({ where: { id: assigneeId } });
    if (!assignee) {
      res.status(404).json({ error: 'Assignee not found' });
      return;
    }

    // Check if mapping already exists
    const existing = await prisma.categoryAssignee.findUnique({
      where: {
        categoryId_assigneeId: { categoryId, assigneeId },
      },
    });

    if (existing) {
      res.status(400).json({ error: 'Assignee already assigned to this category' });
      return;
    }

    const mapping = await prisma.categoryAssignee.create({
      data: { categoryId, assigneeId },
      include: {
        assignee: {
          include: {
            employee: true,
          },
        },
      },
    });
    res.status(201).json(mapping);
  } catch (error) {
    logger.error('Error assigning category to assignee', error);
    res.status(500).json({ error: 'Failed to assign assignee' });
  }
});

// DELETE remove assignee from category
router.delete('/:categoryId/assignees/:assigneeId', requireRole(...SUPER_ONLY), async (req: AuthenticatedRequest, res: Response) => {
  const categoryId = parseInt(req.params.categoryId);
  const assigneeId = parseInt(req.params.assigneeId);

  try {
    await prisma.categoryAssignee.delete({
      where: {
        categoryId_assigneeId: { categoryId, assigneeId },
      },
    });
    res.json({ message: 'Assignee removed from category successfully' });
  } catch (error) {
    logger.error('Error removing assignee from category', error);
    res.status(500).json({ error: 'Failed to remove assignee' });
  }
});

export default router;

