const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      include: { asset: true, employee: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(assignments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const data = req.body;
    const assignment = await prisma.$transaction(async (tx) => {
      const a = await tx.assignment.create({
        data: {
          ...data,
          assignmentId: `ASGN-${uuidv4().slice(0, 8).toUpperCase()}`,
          expectedReturn: data.expectedReturn ? new Date(data.expectedReturn) : undefined,
        },
        include: { asset: true, employee: true },
      });
      await tx.asset.update({ where: { id: data.assetId }, data: { status: 'IN_USE' } });
      await tx.auditLog.create({
        data: { userId: req.user.id, action: 'ASSIGN', entity: 'Assignment', entityId: a.id, details: data }
      });
      return a;
    });
    res.status(201).json(assignment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const assignment = await prisma.assignment.update({
      where: { id: req.params.id },
      data: { acknowledged: true },
    });
    res.json(assignment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
