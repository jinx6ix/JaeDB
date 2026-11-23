# Jae Travel Expeditions — Operations System

A full-stack backend operations management system for Jae Travel Expeditions, built with Next.js 14, Prisma, SQLite, NextAuth, and Tailwind CSS.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd jae-travel-app
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="change-this-to-a-long-random-string"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Set up the database
```bash
npx prisma db push
npx prisma db seed
```

### 4. Start the development server
```bash
npm run dev
```

Visit **http://localhost:3000**

---

## 🔐 Default Login Credentials

| Role     | Email                      | Password      |
|----------|----------------------------|---------------|
| Admin    | admin@jaetravel.co.ke      | admin123      |
| Employee | antony@jaetravel.co.ke     | employee123   |
| Employee | dedan@jaetravel.co.ke      | employee123   |

> **Change all passwords before deploying to production!**

---

## ✨ Features

### Bookings Management
- Create, edit, and track bookings with full status workflow
- Link bookings to clients, tour packages, staff members
- Track financials: total, paid, balance due
- Auto-generate booking references (JTE-YYYY-XXXX)

### Client Database
- Full client profiles with nationality, resident status, special requirements
- Complete booking history per client
- Search by name, email, or phone

### Voucher System
**Hotel Vouchers** — exact format matching Ashnil Mara voucher (JTE270526):
- Hotel name, room type, client name
- Adults, children, room configuration (twins/doubles/singles/triples)
- Check-in/check-out dates, number of nights
- Remarks for special requirements (e.g. wheelchair access)
- Downloadable PDF with Jae Travel branding + orange logo

**Vehicle Vouchers** — for safari vehicle hire:
- Vehicle type (Open-sided Jeep, Land Cruiser, etc.)
- Pickup date, drop-off date, pickup location
- Route/destination, rate in KES
- Downloadable PDF

Both vouchers auto-numbered: `JTE` + DD + MM + YY format

### Itinerary Generator
- Auto-populates day-by-day from tour package template
- Fully editable per booking
- Renders full proposal document (matching SafariOffice style)
- Day, destination, accommodation, meals, activities
- PDF download button

### Rate Calculator
- Mirrors your Excel costing sheet structure
- "Based on 2 / 4 / 6 / 8 / 10 / 12 pax" pricing tiers
- Auto-selects correct bracket based on group size
- Shows all brackets with active one highlighted
- Park fees, transport, extras, markup %
- Grand total + per-person cost

### Tour Packages
- Create packages for all 7 East African countries
- Day-by-day activity templates
- Multiple rate cards per package (High/Low/Shoulder season)
- Includes/excludes lists

### Reports
- Revenue KPIs: total, collected, outstanding
- Bookings by status (bar chart)
- Top tour packages
- Vouchers issued
- Upcoming trips (next 30 days)
- Export all bookings to CSV

### Admin Panel
- User management (Admin only)
- Create/deactivate team members
- Role-based access control (Admin vs Employee)

---

## 🗂️ Database Models

| Model       | Description                              |
|-------------|------------------------------------------|
| User        | Staff accounts with Admin/Employee roles |
| Client      | Guest profiles                           |
| TourPackage | Tour templates with day-by-day schedules |
| TourDay     | Individual day activities/meals          |
| Destination | East African destinations                |
| Property    | Hotels, camps, lodges                    |
| Vehicle     | Safari vehicles with rates               |
| Booking     | Central booking record                   |
| Itinerary   | Generated day-by-day for a booking       |
| Voucher     | Hotel and vehicle vouchers               |
| RateCard    | Pax-based pricing per tour/season        |
| Invoice     | Financial invoices                       |
| CostSheet   | Cost calculation records                 |

---

## 🌍 Supported Countries

Kenya 🇰🇪 · Tanzania 🇹🇿 · Uganda 🇺🇬 · Rwanda 🇷🇼 · Ethiopia 🇪🇹 · Burundi 🇧🇮 · South Sudan 🇸🇸

---

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite via Prisma ORM
- **Auth**: NextAuth.js (credentials provider)
- **Styling**: Tailwind CSS
- **PDF**: @react-pdf/renderer
- **Forms**: Native React (no extra library needed)

---

## 🚢 Production Deployment

1. Replace SQLite with PostgreSQL in `prisma/schema.prisma`:
   ```
   provider = "postgresql"
   url = env("DATABASE_URL")
   ```

2. Set secure environment variables:
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/jaetravel"
   NEXTAUTH_SECRET="long-random-secret-min-32-chars"
   NEXTAUTH_URL="https://your-domain.com"
   ```

3. Build and start:
   ```bash
   npm run build
   npm start
   ```

---

## 📁 Project Structure

```
app/
├── dashboard/
│   ├── page.tsx              ← Dashboard home
│   ├── bookings/             ← Booking CRUD
│   ├── clients/              ← Client management
│   ├── vouchers/             ← Hotel & vehicle vouchers
│   ├── itineraries/          ← Itinerary generator
│   ├── tours/                ← Tour packages
│   ├── rates/                ← Rate cards + calculator
│   ├── reports/              ← Analytics & CSV export
│   └── admin/users/          ← User management (Admin only)
├── api/                      ← REST API routes
└── login/                    ← Auth page

components/
└── vouchers/
    ├── HotelVoucherPDF.tsx   ← Hotel voucher PDF template
    └── VehicleVoucherPDF.tsx ← Vehicle voucher PDF template

lib/
├── auth.ts                   ← NextAuth config
├── prisma.ts                 ← Prisma client
└── rates.ts                  ← Cost calculation utilities

prisma/
├── schema.prisma             ← Database schema
└── seed.ts                   ← Initial data
```
