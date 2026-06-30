import prisma from './prisma';
import bcrypt from 'bcryptjs';
import { logger } from './logger';

export async function autoSeedCategoriesAndAssignees() {
  try {
    logger.info('Checking and initializing Category/Assignee data...');
    const hashedPassword = await bcrypt.hash('damco@123', 10);

    /* ═════════════════════════════════════════════════════ */
    /* 1. CORE SYSTEM USERS                                 */
    /* ═════════════════════════════════════════════════════ */

    const superAdmin = await prisma.employee.upsert({
      where: { email: 'superadmin@damcogroup.com' },
      update: { fullName: 'Super Admin' },
      create: {
        employeeCode: 'ADMIN-001',
        fullName: 'Super Admin',
        email: 'superadmin@damcogroup.com',
        department: 'Management',
        designation: 'System Administrator',
        joiningDate: new Date(),
      },
    });

    await prisma.userRoleModel.upsert({
      where: { email: 'superadmin@damcogroup.com' },
      update: { password: hashedPassword, role: 'SuperAdmin' },
      create: {
        employeeId: superAdmin.id,
        email: 'superadmin@damcogroup.com',
        role: 'SuperAdmin', 
        password: hashedPassword,
        isActive: true,
      },
    });

    const admin = await prisma.employee.upsert({
      where: { email: 'gurleens1@damcogroup.com' },
      update: { fullName: 'Gurleen' },
      create: {
        employeeCode: 'ADMIN-002',
        fullName: 'Gurleen',
        email: 'gurleens1@damcogroup.com',
        department: 'Operations',
        designation: 'Administrator',
        joiningDate: new Date('2025-03-24T00:00:00.000Z'),
      },
    });

    await prisma.userRoleModel.upsert({
      where: { email: 'gurleens1@damcogroup.com' },
      update: { password: hashedPassword, role: 'Admin' },
      create: {
        employeeId: admin.id,
        email: 'gurleens1@damcogroup.com',
        role: 'Admin',
        password: hashedPassword,
        isActive: true,
      },
    });

    /* ═════════════════════════════════════════════════════ */
    /* 2. PRIMARY ASSIGNEES                                 */
    /* ═════════════════════════════════════════════════════ */

    const assigneesList = [
      { email: 'avnigupta@damcogroup.com', name: 'Avni Gupta', code: 'EMP-002', dept: 'HR' },
      { email: 'rachnakohli@damcogroup.com', name: 'Rachna Kohli', code: 'EMP-003', dept: 'Operations' },
      { email: 'neha@damcogroup.com', name: 'Neha', code: 'EMP-004', dept: 'Management' },
      { email: 'praketpati@damcogroup.com', name: 'Praket Pati Tiwari', code: 'EMP-005', dept: 'L&D' },
      { email: 'monikakataria@damcogroup.com', name: 'Monika Kataria', code: 'EMP-006', dept: 'Facilities' },
      { email: 'siddharthshanker@damcogroup.com', name: 'Siddharth Shanker Dwivedi', code: 'EMP-007', dept: 'Finance' },
      { email: 'jessicay@damcogroup.com', name: 'Jessica Gibson Yadav', code: 'EMP-001', dept: 'Support' },
      { email: 'tulikamukherjee@damcogroup.com', name: 'Tulika Mukherjee', code: 'EMP-008', dept: 'Wellness' },
    ];

    const assigneeUsersMap: Record<string, number> = {};

    for (const item of assigneesList) {
      const emp = await prisma.employee.upsert({
        where: { email: item.email },
        update: { fullName: item.name, department: item.dept },
        create: {
          employeeCode: item.code,
          fullName: item.name,
          email: item.email,
          department: item.dept,
          designation: 'Primary Assignee',
          joiningDate: new Date(),
        },
      });

      const userRole = await prisma.userRoleModel.upsert({
        where: { email: item.email },
        update: { password: hashedPassword, role: 'Assignee' },
        create: {
          employeeId: emp.id,
          email: item.email,
          role: 'Assignee',
          password: hashedPassword,
          isActive: true,
        },
      });

      assigneeUsersMap[item.name] = userRole.id;
    }

    /* ═════════════════════════════════════════════════════ */
    /* 3. CATEGORIES & MAPPINGS                             */
    /* ═════════════════════════════════════════════════════ */

    const categoryMappings = [
      { category: 'IT Infrastructure', assignee: 'Avni Gupta' },
      { category: 'Workplace Relationships', assignee: 'Avni Gupta' },
      { category: 'Work-life Balance', assignee: 'Rachna Kohli' },
      { category: 'Leave and Attendance', assignee: 'Rachna Kohli' },
      { category: 'Performance Management', assignee: 'Neha' },
      { category: 'L&D', assignee: 'Praket Pati Tiwari' },
      { category: 'R&R', assignee: 'Neha' },
      { category: 'Admin & Facilities', assignee: 'Monika Kataria' },
      { category: 'Organization Policies', assignee: 'Rachna Kohli' },
      { category: 'Top Management', assignee: 'Avni Gupta' },
      { category: 'Finance', assignee: 'Avni Gupta' },
      { category: 'Compensation & Benefits', assignee: 'Siddharth Shanker Dwivedi' },
      { category: 'Recruitment', assignee: 'Avni Gupta' },
      { category: 'Onboarding', assignee: 'Rachna Kohli' },
      { category: 'Internal Communication', assignee: 'Jessica Gibson Yadav' },
      { category: 'Diversity & Inclusion', assignee: 'Jessica Gibson Yadav' },
      { category: 'Health & Safety', assignee: 'Monika Kataria' },
      { category: 'Employee Engagement', assignee: 'Monika Kataria' },
      { category: 'Career Progression', assignee: 'Neha' },
      { category: 'Mental Health & Wellbeing', assignee: 'Tulika Mukherjee' },
      { category: 'Manager Behavior', assignee: 'Avni Gupta' },
      { category: 'Project/Work Alignment', assignee: 'Rachna Kohli' },
      { category: 'Social Impact', assignee: 'Avni Gupta' },
      { category: 'N&B', assignee: 'Avni Gupta' },
    ];

    for (const mapping of categoryMappings) {
      // Create or lookup the category
      const cat = await prisma.category.upsert({
        where: { name: mapping.category },
        update: {},
        create: { name: mapping.category },
      });

      // Find the primary assignee user record
      const assigneeUserId = assigneeUsersMap[mapping.assignee];
      if (assigneeUserId) {
        // Upsert CategoryAssignee relationship to avoid duplicate entries
        await prisma.categoryAssignee.upsert({
          where: {
            categoryId_assigneeId: { categoryId: cat.id, assigneeId: assigneeUserId }
          },
          update: {},
          create: {
            categoryId: cat.id,
            assigneeId: assigneeUserId,
          }
        });
      }
    }

    logger.info('✅ Automatically verified and initialized Category/Assignee data!');
  } catch (error) {
    logger.error('Failed to run automated Category/Assignee verification:', error);
  }
}
