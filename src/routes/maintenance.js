const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const tickets = await prisma.maintenance.findMany({
      where,
      include: { asset: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const data = req.body;
    const ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.maintenance.create({
        data: {
          ...data,
          ticketId: `MNT-${uuidv4().slice(0, 8).toUpperCase()}`,
          resolutionDate: data.resolutionDate ? new Date(data.resolutionDate) : undefined,
        },
        include: { asset: true },
      });
      await tx.asset.update({ where: { id: data.assetId }, data: { status: 'REPAIR' } });
      return t;
    });
    res.status(201).json(ticket);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const data = req.body;
    const ticket = await prisma.maintenance.update({
      where: { id: req.params.id },
      data: {
        ...data,
        resolutionDate: data.resolutionDate ? new Date(data.resolutionDate) : undefined,
      },
    });
    // If closed, set asset back to available
    if (data.status === 'CLOSED' && ticket.assetId) {
      await prisma.asset.update({ where: { id: ticket.assetId }, data: { status: 'AVAILABLE' } });
    }
    res.json(ticket);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.maintenance.delete({ where: { id: req.params.id } });
    res.json({ message: 'Ticket deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
