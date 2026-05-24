// app/api/invoices/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Image as PDFImage,
} from '@react-pdf/renderer';

const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#ffffff', flexDirection: 'column' },
  header: { backgroundColor: '#1a1a2e', padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLogo: { width: 44, height: 44, backgroundColor: '#f97316', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerLogoTx: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { color: '#ffffff', fontSize: 13, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#fb923c', fontSize: 9, marginTop: 2 },
  headerDate: { color: '#9ca3af', fontSize: 8, marginTop: 2 },
  hero: { backgroundColor: '#f97316', padding: '14 24' },
  heroTitle: { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold' },
  heroMeta: { flexDirection: 'row', gap: 24, marginTop: 5, flexWrap: 'wrap' },
  heroMetaTxt: { color: '#fed7aa', fontSize: 9 },
  heroMetaVal: { color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  section: { padding: '14 24', borderBottom: '1 solid #f3f4f6' },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  body: { fontSize: 9, color: '#4b5563', lineHeight: 1.6 },
  bold: { fontFamily: 'Helvetica-Bold' },
  table: { margin: '8 0' },
  tHead: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottom: '1 solid #e5e7eb', paddingVertical: 6 },
  tRow: { flexDirection: 'row', borderBottom: '1 solid #f3f4f6', paddingVertical: 6 },
  tCell: { fontSize: 8, color: '#374151', paddingHorizontal: 6, flex: 1 },
  tCellHd: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', paddingHorizontal: 6, flex: 1 },
  tCellRight: { fontSize: 8, color: '#374151', paddingHorizontal: 6, flex: 1, textAlign: 'right' },
  tCellHdRight: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', paddingHorizontal: 6, flex: 1, textAlign: 'right' },
  footer: { backgroundColor: '#f9fafb', padding: '14 24', flexDirection: 'row', justifyContent: 'space-between' },
  footerLeft: { gap: 2 },
  footerRight: { alignItems: 'flex-end', gap: 2 },
  footerTxt: { fontSize: 8, color: '#6b7280' },
  footerBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  pageNum: { paddingHorizontal: 24, paddingBottom: 8, paddingTop: 4, fontSize: 8, color: '#9ca3af', textAlign: 'right' },
  totTable: { marginTop: 12, alignSelf: 'flex-end', width: 240 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 8 },
  totLabel: { fontSize: 9, color: '#6b7280' },
  totValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  totFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 2, borderTopColor: '#1a1a2e' },
  statusBadge: { fontSize: 8, fontFamily: 'Helvetica-Bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  statusDraft: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  statusSent: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  statusPartial: { backgroundColor: '#fef3c7', color: '#d97706' },
  statusPaid: { backgroundColor: '#d1fae5', color: '#059669' },
  statusOverdue: { backgroundColor: '#fee2e2', color: '#dc2626' },
  statusCancelled: { backgroundColor: '#f3f4f6', color: '#9ca3af' },
  notesBox: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 4, marginTop: 12 },
  notesLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#374151' },
  paymentBox: { backgroundColor: '#fffbeb', border: '1 solid #fde68a', borderRadius: 4, padding: 12, marginTop: 12 },
  paymentLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#d97706', marginBottom: 4 },
  paymentText: { fontSize: 9, color: '#374151', fontFamily: 'Helvetica' },
});

function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmt2(n: number): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseLineItems(raw: string | any[]): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'DRAFT': return S.statusDraft;
    case 'SENT': return S.statusSent;
    case 'PARTIAL': return S.statusPartial;
    case 'PAID': return S.statusPaid;
    case 'OVERDUE': return S.statusOverdue;
    case 'CANCELLED': return S.statusCancelled;
    default: return S.statusDraft;
  }
}

