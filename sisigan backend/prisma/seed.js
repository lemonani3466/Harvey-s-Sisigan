// prisma/seed.js
// Seeds the database with initial Sisigan Restaurant data

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Sisigan Restaurant POS...\n');

    // ── Branches ──────────────────────────────────────────
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Lumban Branch',
        address: 'Lumban',
        city: 'Laguna',
        contactNo: '09171234001',
      },
    }),
    prisma.branch.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Pagsanjan Branch',
        address: 'Pagsanjan',
        city: 'Laguna',
        contactNo: '09171234002',
      },
    }),
    prisma.branch.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Paete Branch',
        address: 'Paete',
        city: 'Laguna',
        contactNo: '09171234003',
      },
    }),
  ]);
  console.log(`✅ Created ${branches.length} branches`);

  // ── Owner (oversees all branches) ─────────────────────
  const ownerPassword = await bcrypt.hash('owner123', 12);
  await prisma.user.upsert({
    where: { email: 'owner@sisigan.ph' },
    update: {},
    create: {
      name: 'Sisigan Owner',
      email: 'owner@sisigan.ph',
      password: ownerPassword,
      role: 'OWNER',
      branchId: 1, // Owner is seated at Branch 1 but sees all
    },
  });

  // ── Manager User ───────────────────────────────────────
  const managerPassword = await bcrypt.hash('manager123', 12);
  await prisma.user.upsert({
    where: { email: 'manager@sisigan.ph' },
    update: {},
    create: {
      name: 'Sisigan Manager',
      email: 'manager@sisigan.ph',
      password: managerPassword,
      role: 'MANAGER',
      branchId: 1,
    },
  });

  // Cashier per branch
  const cashierPassword = await bcrypt.hash('cashier123', 12);
  const cashiers = await Promise.all(
    branches.map((branch, i) =>
      prisma.user.upsert({
        where: { email: `cashier${i + 1}@sisigan.ph` },
        update: {},
        create: {
          name: `Cashier Branch ${i + 1}`,
          email: `cashier${i + 1}@sisigan.ph`,
          password: cashierPassword,
          role: 'CASHIER',
          branchId: branch.id,
        },
      })
    )
  );
  console.log(`✅ Created owner + manager + ${cashiers.length} cashiers`);

  // ── Menu Categories ────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({ where: { id: 1 }, update: { name: 'Barkada Meals', sortOrder: 1 }, create: { id: 1, name: 'Barkada Meals', sortOrder: 1 } }),
    prisma.category.upsert({ where: { id: 2 }, update: { name: 'Combo Meals',   sortOrder: 2 }, create: { id: 2, name: 'Combo Meals',   sortOrder: 2 } }),
    prisma.category.upsert({ where: { id: 3 }, update: { name: 'Silog Meals',   sortOrder: 3 }, create: { id: 3, name: 'Silog Meals',   sortOrder: 3 } }),
    prisma.category.upsert({ where: { id: 4 }, update: { name: 'Pizza',         sortOrder: 4 }, create: { id: 4, name: 'Pizza',         sortOrder: 4 } }),
    prisma.category.upsert({ where: { id: 5 }, update: { name: 'Add-ons',       sortOrder: 5 }, create: { id: 5, name: 'Add-ons',       sortOrder: 5 } }),
  ]);
  console.log(`✅ Created/updated ${categories.length} categories`);

  // ── Menu Items (from Menu.xlsx) ────────────────────────
  // Note: Crispy Sisig Barkada has two price variants — using 130 as base price.
  // Note: Duplicate "Crispy Bagnet" removed, keeping one entry.
  const menuItems = [
    // Barkada Meals (categoryId: 1)
    { name: 'Beef Bulalo',                price: 160,  categoryId: 1 },
    { name: 'Pancit Bihon Guisado',       price: 135,  categoryId: 1 },
    { name: 'Crispy Chicharon Bulaklak',  price: 130,  categoryId: 1 },
    { name: 'Crispy Dinakdakan',          price: 145,  categoryId: 1 },
    { name: 'Crispy Sisig Barkada',       price: 130,  categoryId: 1, description: '130 / 142 with egg' },
    { name: 'Calamares',                  price: 145,  categoryId: 1 },
    { name: 'Pancit Canton Guisado',      price: 135,  categoryId: 1 },
    { name: 'Shanghai',                   price: 145,  categoryId: 1 },
    { name: 'Garlic Butter Bangus',       price: 199,  categoryId: 1 },
    { name: 'Crispy Bagnet',              price: 130,  categoryId: 1 },

    // Combo Meals (categoryId: 2)
    { name: 'CM1 Egg + Rice + Hungarian + Sisig',   price: 145, categoryId: 2 },
    { name: 'CM2 Egg + Rice + Nuggets + Sisig',     price: 145, categoryId: 2 },
    { name: 'CM3 Egg + Rice + Shanghai + Sisig',    price: 145, categoryId: 2 },
    { name: 'CM4 Egg + Rice + Bagnet + Nuggets',    price: 145, categoryId: 2 },
    { name: 'CM5 Egg + Rice + Bagnet + Sisig',      price: 145, categoryId: 2 },
    { name: 'CM6 Egg + Rice + Hotdog + Sisig',      price: 125, categoryId: 2 },
    { name: 'CM7 Egg + Rice + Bagnet + Hotdog',     price: 125, categoryId: 2 },
    { name: 'CM8 Egg + Rice + Bagnet + Hungarian',  price: 145, categoryId: 2 },

    // Silog Meals (categoryId: 3)
    { name: 'Sisilog',        price: 89,  categoryId: 3 },
    { name: 'Bagnetsilog',    price: 89,  categoryId: 3 },
    { name: 'Hungarian Silog',price: 89,  categoryId: 3 },
    { name: 'Shanghaisilog',  price: 89,  categoryId: 3 },
    { name: 'Nuggets Silog',  price: 89,  categoryId: 3 },
    { name: 'Hotsilog',       price: 65,  categoryId: 3 },
    { name: 'Siomaisilog',    price: 50,  categoryId: 3 },
    { name: 'Siomairice',     price: 39,  categoryId: 3 },
    { name: 'Dinakdakansilog',price: 99,  categoryId: 3 },
    { name: 'Chicksilog',     price: 110, categoryId: 3 },
    { name: 'Bangsilog',      price: 110, categoryId: 3 },
    { name: 'Porksilog',      price: 110, categoryId: 3 },

    // Pizza (categoryId: 4)
    { name: '4 in 1',         price: 89, categoryId: 4 },
    { name: 'Double Cheese',  price: 79, categoryId: 4 },
    { name: 'Shawarma',       price: 89, categoryId: 4 },
    { name: 'Hawaiian',       price: 89, categoryId: 4 },
    { name: 'Beefy Mushroom', price: 89, categoryId: 4 },
    { name: 'Ham and Cheese', price: 79, categoryId: 4 },
    { name: 'Bacon',          price: 89, categoryId: 4 },
    { name: 'Pepperoni',      price: 89, categoryId: 4 },
  ];

  let createdItems = 0;
  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: createdItems + 1 },
      update: {},
      create: { ...item, id: createdItems + 1 },
    });
    createdItems++;
  }
  console.log(`✅ Created ${createdItems} menu items`);

  console.log('\n🎉 Seeding complete!\n');
  console.log('📋 Login credentials:');
  console.log('   Owner:  owner@sisigan.ph   / owner123');
  console.log('   Manager:  manager@sisigan.ph      / manager123');
  console.log('   Cashier1: cashier1@sisigan.ph   / cashier123');
  console.log('   Cashier2: cashier2@sisigan.ph   / cashier123');
  console.log('   Cashier3: cashier3@sisigan.ph   / cashier123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });