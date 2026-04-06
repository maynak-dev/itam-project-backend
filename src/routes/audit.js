const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('ADMIN', 'IT_TEAM'));

router.get('/', async (req, res) => {
  try {
    const { entity, page = 1, limit = 50 } = req.query;
    const where = entity ? { entity } : {};
    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit),
    });
    const total = await prisma.auditLog.count({ where });
    res.json({ logs, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
