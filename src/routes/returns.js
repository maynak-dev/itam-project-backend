const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const returns = await prisma.assetReturn.findMany({
      include: { asset: true, employee: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(returns);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const data = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const ret = await tx.assetReturn.create({
        data: {
          ...data,
          returnId: `RET-${uuidv4().slice(0, 8).toUpperCase()}`,
        },
        include: { asset: true, employee: true },
      });
      // Update asset status based on action
      const statusMap = { REASSIGN: 'AVAILABLE', REPAIR: 'REPAIR', RETIRE: 'RETIRED' };
      await tx.asset.update({
        where: { id: data.assetId },
        data: { status: statusMap[data.actionTaken] || 'AVAILABLE' },
      });
      await tx.auditLog.create({
        data: { userId: req.user.id, action: 'RETURN', entity: 'AssetReturn', entityId: ret.id, details: data }
      });
      return ret;
    });
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
