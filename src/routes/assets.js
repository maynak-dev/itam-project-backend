const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET all assets with filters
router.get('/', async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) where.OR = [
      { assetId: { contains: search, mode: 'insensitive' } },
      { assetType: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
    ];
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: { assignments: { include: { employee: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.asset.count({ where }),
    ]);
    res.json({ assets, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single asset
router.get('/:id', async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: { include: { employee: true }, orderBy: { createdAt: 'desc' } },
        returns: { include: { employee: true }, orderBy: { createdAt: 'desc' } },
        maintenance: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CREATE asset
router.post('/', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const data = req.body;
    const asset = await prisma.asset.create({
      data: {
        ...data,
        assetId: data.assetId || `ASSET-${uuidv4().slice(0, 8).toUpperCase()}`,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      },
    });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'CREATE', entity: 'Asset', entityId: asset.id, details: data }
    });
    res.status(201).json(asset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// UPDATE asset
router.put('/:id', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const data = req.body;
    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data: {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      },
    });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'UPDATE', entity: 'Asset', entityId: asset.id, details: data }
    });
    res.json(asset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE asset
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.asset.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'DELETE', entity: 'Asset', entityId: req.params.id }
    });
    res.json({ message: 'Asset deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
