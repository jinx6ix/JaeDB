// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Load Safari Rates from the transformed SQL file.
 * The SQL file uses double-quoted camelCase columns to match Prisma schema.
 */
async function loadSafariRates() {
  const sqlFilePath = path.join(__dirname, 'data_for_sr_models.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.warn('⚠️  Safari Rates SQL file not found at', sqlFilePath, '- skipping.');
    return;
  }

  console.log('🔄 Loading Safari Rates (sr_* tables)...');
  const sql = fs.readFileSync(sqlFilePath, 'utf8');
  // Split by semicolon and execute each statement individually
  const statements = sql.split(';').filter(st => st.trim().length > 0);
  
  for (const st of statements) {
    await prisma.$executeRawUnsafe(st + ';');
  }
  
  console.log('✅ Safari Rates loaded successfully.');
}

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@jaetravel.co.ke' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@jaetravel.co.ke',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const empPassword = await bcrypt.hash('employee123', 12);
  await prisma.user.upsert({
    where: { email: 'antony@jaetravel.co.ke' },
    update: {},
    create: {
      name: 'Antony Waititu',
      email: 'antony@jaetravel.co.ke',
      password: empPassword,
      role: 'EMPLOYEE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'dedan@jaetravel.co.ke' },
    update: {},
    create: {
      name: 'Dedan Kimathi',
      email: 'dedan@jaetravel.co.ke',
      password: empPassword,
      role: 'EMPLOYEE',
    },
  });

  // Destinations
  await prisma.destination.upsert({
    where: { id: 'dest-masai-mara' },
    update: {},
    create: {
      id: 'dest-masai-mara',
      name: 'Masai Mara National Reserve',
      country: 'KENYA',
      description: 'One of the best places to watch wildlife anywhere in Kenya.',
      highlights: JSON.stringify(['Big Five', 'Wildebeest Migration', '500+ Bird Species', 'Classic Safari Landscapes']),
    },
  });

  await prisma.destination.upsert({
    where: { id: 'dest-amboseli' },
    update: {},
    create: {
      id: 'dest-amboseli',
      name: 'Amboseli National Park',
      country: 'KENYA',
      description: 'Famous for large elephant herds against the backdrop of Mt. Kilimanjaro.',
      highlights: JSON.stringify(['Large Elephant Herds', 'Mt. Kilimanjaro Views', 'Maasai Culture']),
    },
  });

  await prisma.destination.upsert({
    where: { id: 'dest-serengeti' },
    update: {},
    create: {
      id: 'dest-serengeti',
      name: 'Serengeti National Park',
      country: 'TANZANIA',
      description: 'World-famous for the annual wildebeest migration.',
      highlights: JSON.stringify(['Great Wildebeest Migration', 'Big Five', 'Endless Plains']),
    },
  });

  await prisma.destination.upsert({
    where: { id: 'dest-bwindi' },
    update: {},
    create: {
      id: 'dest-bwindi',
      name: 'Bwindi Impenetrable Forest',
      country: 'UGANDA',
      description: "UNESCO World Heritage Site home to half of the world's mountain gorilla population.",
      highlights: JSON.stringify(['Gorilla Trekking', 'UNESCO World Heritage', 'Bird Watching']),
    },
  });

  // Properties
  await prisma.property.upsert({
    where: { id: 'prop-ashnil' },
    update: {},
    create: {
      id: 'prop-ashnil',
      name: 'Ashnil Mara Camp',
      type: 'TENTED_CAMP',
      location: 'Masai Mara',
      country: 'KENYA',
      category: 4,
      email: 'reservations@ashnilhotels.com',
    },
  });

  await prisma.property.upsert({
    where: { id: 'prop-crocodile' },
    update: {},
    create: {
      id: 'prop-crocodile',
      name: 'Crocodile Camp',
      type: 'CAMP',
      location: 'Masai Mara',
      country: 'KENYA',
      category: 3,
    },
  });

  await prisma.property.upsert({
    where: { id: 'prop-leisure' },
    update: {},
    create: {
      id: 'prop-leisure',
      name: 'Leisure Apex',
      type: 'LODGE',
      location: 'Masai Mara',
      country: 'KENYA',
      category: 4,
    },
  });

  // Vehicles
  await prisma.vehicle.upsert({
    where: { id: 'veh-jeep-01' },
    update: {},
    create: {
      id: 'veh-jeep-01',
      name: 'Open-sided Jeep 01',
      type: 'OPEN_SIDED_JEEP',
      seats: 7,
      regPlate: 'KBZ 001X',
      ratePerDay: 26000,
      currency: 'KES',
    },
  });

  await prisma.vehicle.upsert({
    where: { id: 'veh-lc-01' },
    update: {},
    create: {
      id: 'veh-lc-01',
      name: 'Land Cruiser 01',
      type: 'LAND_CRUISER',
      seats: 7,
      regPlate: 'KCY 234A',
      ratePerDay: 35000,
      currency: 'KES',
    },
  });

  // Tour: 1-day Mara
  const mara1Day = await prisma.tourPackage.upsert({
    where: { id: 'tour-mara-1day' },
    update: {},
    create: {
      id: 'tour-mara-1day',
      title: '01 Day Trip Masai Mara National Reserve',
      description: 'A full day game drive in the world-famous Masai Mara.',
      durationDays: 1,
      durationNights: 0,
      countries: JSON.stringify(['KENYA']),
      highlights: JSON.stringify(['Masai Mara National Reserve', 'Big Five Spotting', 'Packed Bush Lunch', 'Full Day Game Drive']),
    },
  });

  await prisma.tourDay.deleteMany({ where: { tourPackageId: 'tour-mara-1day' } });
  await prisma.tourDay.create({
    data: {
      tourPackageId: 'tour-mara-1day',
      destinationId: 'dest-masai-mara',
      dayNumber: 1,
      title: 'Masai Mara National Reserve',
      description: 'Early morning transfer from Nairobi to Masai Mara. Full day game drive. Return in afternoon.',
      accommodation: 'No accommodation',
      mealPlan: JSON.stringify({ breakfast: false, lunch: true, dinner: false, note: 'Packed lunch' }),
      activities: JSON.stringify([
        { time: 'Early Morning', description: 'Transfer by Road, Nairobi to Masai Mara National Reserve' },
        { time: 'Mid Morning', description: 'Full day Game drive, Masai Mara National Reserve' },
        { time: 'Afternoon', description: 'Transfer by Road, Masai Mara National Reserve to Nairobi' },
      ]),
    },
  });

  await prisma.rateCard.upsert({
    where: { id: 'rate-mara-1day-low' },
    update: {},
    create: {
      id: 'rate-mara-1day-low',
      tourPackageId: 'tour-mara-1day',
      season: 'LOW',
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      basedOn2: 180,
      basedOn4: 160,
      basedOn6: 140,
      basedOn8: 130,
      basedOn10: 120,
      basedOn12: 110,
      markupPercent: 10,
      currency: 'USD',
      includes: JSON.stringify(['Transport', 'Park Entry Fees', 'Game Drive', 'Packed Lunch', 'Taxes/VAT']),
      excludes: JSON.stringify(['International Flights', 'Personal Items', 'Tips (US$10 pp/day)', 'Visa Fees', 'Maasai Village ($30/person)']),
    },
  });

  // Tour: 3-day Mara
  const mara3Day = await prisma.tourPackage.upsert({
    where: { id: 'tour-mara-3day' },
    update: {},
    create: {
      id: 'tour-mara-3day',
      title: '03 Days Masai Mara Safari',
      description: 'Three days of incredible game viewing in the Masai Mara.',
      durationDays: 3,
      durationNights: 2,
      countries: JSON.stringify(['KENYA']),
      highlights: JSON.stringify(['Masai Mara National Reserve', 'Big Five', 'Maasai Village', 'Luxury Tented Camp']),
    },
  });

  await prisma.tourDay.deleteMany({ where: { tourPackageId: 'tour-mara-3day' } });
  for (const day of [
    {
      num: 1, title: 'Nairobi to Masai Mara',
      desc: 'Morning departure from Nairobi. Arrive Mara for lunch. Afternoon game drive.',
      accomm: 'Ashnil Mara Camp',
      activities: JSON.stringify([{ time: 'Morning', description: 'Depart Nairobi early morning' }, { time: 'Afternoon', description: 'Check-in and afternoon game drive' }]),
      meals: JSON.stringify({ breakfast: false, lunch: true, dinner: true }),
    },
    {
      num: 2, title: 'Full Day Masai Mara',
      desc: 'Full day of game drives. Optional Maasai Village visit.',
      accomm: 'Ashnil Mara Camp',
      activities: JSON.stringify([{ time: 'Morning', description: 'Early morning game drive' }, { time: 'Afternoon', description: 'Evening game drive. Optional Maasai Village visit' }]),
      meals: JSON.stringify({ breakfast: true, lunch: true, dinner: true }),
    },
    {
      num: 3, title: 'Masai Mara to Nairobi',
      desc: 'Final morning game drive. Lunch and drive back to Nairobi.',
      accomm: 'No accommodation',
      activities: JSON.stringify([{ time: 'Morning', description: 'Final morning game drive' }, { time: 'Afternoon', description: 'Drive back to Nairobi' }]),
      meals: JSON.stringify({ breakfast: true, lunch: true, dinner: false }),
    },
  ]) {
    await prisma.tourDay.create({
      data: {
        tourPackageId: 'tour-mara-3day',
        destinationId: 'dest-masai-mara',
        dayNumber: day.num,
        title: day.title,
        description: day.desc,
        accommodation: day.accomm,
        mealPlan: day.meals,
        activities: day.activities,
      },
    });
  }

  await prisma.rateCard.upsert({
    where: { id: 'rate-mara-3day-low' },
    update: {},
    create: {
      id: 'rate-mara-3day-low',
      tourPackageId: 'tour-mara-3day',
      season: 'LOW',
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      basedOn2: 950,
      basedOn4: 850,
      basedOn6: 780,
      basedOn8: 720,
      basedOn10: 680,
      basedOn12: 650,
      markupPercent: 10,
      currency: 'USD',
      includes: JSON.stringify(['Accommodation (Full Board)', 'Transport', 'Park Entry Fees', 'Game Drives', 'All Meals', 'Taxes/VAT']),
      excludes: JSON.stringify(['International Flights', 'Personal Items', 'Tips', 'Visa Fees', 'Optional Activities']),
    },
  });

  // Sample client
  const client = await prisma.client.upsert({
    where: { id: 'client-christina' },
    update: {},
    create: {
      id: 'client-christina',
      name: 'Ms. Christina Cosandier',
      email: 'holiday.nbo4@satguru.com',
      nationality: 'Swiss',
      isResident: false,
      notes: 'Requires wheelchair accessible room/vehicle',
    },
  });

  // Sample booking
  const booking = await prisma.booking.upsert({
    where: { bookingRef: 'JTE-2026-001' },
    update: {},
    create: {
      bookingRef: 'JTE-2026-001',
      clientId: client.id,
      tourPackageId: mara3Day.id,
      assignedToId: admin.id,
      status: 'CONFIRMED',
      startDate: new Date('2026-05-27'),
      endDate: new Date('2026-05-30'),
      numAdults: 2,
      numChildren: 0,
      isResident: false,
      totalAmount: 1900,
      currency: 'USD',
      specialRequirements: 'Guest requires fully accessible room due to wheelchair use.',
    },
  });

  // Sample hotel voucher (matches JTE270526 from uploaded PDF)
  await prisma.voucher.upsert({
    where: { voucherNo: 'JTE270526' },
    update: {},
    create: {
      voucherNo: 'JTE270526',
      type: 'HOTEL',
      bookingId: booking.id,
      propertyId: 'prop-ashnil',
      createdById: admin.id,
      roomType: 'Standard Room FullBoard',
      checkIn: new Date('2026-05-27'),
      checkOut: new Date('2026-05-30'),
      numNights: 3,
      numAdults: 2,
      numChildren: 0,
      numTwins: 1,
      numDoubles: 0,
      numSingles: 0,
      numTriples: 0,
      clientName: 'Ms. Christina Cosandier',
      remarks: 'Guest requires fully accessible room due to wheelchair use.',
      issuedDate: new Date('2026-04-07'),
    },
  });

  // Sample vehicle voucher (for the Satguru open-sided jeep invoice)
  await prisma.voucher.upsert({
    where: { voucherNo: 'JTE030426' },
    update: {},
    create: {
      voucherNo: 'JTE030426',
      type: 'VEHICLE',
      bookingId: booking.id,
      vehicleId: 'veh-jeep-01',
      createdById: admin.id,
      vehicleType: 'OPEN_SIDED_JEEP',
      clientName: 'Satguru Travel',
      numAdults: 1,
      pickupDate: new Date('2026-04-03'),
      dropoffDate: new Date('2026-04-03'),
      pickupLocation: 'Nairobi',
      route: 'Nairobi → Masai Mara → Nairobi',
      rateKES: 26000,
      remarks: 'Open-sided Jeep Mara 3rd April 2026',
      issuedDate: new Date('2026-01-09'),
    },
  });

  // ── Load Safari Rates (sr_* tables) ──────────────────────────────────────
  await loadSafariRates();

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:    admin@jaetravel.co.ke / admin123');
  console.log('   Employee: antony@jaetravel.co.ke / employee123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });