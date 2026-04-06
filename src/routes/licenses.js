const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const licenses = await prisma.license.findMany({
      include: { assignments: { include: { employee: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(licenses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const data = req.body;
    const license = await prisma.license.create({
      data: {
        ...data,
        licenseId: `LIC-${uuidv4().slice(0, 8).toUpperCase()}`,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
    });
    res.status(201).json(license);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const data = req.body;
    const license = await prisma.license.update({
      where: { id: req.params.id },
      data: {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
    });
    res.json(license);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Assign license to employee
router.post('/:id/assign', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const { employeeId } = req.body;
    const assignment = await prisma.licenseAssignment.create({
      data: { licenseId: req.params.id, employeeId },
      include: { employee: true, license: true },
    });
    res.status(201).json(assignment);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'License already assigned to this employee' });
    res.status(500).json({ error: e.message });
  }
});

// Revoke license from employee
router.delete('/:id/assign/:employeeId', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    await prisma.licenseAssignment.delete({
      where: { licenseId_employeeId: { licenseId: req.params.id, employeeId: req.params.employeeId } }
    });
    res.json({ message: 'License revoked' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.license.delete({ where: { id: req.params.id } });
    res.json({ message: 'License deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
