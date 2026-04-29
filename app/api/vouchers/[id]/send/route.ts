import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

// === EXACT SAME TRANSPORTER AS WORKING TRANSFERS API ===
const transporter = nodemailer.createTransport({
  host: '84.16.249.171',
  port: 465,
  secure: true,
  auth: {
    user: 'marketing@jaetravel.co.ke',
    pass: '3t9caO[z${}%n&3u',
  },
  tls: { rejectUnauthorized: false },
});

// Verify only once (optional, helps debug)
transporter.verify((err) => {
  if (err) console.error('SMTP verify failed:', err.message);
  else console.log('SMTP ready for vouchers');
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const voucher = await prisma.voucher.findUnique({
      where: { id: params.id },
      include: {
        booking: { include: { client: true } },
        property: true,
        vehicle: true,
      },
    });
    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const voucherLink = `${baseUrl}/dashboard/vouchers/${voucher.id}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Jae Travel Expeditions</h2>
        <p>Dear ${voucher.clientName || 'Client'},</p>
        <p>Your voucher ${voucher.voucherNo} is ready.</p>
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <tr><td style="padding:8px; background:#fef3c7;">Voucher No</td><td>${voucher.voucherNo}</td></tr>
          <tr><td style="padding:8px; background:#fef3c7;">Type</td><td>${voucher.type}</td></tr>
          <tr><td style="padding:8px; background:#fef3c7;">Client</td><td>${voucher.clientName || '—'}</td></tr>
          ${voucher.hotelName ? `<tr><td style="padding:8px; background:#fef3c7;">Hotel</td><td>${voucher.hotelName}</td></tr>` : ''}
          ${voucher.checkIn ? `<tr><td style="padding:8px; background:#fef3c7;">Check In</td><td>${new Date(voucher.checkIn).toLocaleDateString()}</td></tr>` : ''}
        </table>
        <p><a href="${voucherLink}" style="background:#ea580c; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">View Voucher Online</a></p>
        <p>Thank you,<br>Jae Travel Expeditions</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Jae Travel Expeditions" <info@jaetravel.co.ke>`,
      to: email,
      subject: `Voucher ${voucher.voucherNo} from Jae Travel`,
      html,
    });

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}