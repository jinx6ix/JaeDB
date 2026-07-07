// lib/agents/notify.ts
// Shared "📢 notify" channel for agents. Two modes:
//   - 'log'   → just recorded as a notify-kind AgentMessage, shown in the UI.
//   - 'email' → also sent for real via the same SMTP transport vouchers use.
//
// SECURITY NOTE: the original voucher-send route had SMTP credentials
// hardcoded in source (app/api/vouchers/[id]/send/route.ts). This helper
// reads them from env vars instead — set these in .env before using 'email':
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// Consider updating the voucher route to use this same helper/env vars.

import nodemailer from 'nodemailer';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST / SMTP_USER / SMTP_PASS are not set — cannot send email notifications.');
  }
  transporter = nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
  return transporter;
}

export async function sendNotificationEmail(to: string, subject: string, body: string): Promise<void> {
  const t = getTransporter();
  await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text: body,
  });
}
