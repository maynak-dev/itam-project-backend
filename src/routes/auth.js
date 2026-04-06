const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, employeeData } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: role || 'EMPLOYEE',
        ...(employeeData && {
          employee: { create: employeeData }
        })
      },
      include: { employee: true }
    });
    const { password: _, ...safe } = user;
    res.status(201).json(safe);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, include: { employee: true } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, employeeId: user.employee?.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password: _, ...safe } = user;
    res.json({ token, user: safe });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { employee: true }
    });
    const { password: _, ...safe } = user;
    res.json(safe);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
