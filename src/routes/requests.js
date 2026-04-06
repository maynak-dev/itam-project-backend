const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    // Employees can only see their own requests
    if (req.user.role === 'EMPLOYEE' && req.user.employeeId) {
      where.employeeId = req.user.employeeId;
    }
    const requests = await prisma.assetRequest.findMany({
      where,
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const request = await prisma.assetRequest.create({
      data: {
        ...data,
        requestId: `REQ-${uuidv4().slice(0, 8).toUpperCase()}`,
        requiredDate: data.requiredDate ? new Date(data.requiredDate) : undefined,
      },
      include: { employee: true },
    });
    res.status(201).json(request);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manager approves/rejects
router.patch('/:id/manager-approval', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { approved } = req.body;
    const request = await prisma.assetRequest.update({
      where: { id: req.params.id },
      data: {
        managerApproval: approved,
        status: approved ? 'PENDING' : 'REJECTED',
      },
    });
    res.json(request);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// IT Team approves/rejects
router.patch('/:id/it-approval', authorize('ADMIN', 'IT_TEAM'), async (req, res) => {
  try {
    const { approved } = req.body;
    const request = await prisma.assetRequest.update({
      where: { id: req.params.id },
      data: {
        itApproval: approved,
        status: approved ? 'APPROVED' : 'REJECTED',
      },
    });
    res.json(request);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.assetRequest.delete({ where: { id: req.params.id } });
    res.json({ message: 'Request deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
