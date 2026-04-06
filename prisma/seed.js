const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo users
  const demoUsers = [
    { email: 'admin@company.com', role: 'ADMIN', employee: { employeeId: 'EMP-001', name: 'Admin User', department: 'IT', designation: 'System Administrator', email: 'admin@company.com' } },
    { email: 'it@company.com', role: 'IT_TEAM', employee: { employeeId: 'EMP-002', name: 'IT Support', department: 'IT', designation: 'IT Engineer', email: 'it@company.com' } },
    { email: 'manager@company.com', role: 'MANAGER', employee: { employeeId: 'EMP-003', name: 'John Manager', department: 'Operations', designation: 'Operations Manager', email: 'manager@company.com' } },
    { email: 'employee@company.com', role: 'EMPLOYEE', employee: { employeeId: 'EMP-004', name: 'Jane Employee', department: 'Sales', designation: 'Sales Executive', email: 'employee@company.com' } },
  ];

  for (const u of demoUsers) {
    const hashed = await bcrypt.hash('password123', 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password: hashed,
        role: u.role,
        employee: { create: u.employee },
      },
    });
    console.log(`Created user: ${u.email}`);
  }

  // Create some sample assets
  const assets = [
    { assetId: 'ASSET-L001', assetType: 'Laptop', category: 'HARDWARE', brand: 'Dell', model: 'Latitude 5520', serialNumber: 'SN-L001', status: 'AVAILABLE', location: 'Head Office', warrantyExpiry: new Date('2026-06-30') },
    { assetId: 'ASSET-L002', assetType: 'Laptop', category: 'HARDWARE', brand: 'HP', model: 'EliteBook 840', serialNumber: 'SN-L002', status: 'IN_USE', location: 'Branch A', warrantyExpiry: new Date('2025-12-31') },
    { assetId: 'ASSET-D001', assetType: 'Desktop', category: 'HARDWARE', brand: 'Lenovo', model: 'ThinkCentre M70', serialNumber: 'SN-D001', status: 'AVAILABLE', location: 'Head Office' },
    { assetId: 'ASSET-P001', assetType: 'Printer', category: 'HARDWARE', brand: 'HP', model: 'LaserJet Pro', serialNumber: 'SN-P001', status: 'REPAIR', location: 'Head Office' },
    { assetId: 'ASSET-S001', assetType: 'Software', category: 'SOFTWARE', brand: 'Microsoft', model: 'Office 365', status: 'AVAILABLE' },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { assetId: asset.assetId },
      update: {},
      create: asset,
    });
    console.log(`Created asset: ${asset.assetId}`);
  }

  // Create a sample license
  await prisma.license.upsert({
    where: { licenseId: 'LIC-MS365' },
    update: {},
    create: {
      licenseId: 'LIC-MS365',
      softwareName: 'Microsoft 365 Business',
      licenseKey: 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
      totalUsers: 10,
      purchaseDate: new Date('2024-01-01'),
      expiryDate: new Date('2026-12-31'),
      status: 'ACTIVE',
    },
  });

  console.log('Seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
