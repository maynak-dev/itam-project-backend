require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const employeeRoutes = require('./routes/employees');
const requestRoutes = require('./routes/requests');
const assignmentRoutes = require('./routes/assignments');
const returnRoutes = require('./routes/returns');
const maintenanceRoutes = require('./routes/maintenance');
const licenseRoutes = require('./routes/licenses');
const dashboardRoutes = require('./routes/dashboard');
const auditRoutes = require('./routes/audit');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`ITAM API running on port ${PORT}`));

module.exports = app;
