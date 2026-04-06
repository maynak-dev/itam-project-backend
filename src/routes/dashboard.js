const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalAssets,
      inUse,
      available,
      underMaintenance,
      retired,
      pendingRequests,
      warrantyExpiringSoon,
      licenseExpiringSoon,
      recentAssignments,
      recentMaintenance,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'IN_USE' } }),
      prisma.asset.count({ where: { status: 'AVAILABLE' } }),
      prisma.asset.count({ where: { status: 'REPAIR' } }),
      prisma.asset.count({ where: { status: 'RETIRED' } }),
      prisma.assetRequest.count({ where: { status: 'PENDING' } }),
      prisma.asset.count({
        where: { warrantyExpiry: { gte: now, lte: thirtyDaysLater } }
      }),
      prisma.license.count({
        where: { expiryDate: { gte: now, lte: thirtyDaysLater } }
      }),
      prisma.assignment.findMany({
        take: 5,
        include: { asset: true, employee: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.maintenance.findMany({
        take: 5,
        where: { status: { not: 'CLOSED' } },
        include: { asset: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      stats: { totalAssets, inUse, available, underMaintenance, retired, pendingRequests },
      alerts: { warrantyExpiringSoon, licenseExpiringSoon },
      recentAssignments,
      recentMaintenance,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reports
router.get('/reports/asset-inventory', async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      include: { assignments: { include: { employee: true }, take: 1, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(assets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/reports/warranty-expiry', async (req, res) => {
  try {
    const now = new Date();
    const assets = await prisma.asset.findMany({
      where: { warrantyExpiry: { gte: now }, status: { not: 'RETIRED' } },
      orderBy: { warrantyExpiry: 'asc' },
    });
    res.json(assets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/reports/license-expiry', async (req, res) => {
  try {
    const now = new Date();
    const licenses = await prisma.license.findMany({
      where: { expiryDate: { gte: now } },
      include: { assignments: { include: { employee: true } } },
      orderBy: { expiryDate: 'asc' },
    });
    res.json(licenses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
