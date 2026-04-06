const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status, department, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (department) where.department = { contains: department, mode: 'insensitive' };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { employeeId: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    const employees = await prisma.employee.findMany({
      where,
      include: {
        assignments: { where: { asset: { status: 'IN_USE' } }, include: { asset: true } }
      },
      orderBy: { name: 'asc' },
    });
    res.json(employees);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: { include: { asset: true }, orderBy: { createdAt: 'desc' } },
        returns: { include: { asset: true }, orderBy: { createdAt: 'desc' } },
        requests: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const employee = await prisma.employee.create({ data: req.body });
    res.status(201).json(employee);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Employee ID or email already exists' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const employee = await prisma.employee.update({ where: { id: req.params.id }, data: req.body });
    res.json(employee);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.json({ message: 'Employee deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