function InvoicePDF({ invoice }: { invoice: any }) {
  const lineItems = parseLineItems(invoice.lineItems);
  const balanceDue = (invoice.totalAmount || 0) - (invoice.amountPaid || 0);
  const isOverdue = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && new Date(invoice.dueDate) < new Date();

  const statusStyle = getStatusStyle(invoice.status);

  return React.createElement(Document, { title: `Invoice ${invoice.invoiceNo}` },
    React.createElement(Page, { size: 'A4', style: S.page },
      // Header
      React.createElement(View, { style: S.header },
        React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 10 } },
          React.createElement(View, { style: S.headerLogo }, React.createElement(Text, { style: S.headerLogoTx }, 'JT')),
          React.createElement(View, null,
            React.createElement(Text, { style: S.headerTitle }, 'Jae Travel Expeditions'),
            React.createElement(Text, { style: S.headerSub }, 'info@jaetravel.co.ke'),
            React.createElement(Text, { style: S.headerSub }, '+254 726 485228'),
          ),
        ),
        React.createElement(View, { style: S.headerRight },
          React.createElement(Text, { style: S.headerDate }, `Issued: ${fmt(invoice.invoiceDate)}`),
        ),
      ),

      // Hero with Invoice title
      React.createElement(View, { style: S.hero },
        React.createElement(Text, { style: S.heroTitle }, `INVOICE ${invoice.invoiceNo}`),
        React.createElement(View, { style: S.heroMeta },
          React.createElement(Text, { style: S.heroMetaTxt }, 'Status: ', React.createElement(Text, { style: S.heroMetaVal }, invoice.status)),
          React.createElement(Text, { style: S.heroMetaTxt }, 'Due: ', React.createElement(Text, { style: S.heroMetaVal }, fmt(invoice.dueDate))),
        ),
      ),

      // Bill To + Booking Reference
      React.createElement(View, { style: S.section },
        React.createElement(View, { style: { flexDirection: 'row', gap: 40 } },
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: S.sectionTitle }, 'Bill To'),
            React.createElement(Text, { style: S.body }, invoice.billTo),
            invoice.billToEmail && React.createElement(Text, { style: S.body }, invoice.billToEmail),
            invoice.billToPhone && React.createElement(Text, { style: S.body }, invoice.billToPhone),
          ),
          invoice.booking && React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: S.sectionTitle }, 'Booking Reference'),
            React.createElement(Text, { style: [S.body, S.bold] }, invoice.booking.bookingRef),
            React.createElement(Text, { style: S.body }, invoice.booking.client?.name),
            invoice.booking.tourPackage && React.createElement(Text, { style: S.body }, invoice.booking.tourPackage.title),
          ),
          !invoice.booking && invoice.client && React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: S.sectionTitle }, 'Client'),
            React.createElement(Text, { style: [S.body, S.bold] }, invoice.client.name),
            invoice.client.email && React.createElement(Text, { style: S.body }, invoice.client.email),
          ),
        ),
      ),

      // Line Items Table
      React.createElement(View, { style: S.section },
        React.createElement(Text, { style: S.sectionTitle }, 'Invoice Details'),
        React.createElement(View, { style: S.tHead },
          React.createElement(Text, { style: [S.tCellHd, { flex: 3 }] }, 'Description'),
          React.createElement(Text, { style: [S.tCellHdRight, { flex: 1 }] }, 'Qty'),
          React.createElement(Text, { style: [S.tCellHdRight, { flex: 1 }] }, 'Unit Price'),
          React.createElement(Text, { style: [S.tCellHdRight, { flex: 1 }] }, 'Total'),
        ),
        ...lineItems.map((item: any, i: number) =>
          React.createElement(View, { key: i, style: S.tRow },
            React.createElement(Text, { style: [S.tCell, { flex: 3 }] }, item.description || item.name || 'Item'),
            React.createElement(Text, { style: [S.tCellRight, { flex: 1 }] }, String(item.quantity || 1)),
            React.createElement(Text, { style: [S.tCellRight, { flex: 1 }] }, `${invoice.currency} ${fmt2(item.unitPrice || 0)}`),
            React.createElement(Text, { style: [S.tCellRight, { flex: 1 }] }, `${invoice.currency} ${fmt2(item.total || item.quantity * item.unitPrice)}`),
          )
        ),
      ),

      // Totals
      React.createElement(View, { style: S.section },
        React.createElement(View, { style: S.totTable },
          React.createElement(View, { style: S.totRow },
            React.createElement(Text, { style: S.totLabel }, 'Subtotal'),
            React.createElement(Text, { style: S.totValue }, `${invoice.currency} ${fmt2(invoice.subtotal)}`),
          ),
          invoice.taxAmount > 0 && React.createElement(View, { style: S.totRow },
            React.createElement(Text, { style: S.totLabel }, 'Tax'),
            React.createElement(Text, { style: S.totValue }, `${invoice.currency} ${fmt2(invoice.taxAmount)}`),
          ),
          React.createElement(View, { style: { ...S.totRow, paddingTop: 8 } },
            React.createElement(Text, { style: { ...S.totLabel, fontFamily: 'Helvetica-Bold' } }, 'Total Amount'),
            React.createElement(Text, { style: { ...S.totValue, fontSize: 12 } }, `${invoice.currency} ${fmt2(invoice.totalAmount)}`),
          ),
          invoice.depositReceived > 0 && React.createElement(View, { style: S.totRow },
            React.createElement(Text, { style: { ...S.totLabel, color: '#059669' } }, 'Deposit Received'),
            React.createElement(Text, { style: { ...S.totValue, color: '#059669' } }, `− ${invoice.currency} ${fmt2(invoice.depositReceived)}`),
          ),
          React.createElement(View, { style: S.totFinal },
            React.createElement(Text, { style: { ...S.totLabel, fontFamily: 'Helvetica-Bold', color: balanceDue > 0 ? '#d97706' : '#059669' } }, 'Balance Due'),
            React.createElement(Text, { style: { ...S.totValue, fontSize: 12, color: balanceDue > 0 ? '#d97706' : '#059669' } }, `${invoice.currency} ${fmt2(Math.max(0, balanceDue))}`),
          ),
        ),
      ),

      // Payment Instructions
      invoice.paymentInstructions && React.createElement(View, { style: S.paymentBox },
        React.createElement(Text, { style: S.paymentLabel }, 'Payment Instructions'),
        React.createElement(Text, { style: S.paymentText }, invoice.paymentInstructions),
      ),

      // Notes
      invoice.notes && React.createElement(View, { style: S.notesBox },
        React.createElement(Text, { style: S.notesLabel }, 'Notes'),
        React.createElement(Text, { style: S.notesText }, invoice.notes),
      ),

      // Footer
      React.createElement(View, { style: S.footer },
        React.createElement(View, { style: S.footerLeft },
          React.createElement(Text, { style: S.footerBold }, 'Jae Travel Expeditions'),
          React.createElement(Text, { style: S.footerTxt }, 'info@jaetravel.co.ke'),
          React.createElement(Text, { style: S.footerTxt }, 'www.jaetravel.co.ke'),
        ),
        React.createElement(View, { style: S.footerRight },
          React.createElement(Text, { style: { ...S.footerTxt, fontFamily: 'Helvetica-Bold' } }, invoice.invoiceNo),
        ),
      ),
      React.createElement(Text, { style: S.pageNum, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` }),
    )
  );
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      booking: { include: { client: true, tourPackage: true } },
      client: true,
    },
  });

  if (!invoice) return new NextResponse('Not found', { status: 404 });

  try {
    const buffer = await renderToBuffer(InvoicePDF({ invoice }) as any);
    const filename = `Invoice_${invoice.invoiceNo}.pdf`;
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (e: any) {
    console.error('Invoice PDF generation error:', e);
    return new NextResponse(`PDF generation failed: ${e.message}`, { status: 500 });
  }
}