// ─── StayVeo System & Security Architecture — PDF Generator ─────────────
// Generates a professional architecture document based on actual codebase
// analysis. Run: node generate-pdf.js
// ────────────────────────────────────────────────────────────────────────

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'StayVeo_System_Security_Architecture.pdf');
const VERSION = '1.0.0';
const DATE = new Date().toISOString().split('T')[0];

// ─── Colors ─────────────────────────────────────────────────────────────
const C = {
  black: '#0F172A',
  dark: '#1E293B',
  mid: '#475569',
  light: '#94A3B8',
  faint: '#CBD5E1',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  accent: '#2563EB',    // Blue-600
  accentDark: '#1D4ED8',
  green: '#16A34A',
  greenBg: '#F0FDF4',
  greenBorder: '#BBF7D0',
  red: '#DC2626',
  redBg: '#FEF2F2',
  redBorder: '#FECACA',
  amber: '#D97706',
  amberBg: '#FFFBEB',
  amberBorder: '#FDE68A',
  purple: '#7C3AED',
  teal: '#0D9488',
  indigo: '#4F46E5',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
};

// ─── Document Setup ─────────────────────────────────────────────────────
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 72, bottom: 72, left: 64, right: 64 },
  bufferPages: true,
  info: {
    Title: 'StayVeo — System & Security Architecture',
    Author: 'StayVeo Engineering',
    Subject: 'Production Architecture, Security Model, Scalability Strategy & Migration Plan',
    Keywords: 'architecture security prisma fastify react supabase',
  },
});
const stream = fs.createWriteStream(OUTPUT);
doc.pipe(stream);

const PW = 595.28; // A4 width points
const PH = 841.89; // A4 height points
const ML = 64;
const MR = 64;
const MT = 72;
const MB = 72;
const CW = PW - ML - MR; // content width
let pageNum = 0;
let tocEntries = [];
let currentSection = 0;

// ─── Helpers ────────────────────────────────────────────────────────────

function ensureSpace(needed) {
  if (doc.y + needed > PH - MB - 30) {
    doc.addPage();
    addHeader();
    addFooter();
  }
}

function addHeader() {
  const y = 28;
  doc.save();
  doc.fontSize(7).fillColor(C.light)
    .text('STAYVEO — SYSTEM & SECURITY ARCHITECTURE', ML, y, { width: CW / 2, align: 'left' });
  doc.text(`v${VERSION}`, ML + CW / 2, y, { width: CW / 2, align: 'right' });
  doc.moveTo(ML, y + 14).lineTo(PW - MR, y + 14).strokeColor(C.slate200).lineWidth(0.5).stroke();
  doc.restore();
}

function addFooter() {
  pageNum++;
  const y = PH - 40;
  doc.save();
  doc.moveTo(ML, y - 6).lineTo(PW - MR, y - 6).strokeColor(C.slate200).lineWidth(0.5).stroke();
  doc.fontSize(7).fillColor(C.light)
    .text('CONFIDENTIAL — StayVeo Internal', ML, y, { width: CW / 2, align: 'left' })
    .text(`Page ${pageNum}`, ML + CW / 2, y, { width: CW / 2, align: 'right' });
  doc.restore();
}

function newPage() {
  doc.addPage();
  addHeader();
  addFooter();
}

function sectionTitle(num, title) {
  currentSection = num;
  ensureSpace(80);
  const y = doc.y;
  // Section bar
  doc.save();
  doc.rect(ML, y, CW, 36).fill(C.accent);
  doc.fontSize(11).fillColor(C.white).font('Helvetica-Bold')
    .text(`SECTION ${num}`, ML + 14, y + 6, { width: CW - 28 });
  doc.fontSize(13).fillColor(C.white).font('Helvetica-Bold')
    .text(title.toUpperCase(), ML + 14, y + 19, { width: CW - 28 });
  doc.restore();
  doc.y = y + 48;
  tocEntries.push({ num, title, page: pageNum });
}

function subsection(title) {
  ensureSpace(40);
  doc.moveDown(0.5);
  const y = doc.y;
  doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C.accent).lineWidth(1.5).stroke();
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor(C.accent).font('Helvetica-Bold').text(title, ML, doc.y, { width: CW });
  doc.moveDown(0.5);
  doc.font('Helvetica').fillColor(C.dark);
}

function subsubsection(title) {
  ensureSpace(30);
  doc.moveDown(0.3);
  doc.fontSize(9.5).fillColor(C.dark).font('Helvetica-Bold').text(title, ML, doc.y, { width: CW });
  doc.moveDown(0.3);
  doc.font('Helvetica').fillColor(C.dark);
}

function para(text, opts = {}) {
  ensureSpace(30);
  doc.fontSize(opts.size || 9).fillColor(opts.color || C.dark).font(opts.font || 'Helvetica')
    .text(text, ML, doc.y, { width: CW, align: opts.align || 'left', lineGap: 3 });
  doc.moveDown(0.4);
}

function bullet(text, indent = 0) {
  ensureSpace(18);
  const y = doc.y;
  doc.fontSize(9).fillColor(C.dark).font('Helvetica')
    .text('•', ML + indent, y, { width: 12 });
  doc.fontSize(9).fillColor(C.dark).font('Helvetica')
    .text(text, ML + 12 + indent, y, { width: CW - 14 - indent, lineGap: 2 });
  doc.moveDown(0.15);
}

function numberedItem(num, text) {
  ensureSpace(18);
  const y = doc.y;
  doc.fontSize(9).fillColor(C.accent).font('Helvetica-Bold')
    .text(`${num}.`, ML, y, { width: 20 });
  doc.fontSize(9).fillColor(C.dark).font('Helvetica')
    .text(text, ML + 20, y, { width: CW - 22, lineGap: 2 });
  doc.moveDown(0.15);
}

function callout(type, text) {
  const colors = {
    info: { bg: '#EFF6FF', border: C.accent, icon: 'i', label: 'NOTE' },
    warn: { bg: C.amberBg, border: C.amber, icon: '!', label: 'WARNING' },
    danger: { bg: C.redBg, border: C.red, icon: 'X', label: 'CRITICAL' },
    success: { bg: C.greenBg, border: C.green, icon: '*', label: 'CURRENT' },
    tip: { bg: '#F0F9FF', border: C.teal, icon: '>', label: 'RECOMMENDED' },
  };
  const c = colors[type] || colors.info;
  const textH = doc.fontSize(8.5).font('Helvetica').heightOfString(text, { width: CW - 40 });
  const boxH = Math.max(textH + 28, 38);
  ensureSpace(boxH + 12);
  const y = doc.y;
  doc.save();
  doc.rect(ML, y, CW, boxH).fill(c.bg);
  doc.rect(ML, y, 3, boxH).fill(c.border);
  doc.fontSize(7).fillColor(c.border).font('Helvetica-Bold')
    .text(`[${c.label}]`, ML + 12, y + 6, { width: CW - 24 });
  doc.fontSize(8.5).fillColor(C.dark).font('Helvetica')
    .text(text, ML + 12, y + 20, { width: CW - 40, lineGap: 2 });
  doc.restore();
  doc.y = y + boxH + 10;
  doc.font('Helvetica').fontSize(9).fillColor(C.dark);
}

function statusBadge(label, status) {
  const statusColors = {
    'CURRENT': C.green,
    'IMPLEMENTED': C.green,
    'PARTIAL': C.amber,
    'PLANNED': C.accent,
    'RECOMMENDED': C.purple,
    'NOT IMPLEMENTED': C.red,
    'NOT REQUIRED YET': C.light,
  };
  ensureSpace(16);
  const y = doc.y;
  const color = statusColors[status] || C.light;
  doc.fontSize(8).fillColor(C.dark).font('Helvetica-Bold')
    .text(label, ML + 4, y, { width: 200 });
  doc.fontSize(7).fillColor(color).font('Helvetica-Bold')
    .text(`[${status}]`, ML + 210, y, { width: CW - 210, lineGap: 2 });
  doc.y = y + 14;
}

function tableHeader(cols) {
  ensureSpace(20);
  const y = doc.y;
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  doc.rect(ML, y, totalW, 18).fill(C.accent);
  let x = ML;
  cols.forEach(col => {
    doc.fontSize(7).fillColor(C.white).font('Helvetica-Bold')
      .text(col.label, x + 4, y + 4, { width: col.width - 8 });
    x += col.width;
  });
  doc.y = y + 18;
  return cols;
}

function tableRow(cols, values, alt = false) {
  ensureSpace(24);
  const y = doc.y;
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  const textH = Math.max(...values.map((v, i) =>
    doc.fontSize(7.5).font('Helvetica').heightOfString(String(v), { width: cols[i].width - 8 })
  ));
  const rowH = Math.max(textH + 8, 16);
  if (alt) doc.rect(ML, y, totalW, rowH).fill(C.slate100);
  doc.rect(ML, y, totalW, rowH).strokeColor(C.slate200).lineWidth(0.5).stroke();
  let x = ML;
  values.forEach((v, i) => {
    const color = (String(v).includes('CRITICAL') || String(v).includes('HIGH')) ? C.red :
                  (String(v).includes('MEDIUM')) ? C.amber :
                  (String(v).includes('LOW')) ? C.green : C.dark;
    doc.fontSize(7.5).fillColor(color).font('Helvetica')
      .text(String(v), x + 4, y + 4, { width: cols[i].width - 8 });
    x += cols[i].width;
  });
  doc.y = y + rowH;
}

function diagramBox(x, y, w, h, label, color = C.accent, textColor = C.white) {
  const savedY = doc.y;
  doc.save();
  doc.roundedRect(x, y, w, h, 4).fill(color);
  doc.fontSize(7).fillColor(textColor).font('Helvetica-Bold');
  const textW = doc.widthOfString(label);
  doc.text(label, x + (w - Math.min(textW, w - 8)) / 2, y + (h - 8) / 2, { width: w - 8, align: 'center', lineBreak: false });
  doc.restore();
  doc.y = savedY;
  doc.font('Helvetica').fontSize(9).fillColor(C.dark);
}

function diagramArrow(x1, y1, x2, y2) {
  doc.save();
  doc.moveTo(x1, y1).lineTo(x2, y2).strokeColor(C.mid).lineWidth(1).stroke();
  // arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const aLen = 6;
  doc.moveTo(x2, y2)
    .lineTo(x2 - aLen * Math.cos(angle - 0.4), y2 - aLen * Math.sin(angle - 0.4))
    .lineTo(x2 - aLen * Math.cos(angle + 0.4), y2 - aLen * Math.sin(angle + 0.4))
    .fill(C.mid);
  doc.restore();
}

function diagramCaption(text) {
  doc.moveDown(0.3);
  doc.fontSize(7.5).fillColor(C.mid).font('Helvetica-Oblique')
    .text(text, ML, doc.y, { width: CW, align: 'center' });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(9).fillColor(C.dark);
}

// ═══════════════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════════════

function renderCover() {
  // Background
  doc.rect(0, 0, PW, PH).fill(C.black);
  
  // Top accent line
  doc.rect(0, 0, PW, 4).fill(C.accent);
  
  // Logo area
  doc.fontSize(42).fillColor(C.white).font('Helvetica-Bold')
    .text('STAYVEO', ML + 20, 180, { width: CW - 40 });
  
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor(C.accent).font('Helvetica-Bold')
    .text('PREMIUM STUDENT LIVING SUITE', ML + 20, doc.y, { width: CW - 40, characterSpacing: 4 });
  
  // Divider
  doc.moveDown(2);
  doc.moveTo(ML + 20, doc.y).lineTo(ML + 180, doc.y).strokeColor(C.accent).lineWidth(2).stroke();
  
  doc.moveDown(2);
  doc.fontSize(22).fillColor(C.white).font('Helvetica-Bold')
    .text('System & Security', ML + 20, doc.y, { width: CW - 40 });
  doc.fontSize(22).fillColor(C.accent).font('Helvetica-Bold')
    .text('Architecture', ML + 20, doc.y, { width: CW - 40 });
  
  doc.moveDown(1.5);
  doc.fontSize(10).fillColor(C.faint).font('Helvetica')
    .text('Production Architecture, Security Model,\nScalability Strategy & Migration Plan', ML + 20, doc.y, { width: CW - 40, lineGap: 4 });
  
  // Info table at bottom
  const infoY = PH - 220;
  const infoData = [
    ['VERSION', `v${VERSION}`],
    ['DATE', DATE],
    ['STATUS', 'Active Development'],
    ['MATURITY', 'Pre-Production'],
    ['CLASSIFICATION', 'Confidential — Internal'],
    ['PREPARED FOR', 'StayVeo Engineering'],
  ];
  
  infoData.forEach(([label, value], i) => {
    const y = infoY + i * 22;
    doc.fontSize(7).fillColor(C.light).font('Helvetica-Bold')
      .text(label, ML + 20, y, { width: 120 });
    doc.fontSize(8.5).fillColor(C.white).font('Helvetica')
      .text(value, ML + 140, y, { width: CW - 160 });
  });
  
  // Bottom accent bar
  doc.rect(0, PH - 4, PW, 4).fill(C.accent);
  
  pageNum = 0;
}

// ═══════════════════════════════════════════════════════════════════════
// TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════════════════

function renderTOCPlaceholder() {
  newPage();
  doc.fontSize(20).fillColor(C.dark).font('Helvetica-Bold')
    .text('Table of Contents', ML, MT + 10, { width: CW });
  doc.moveDown(1.5);
  doc.fontSize(8.5).fillColor(C.mid).font('Helvetica')
    .text('Page numbers are populated after final rendering.', ML, doc.y, { width: CW });
  doc.moveDown(1);
  
  const sections = [
    'Executive Summary', 'Architecture Overview', 'Users & Actors', 'DNS Architecture',
    'CDN / Edge Architecture', 'WAF & DDoS Protection', 'Load Balancing',
    'Backend Infrastructure', 'Authentication Architecture', 'OTP Architecture',
    'Session / JWT / Cookie Architecture', 'Authorization Architecture', 'RBAC Model',
    'Ownership Model', 'API Security', 'Redis / Caching', 'Database Architecture',
    'Database Security / RLS', 'Storage Security', 'Secrets Management',
    'Logging & Monitoring', 'Backup & Disaster Recovery', 'Threat Model',
    'Security Testing', 'Scaling Strategy', 'Cost Strategy',
    'Current Architecture', 'Target Architecture', 'Migration Plan',
    'Architecture Decision Records', 'Failure Scenarios',
    'Security Gap Register', 'Maturity Assessment', 'Request Lifecycle',
    'Security Principles', 'Glossary', 'Final Recommendations',
  ];
  
  sections.forEach((title, i) => {
    const y = doc.y;
    doc.fontSize(9).fillColor(C.accent).font('Helvetica-Bold')
      .text(`${i + 1}.`, ML, y, { width: 24 });
    doc.fontSize(9).fillColor(C.dark).font('Helvetica')
      .text(title, ML + 24, y, { width: CW - 40 });
    doc.y = y + 16;
  });
}

// ═══════════════════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY
// ═══════════════════════════════════════════════════════════════════════

function renderExecutiveSummary() {
  newPage();
  doc.fontSize(18).fillColor(C.dark).font('Helvetica-Bold')
    .text('Executive Summary', ML, MT + 10, { width: CW });
  doc.moveDown(1);
  
  para('StayVeo is a student-living marketplace connecting students with PG (Paying Guest) accommodation, tiffin (meal subscription) services, and roommate matching. The platform serves two primary user classes — Students and Providers — each with dedicated onboarding flows, dashboards, and feature sets.');
  
  para('This document captures the current technical architecture as implemented in the repository, identifies security gaps, and provides a phased roadmap toward production readiness. Every component is classified by its implementation status: CURRENT, PARTIAL, PLANNED, RECOMMENDED, or NOT IMPLEMENTED.');
  
  subsection('Technology Stack (Current)');
  
  const stackCols = [
    { label: 'LAYER', width: 100 },
    { label: 'TECHNOLOGY', width: 180 },
    { label: 'STATUS', width: 90 },
    { label: 'NOTES', width: CW - 370 },
  ];
  tableHeader(stackCols);
  [
    ['Frontend', 'React 19 + Vite 8', 'CURRENT', 'SPA with react-router-dom v7'],
    ['Styling', 'Vanilla CSS', 'CURRENT', 'No framework (Tailwind, etc.)'],
    ['Backend', 'Fastify 5 + TypeScript', 'CURRENT', 'Node.js 20, tsx for dev'],
    ['ORM', 'Prisma 6', 'CURRENT', 'Typed schema, migrations'],
    ['Database', 'PostgreSQL (Supabase)', 'CURRENT', 'Supabase-hosted Postgres'],
    ['Auth (Frontend)', 'Supabase Auth SDK', 'PARTIAL', 'Session used for display name only'],
    ['Auth (Backend)', 'Header-based (x-user-id)', 'CURRENT', 'No JWT/session verification'],
    ['Storage', 'Supabase Storage', 'CURRENT', 'pg-images, KYC buckets'],
    ['Validation', 'Zod', 'CURRENT', 'Schema validation on some routes'],
    ['Payment', 'Mock Provider', 'CURRENT', 'Razorpay adapter stubbed'],
    ['Maps', 'Mapbox GL', 'CURRENT', 'PG/tiffin location display'],
    ['Notifications', 'In-app only', 'PARTIAL', 'In-memory queue, no push'],
  ].forEach((row, i) => tableRow(stackCols, row, i % 2 === 1));
  
  doc.moveDown(1);
  callout('danger', 'CRITICAL FINDING: The backend has NO authentication middleware. All API routes trust the x-user-id and x-provider-phone headers sent by the frontend without cryptographic verification. Any client can impersonate any user by sending arbitrary headers. This is the #1 security gap requiring immediate remediation before production deployment.');
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1 — ARCHITECTURE OVERVIEW
// ═══════════════════════════════════════════════════════════════════════

function renderSection1() {
  newPage();
  sectionTitle(1, 'Architecture Overview');
  
  para('StayVeo follows a classic Single-Page Application (SPA) architecture with a separate API backend. The frontend is a React application served by Vite during development (and as static files in production). The backend is a Fastify API server that communicates with a Supabase-hosted PostgreSQL database via Prisma ORM.');
  
  subsection('System Purpose');
  para('StayVeo is a marketplace for student accommodation and food services in Indian cities. It enables:');
  bullet('Students to discover, compare, and book PG accommodations');
  bullet('Students to subscribe to tiffin (meal) services from verified providers');
  bullet('Students to find compatible roommates via a matching/swiping system');
  bullet('Providers to onboard their PG or tiffin businesses and manage day-to-day operations');
  bullet('Providers to track deliveries, customers, payments, and menu planning');
  
  subsection('High-Level Architecture Diagram');
  
  // Draw the architecture diagram
  const dY = doc.y + 10;
  const boxW = 110; const boxH = 28;
  
  // Client layer
  diagramBox(ML + 70, dY, boxW + 30, boxH, 'React SPA (Vite)', C.indigo);
  diagramBox(ML + 230, dY, boxW + 30, boxH, 'Supabase Auth SDK', C.purple);
  
  // Arrow down
  diagramArrow(ML + 135, dY + boxH, ML + 135, dY + boxH + 20);
  diagramArrow(ML + 295, dY + boxH, ML + 295, dY + boxH + 20);
  
  // API layer  
  const apiY = dY + boxH + 20;
  diagramBox(ML + 30, apiY, boxW + 100, boxH, 'Fastify API Server (Port 3000)', C.accent);
  diagramBox(ML + 230, apiY, boxW + 30, boxH, 'Supabase Platform', C.teal);
  
  // Arrow down
  diagramArrow(ML + 130, apiY + boxH, ML + 130, apiY + boxH + 20);
  diagramArrow(ML + 295, apiY + boxH, ML + 295, apiY + boxH + 20);
  
  // Data layer
  const dbY = apiY + boxH + 20;
  diagramBox(ML + 30, dbY, boxW, boxH, 'Prisma ORM', C.dark);
  diagramBox(ML + 170, dbY, boxW + 30, boxH, 'PostgreSQL (Supabase)', C.green);
  diagramBox(ML + 330, dbY, boxW, boxH, 'Supabase Storage', C.teal);
  
  // Arrows
  diagramArrow(ML + 30 + boxW, dbY + boxH/2, ML + 170, dbY + boxH/2);
  
  doc.y = dbY + boxH + 10;
  diagramCaption('Figure 1.1 — Current StayVeo Architecture (Simplified)');
  
  subsection('Layer Classification');
  
  const layerCols = [
    { label: 'LAYER', width: 120 },
    { label: 'DESCRIPTION', width: 220 },
    { label: 'STATUS', width: CW - 340 },
  ];
  tableHeader(layerCols);
  [
    ['Client Layer', 'React SPA served by Vite dev server / static files', 'CURRENT'],
    ['Edge Layer', 'CDN, WAF, DDoS protection', 'NOT IMPLEMENTED'],
    ['Network Layer', 'DNS, TLS, load balancing', 'NOT IMPLEMENTED'],
    ['Application Layer', 'Fastify API with controllers/services/repos', 'CURRENT'],
    ['Authentication Layer', 'Header-based identity (no verification)', 'PARTIAL — INSECURE'],
    ['Authorization Layer', 'Provider ownership checks in service code', 'PARTIAL'],
    ['Data Layer', 'PostgreSQL via Prisma + Supabase direct queries', 'CURRENT'],
    ['Storage Layer', 'Supabase Storage (pg-images, KYC documents)', 'CURRENT'],
    ['Caching Layer', 'No cache layer exists', 'NOT IMPLEMENTED'],
    ['Observability Layer', 'Pino logger only (stdout)', 'PARTIAL'],
    ['Security Layer', 'CORS, Zod validation, error handler', 'PARTIAL'],
  ].forEach((row, i) => tableRow(layerCols, row, i % 2 === 1));
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2 — USERS & ACTORS
// ═══════════════════════════════════════════════════════════════════════

function renderSection2() {
  newPage();
  sectionTitle(2, 'Users & Actors');
  
  para('The system currently supports two user roles defined in the UserRole enum: STUDENT and PROVIDER. There is no ADMIN role in the database schema.');
  
  const actorCols = [
    { label: 'ACTOR', width: 80 },
    { label: 'RESPONSIBILITIES', width: 160 },
    { label: 'TRUST LEVEL', width: 80 },
    { label: 'SECURITY RISKS', width: CW - 320 },
  ];
  tableHeader(actorCols);
  [
    ['Student', 'Browse PGs, reserve tiffins, manage profile, save listings', 'Low (untrusted client)', 'IDOR on user resources, header spoofing'],
    ['Provider (PG)', 'Onboard PG, manage rooms, handle bookings, view earnings', 'Low (untrusted client)', 'Cross-provider data access, listing manipulation'],
    ['Provider (Tiffin)', 'Onboard kitchen, manage menu/deliveries/customers', 'Low (untrusted client)', 'Kitchen ID manipulation, menu tampering'],
    ['Backend API', 'Business logic, data validation, database access', 'High (server-side)', 'Service-role key exposure, injection'],
    ['Supabase', 'PostgreSQL hosting, auth, storage, real-time', 'High (managed service)', 'Credential leak, RLS bypass'],
    ['SMS/OTP Provider', 'OTP delivery for phone verification', 'Medium (external)', 'OTP brute force, SMS interception'],
  ].forEach((row, i) => tableRow(actorCols, row, i % 2 === 1));
  
  doc.moveDown(0.5);
  callout('warn', 'There is no Admin role or admin panel in the current codebase. All administrative operations (e.g., kitchen verification) must be performed directly in the database. An ADMIN role is RECOMMENDED for production.');

  subsection('Identity Chain (Current)');
  para('The current identity resolution differs between Student and Provider flows:');
  subsubsection('Student Flow');
  bullet('Frontend calls /api/v1/auth/send-otp with phone number');
  bullet('Backend creates a User row (role=STUDENT) if not exists — OTP is DUMMY (accepts any value)');
  bullet('Frontend stores userId in localStorage and sends it as x-user-id header');
  bullet('Backend trusts x-user-id header without verification');
  
  subsubsection('Provider (Tiffin) Flow');
  bullet('Provider onboarding uses x-provider-phone header to identify the provider');
  bullet('Backend resolves ProviderProfile from phone, verifies otpVerified flag');
  bullet('Kitchen is resolved via ownerId FK from ProviderProfile.id');
  bullet('Ownership check: only the kitchen\'s owner profile can modify it');
  
  callout('danger', 'Both flows trust client-supplied headers. A malicious client can send any phone number or user ID to access arbitrary accounts.');
}

// ═══════════════════════════════════════════════════════════════════════
// SECTIONS 3-7: Infrastructure (DNS, CDN, WAF, LB, Backend)
// ═══════════════════════════════════════════════════════════════════════

function renderInfrastructureSections() {
  // SECTION 3 — DNS
  newPage();
  sectionTitle(3, 'DNS Architecture');
  
  callout('info', 'STATUS: NOT IMPLEMENTED. The application currently runs on localhost (dev) and Microsoft Dev Tunnels / Cloudflare Quick Tunnels for mobile testing. No production DNS is configured.');
  
  para('The current frontend .env shows API endpoints on Dev Tunnels (zjdd8mbz-3000.inc1.devtunnels.ms). Supabase provides its own domain (zjlwzophfxnbpezgdddp.supabase.co) for database and storage.');
  
  subsection('Recommended Production DNS');
  bullet('stayveo.com — Frontend (React SPA static files)');
  bullet('api.stayveo.com — Backend API (Fastify)');
  bullet('admin.stayveo.com — Admin panel (when built)');
  bullet('All domains must use HTTPS with valid TLS certificates');
  bullet('DNS should be behind a CDN (Cloudflare) to hide origin IP addresses');
  
  subsection('Why DNS Matters');
  para('DNS is the entry point for every request. Exposing the origin server\'s IP address directly allows attackers to bypass CDN/WAF protections. Using a CDN like Cloudflare as a reverse proxy hides the origin and provides DDoS protection at the DNS level.');
  
  // SECTION 4 — CDN
  newPage();
  sectionTitle(4, 'CDN / Edge Architecture');
  
  callout('info', 'STATUS: NOT IMPLEMENTED. Static assets are served directly from the Vite dev server or the origin. No CDN is configured.');
  
  subsection('What Should Be Cached');
  bullet('Static JS/CSS bundles (immutable, cache indefinitely with content hashes)');
  bullet('Public images (PG photos, kitchen logos) — long cache TTL');
  bullet('Fonts, icons, public assets');
  
  subsection('What Should NOT Be Cached');
  bullet('API responses containing user-specific data');
  bullet('Authentication endpoints');
  bullet('Provider dashboard data');
  bullet('Payment/reservation endpoints');
  
  subsection('Recommended Architecture');
  para('Use Cloudflare Free plan or Vercel/Netlify edge for the React SPA. API server should be proxied through a CDN with cache disabled for /api/* routes.');
  
  // SECTION 5 — WAF
  newPage();
  sectionTitle(5, 'WAF & DDoS Protection');
  
  callout('info', 'STATUS: NOT IMPLEMENTED. No WAF, rate limiting, or DDoS protection is currently in place.');
  
  para('A Web Application Firewall (WAF) inspects incoming HTTP requests and blocks malicious payloads before they reach the application server.');
  
  subsection('Why WAF Should Be Before Application Servers');
  para('Placing the WAF before the backend means attacks are blocked at the edge, reducing load on application servers and preventing exploit payloads from ever reaching business logic.');
  
  subsection('Recommended Timeline');
  para('WAF is NOT needed immediately during development. It should be introduced when the application receives real user traffic (Stage 2 scaling). Cloudflare Free provides basic WAF rules and DDoS protection at no cost.');
  
  // SECTION 6 — Load Balancing
  newPage();
  sectionTitle(6, 'Load Balancing');
  
  callout('info', 'STATUS: NOT IMPLEMENTED. The application runs as a single Fastify process. There is no load balancer, no horizontal scaling.');
  
  para('A load balancer distributes incoming API requests across multiple backend server instances, providing redundancy and increased throughput.');
  
  subsection('Component Clarification');
  const lbCols = [
    { label: 'COMPONENT', width: 100 },
    { label: 'PURPOSE', width: 200 },
    { label: 'EXAMPLE', width: CW - 300 },
  ];
  tableHeader(lbCols);
  [
    ['CDN', 'Cache static assets at edge locations globally', 'Cloudflare, CloudFront'],
    ['WAF', 'Filter malicious HTTP requests', 'Cloudflare WAF, AWS WAF'],
    ['Reverse Proxy', 'Terminate TLS, route to backend', 'Nginx, Caddy'],
    ['Load Balancer', 'Distribute traffic across multiple servers', 'Nginx, HAProxy, ALB'],
    ['API Gateway', 'Rate limit, auth, routing, throttle', 'Kong, AWS API Gateway'],
  ].forEach((row, i) => tableRow(lbCols, row, i % 2 === 1));
  
  doc.moveDown(0.5);
  para('Load balancing is NOT needed until StayVeo has enough traffic to exceed a single server\'s capacity. For early production, a single server with PM2 cluster mode is sufficient.');
  
  // SECTION 7 — Backend Infrastructure
  newPage();
  sectionTitle(7, 'Backend Infrastructure');
  
  para('The backend is a Fastify 5 API server written in TypeScript, using tsx for development hot-reloading. It follows a layered architecture pattern.');
  
  subsection('Architecture Pattern');
  para('Routes → Controller → Service → Repository → Prisma → PostgreSQL');
  
  bullet('Routes (tiffin.routes.ts, auth.routes.ts, etc.): Register HTTP endpoints with Fastify');
  bullet('Controllers: Extract request data, call services, format responses');
  bullet('Services: Business logic, validation, orchestration');
  bullet('Repositories: Database access via Prisma (used in some modules)');
  bullet('Prisma: ORM generating typed queries from schema.prisma');
  
  subsection('Registered API Modules');
  const modCols = [
    { label: 'MODULE', width: 120 },
    { label: 'PREFIX', width: 150 },
    { label: 'FILES', width: CW - 270 },
  ];
  tableHeader(modCols);
  [
    ['Auth', '/api/v1/auth', 'auth.routes/controller/service/repo'],
    ['Users', '/api/v1/users', 'user.routes/controller/service'],
    ['Student', '/api/v1/student', 'student.routes/controller/service'],
    ['Provider', '/api/v1/provider', 'provider.routes/controller/service'],
    ['PG', '/api/v1/pg', 'pg.routes/controller/service'],
    ['Tiffin', '/api/v1/tiffin', 'tiffin.routes + 6 service files'],
    ['Tiffin Provider', '/api/v1/tiffin/provider/*', 'tiffin-provider.controller/service'],
    ['Bookings', '/api/v1/bookings', 'booking.routes/controller/service'],
    ['Payments', '/api/v1/payments', 'payment.routes/controller/service'],
    ['Notifications', '/api/v1/notifications', '17 files (full pipeline)'],
    ['Room Listings', '/api/provider/room-listings', 'room-listing.routes'],
    ['Media', '/api/v1/media', 'media.routes'],
    ['Saved', '/api/v1/saved', 'saved.routes'],
    ['Colleges', '/api/v1/colleges', 'college.routes'],
  ].forEach((row, i) => tableRow(modCols, row, i % 2 === 1));
  
  doc.moveDown(0.5);
  callout('warn', 'No authentication middleware exists. Every route is publicly accessible to any client that provides the expected headers. The global error handler catches Prisma and Zod errors but does not enforce auth.');
}

// ═══════════════════════════════════════════════════════════════════════
// SECTIONS 8-10: Authentication, OTP, Session/JWT
// ═══════════════════════════════════════════════════════════════════════

function renderAuthSections() {
  newPage();
  sectionTitle(8, 'Authentication Architecture');
  
  callout('danger', 'CRITICAL: The backend currently has NO authentication middleware. There is no JWT verification, no session validation, no Supabase Auth token checking on the server side. All routes are open.');
  
  subsection('Current Authentication State');
  para('The application has TWO separate authentication paths that do NOT share a verified identity:');
  
  subsubsection('Path 1: Student Auth (Dummy OTP)');
  bullet('POST /api/v1/auth/send-otp — accepts any phone, creates User if not exists');
  bullet('POST /api/v1/auth/verify-otp — accepts ANY OTP value (dummy mode)');
  bullet('No JWT/session is created — userId stored in localStorage');
  bullet('Subsequent requests send x-user-id header — backend trusts it blindly');
  
  subsubsection('Path 2: Provider Auth (Supabase Auth)');
  bullet('Frontend uses Supabase Auth SDK for phone OTP (real Supabase OTP)');
  bullet('Provider profile created via /api/provider/verify-otp');
  bullet('Subsequent requests send x-provider-phone header — backend trusts it');
  bullet('The resolveOwner() function verifies otpVerified flag on ProviderProfile');
  
  callout('info', 'Authentication = "Who are you?" — The current system accepts identity claims without cryptographic proof.');
  
  subsection('Recommended Architecture');
  para('Use Supabase Auth as the single source of identity for ALL users. The backend should verify the Supabase JWT access token on every request.');
  
  numberedItem(1, 'Frontend authenticates via Supabase Auth (phone OTP)');
  numberedItem(2, 'Supabase issues JWT access token + refresh token');
  numberedItem(3, 'Frontend includes JWT in Authorization: Bearer <token> header');
  numberedItem(4, 'Backend middleware verifies JWT signature using Supabase JWT secret');
  numberedItem(5, 'Verified auth.uid() maps to public.users via user_id');
  numberedItem(6, 'Backend passes verified user to route handlers');
  
  // SECTION 9 — OTP
  newPage();
  sectionTitle(9, 'OTP Architecture');
  
  subsection('Current OTP State');
  
  callout('danger', 'Student OTP is DUMMY — the auth.service.ts comment reads: "OTP is DUMMY — any value is accepted". No rate limiting, no CAPTCHA, no attempt tracking exists for this endpoint.');
  
  subsubsection('Student OTP Flow (Current — INSECURE)');
  bullet('Frontend sends phone number to /api/v1/auth/send-otp');
  bullet('Backend creates User row — no OTP is actually generated or sent');
  bullet('Frontend sends any value to /api/v1/auth/verify-otp');
  bullet('Backend returns user data regardless of OTP value');
  
  subsubsection('Provider OTP Flow (Current — Supabase)');
  bullet('Provider login uses supabase.auth.signInWithOtp({ phone })');
  bullet('Supabase generates and delivers the OTP (via configured SMS provider)');
  bullet('Supabase verifies the OTP and creates a session');
  bullet('Backend separately verifies otpVerified on ProviderProfile after a /verify-otp call');
  
  subsection('Recommended OTP Architecture');
  bullet('Use Supabase Auth phone OTP for ALL users (students + providers)');
  bullet('Configure Send SMS Hook to route OTP delivery through 2Factor.in or similar Indian SMS provider');
  bullet('Rate limit: max 3 OTP requests per phone per 5 minutes');
  bullet('Attempt limit: max 5 verification attempts per OTP');
  bullet('OTP expiry: 5 minutes (Supabase default)');
  bullet('CAPTCHA: Enable hCaptcha on Supabase Auth for abuse prevention');
  
  // SECTION 10 — Session/JWT/Cookie
  newPage();
  sectionTitle(10, 'Session / JWT / Cookie Architecture');
  
  subsection('Current Session State');
  
  callout('warn', 'There are no server-side sessions, no JWTs verified by the backend, no secure cookies. User identity is stored in localStorage (userId, phone) and sent as custom headers.');
  
  subsubsection('What Currently Exists');
  bullet('Supabase Auth client stores tokens in localStorage (sb-<ref>-auth-token)');
  bullet('Student userId stored in localStorage — sent as x-user-id header');
  bullet('Provider phone stored in localStorage — sent as x-provider-phone header');
  bullet('No HttpOnly cookies are set by the backend');
  bullet('No CSRF protection is needed (no cookies = no CSRF)');
  bullet('No token rotation or refresh mechanism on the backend');
  
  subsection('Key Conceptual Clarifications');
  
  const conceptCols = [
    { label: 'CONCEPT', width: 100 },
    { label: 'DEFINITION', width: 200 },
    { label: 'STAYVEO STATUS', width: CW - 300 },
  ];
  tableHeader(conceptCols);
  [
    ['JWT', 'Signed token containing user claims', 'Used by Supabase client only, not verified by backend'],
    ['Session', 'Server-side record linking user to state', 'NOT IMPLEMENTED'],
    ['Cookie', 'Browser-stored value sent with every request', 'NOT USED by backend'],
    ['Redis Session', 'Session stored in Redis for scaling', 'NOT IMPLEMENTED'],
    ['Access Token', 'Short-lived JWT for API authorization', 'Supabase issues these, backend ignores them'],
    ['Refresh Token', 'Long-lived token to renew access tokens', 'Handled by Supabase client only'],
  ].forEach((row, i) => tableRow(conceptCols, row, i % 2 === 1));
  
  doc.moveDown(0.5);
  callout('tip', 'RECOMMENDED: After implementing Supabase JWT verification on the backend, configure the frontend to send the Supabase access token as Authorization: Bearer <token>. This eliminates the need for custom x-user-id headers and provides cryptographic identity verification.');
}

// ═══════════════════════════════════════════════════════════════════════
// SECTIONS 11-14: Authorization, RBAC, Ownership, API Security
// ═══════════════════════════════════════════════════════════════════════

function renderAuthzSections() {
  newPage();
  sectionTitle(11, 'Authorization Architecture');
  
  para('Authorization determines what an authenticated user is allowed to do. It is separate from authentication (which determines who the user is).');
  
  subsection('Current Authorization State');
  callout('warn', 'Authorization is PARTIAL. Some provider routes enforce ownership checks, but there is no middleware-level authorization. Student routes have minimal or no authorization checks.');
  
  subsubsection('Provider Ownership (Tiffin — Implemented)');
  para('The tiffin-provider.service.ts contains a resolveOwner() function that:');
  bullet('Resolves ProviderProfile from x-provider-phone header');
  bullet('Verifies otpVerified flag on the profile');
  bullet('Optionally matches x-user-id against profile.userId');
  bullet('Resolves TiffinKitchen via ownerId FK');
  bullet('All operations are scoped to the resolved kitchen');
  
  subsubsection('Student Routes (Minimal Authorization)');
  para('Most student routes accept x-user-id without verification. There is no check that the userId corresponds to an authenticated session.');
  
  // SECTION 12 — RBAC
  newPage();
  sectionTitle(12, 'RBAC Model');
  
  subsection('Current Roles');
  para('The database defines two roles via the UserRole enum: STUDENT and PROVIDER. There is no ADMIN role.');
  
  const rbacCols = [
    { label: 'ROLE', width: 80 },
    { label: 'CAN ACCESS', width: 200 },
    { label: 'ENFORCED?', width: CW - 280 },
  ];
  tableHeader(rbacCols);
  [
    ['STUDENT', 'PG listings, tiffin discovery, reservations, own profile', 'NO — any user ID is accepted'],
    ['PROVIDER', 'Own kitchen/PG, own customers, own deliveries, own reports', 'PARTIAL — phone-based ownership'],
    ['ADMIN', 'Kitchen verification, user management, system config', 'NOT IMPLEMENTED — role does not exist'],
  ].forEach((row, i) => tableRow(rbacCols, row, i % 2 === 1));
  
  doc.moveDown(0.5);
  subsection('Recommended RBAC Model');
  para('For StayVeo\'s current complexity, a simple Role + Resource Ownership model is more appropriate than full ABAC (Attribute-Based Access Control). Recommended roles:');
  bullet('STUDENT — access own resources, public listings');
  bullet('PROVIDER — access own kitchen/PG resources');
  bullet('ADMIN — access all resources, verification, user management');
  
  // SECTION 13 — Ownership
  newPage();
  sectionTitle(13, 'Ownership Model');
  
  subsection('Actual Database Ownership Chain');
  para('Based on the Prisma schema, the ownership hierarchy is:');
  
  // Draw ownership diagram
  const oy = doc.y + 5;
  diagramBox(ML + 150, oy, 160, 24, 'User (users table)', C.dark);
  diagramArrow(ML + 190, oy + 24, ML + 120, oy + 50);
  diagramArrow(ML + 270, oy + 24, ML + 340, oy + 50);
  
  diagramBox(ML + 40, oy + 50, 160, 24, 'StudentProfile', C.indigo);
  diagramBox(ML + 260, oy + 50, 160, 24, 'ProviderProfile', C.accent);
  
  diagramArrow(ML + 340, oy + 74, ML + 340, oy + 100);
  diagramBox(ML + 260, oy + 100, 160, 24, 'TiffinKitchen (ownerId)', C.green);
  
  diagramArrow(ML + 340, oy + 124, ML + 300, oy + 150);
  diagramArrow(ML + 340, oy + 124, ML + 380, oy + 150);
  
  diagramBox(ML + 210, oy + 150, 120, 24, 'WeeklyMenus', C.teal);
  diagramBox(ML + 350, oy + 150, 120, 24, 'Subscriptions', C.teal);
  
  doc.y = oy + 190;
  diagramCaption('Figure 13.1 — Resource Ownership Chain');
  
  subsection('IDOR Prevention');
  para('Insecure Direct Object Reference (IDOR) occurs when a user can access another user\'s resources by changing an ID in the API request. The current tiffin provider routes prevent IDOR by resolving the kitchen from the authenticated provider\'s profile rather than accepting a kitchen ID from the request body. This is a correct pattern.');
  
  callout('success', 'The tiffin-provider.service.ts resolveOwner() pattern is a good ownership enforcement example. However, it relies on trusting the x-provider-phone header. Once backend authentication is added, this pattern should resolve ownership from the verified JWT identity.');
  
  // SECTION 14 — API Security
  newPage();
  sectionTitle(14, 'API Security');
  
  subsection('Current API Security Controls');
  
  const apiSecCols = [
    { label: 'CONTROL', width: 120 },
    { label: 'STATUS', width: 90 },
    { label: 'DETAILS', width: CW - 210 },
  ];
  tableHeader(apiSecCols);
  [
    ['HTTPS/TLS', 'PARTIAL', 'Dev tunnels use HTTPS; no production TLS configured'],
    ['Authentication', 'NOT IMPLEMENTED', 'No JWT/session verification middleware'],
    ['Authorization', 'PARTIAL', 'Provider ownership in service layer only'],
    ['Input Validation', 'PARTIAL', 'Zod on some routes; manual in tiffin-provider'],
    ['Rate Limiting', 'NOT IMPLEMENTED', 'No rate limiting on any endpoint'],
    ['Request Size', 'NOT CONFIGURED', 'Fastify defaults apply (~1MB)'],
    ['CORS', 'CURRENT', 'Configured in app.ts; allows localhost + tunnels'],
    ['CSRF', 'N/A', 'No cookies used, so no CSRF risk currently'],
    ['Security Headers', 'NOT IMPLEMENTED', 'No helmet/security headers plugin'],
    ['SQL Injection', 'LOW RISK', 'Prisma parameterizes queries; raw SQL in tiffin.repository.ts uses Prisma.sql tagged templates'],
    ['Error Handling', 'CURRENT', 'Global handler masks Prisma/Zod errors'],
    ['API Versioning', 'CURRENT', '/api/v1 prefix on all routes'],
    ['Idempotency', 'PARTIAL', 'TiffinPayment has idempotencyKey field'],
    ['Logging', 'PARTIAL', 'Pino logger (stdout only, no persistent storage)'],
  ].forEach((row, i) => tableRow(apiSecCols, row, i % 2 === 1));
}

// ═══════════════════════════════════════════════════════════════════════
// SECTIONS 15-19: Redis, Database, RLS, Storage, Secrets
// ═══════════════════════════════════════════════════════════════════════

function renderDataSections() {
  newPage();
  sectionTitle(15, 'Redis / Caching Architecture');
  
  callout('info', 'STATUS: NOT IMPLEMENTED. No Redis, Memcached, or any caching layer exists in the current codebase.');
  
  para('Redis is an in-memory data store commonly used for caching, session storage, rate limiting, and queuing. StayVeo does not currently need Redis — it should be introduced when specific bottlenecks are identified.');
  
  subsection('When StayVeo Should Add Redis');
  bullet('Rate Limiting — when auth endpoints need brute-force protection (Phase 9)');
  bullet('Session Store — if server-side sessions are preferred over JWT (Optional)');
  bullet('Cache — public tiffin listings, kitchen menus (when query latency becomes a bottleneck)');
  bullet('Queue — replace in-memory notification queue with durable queue (when reliability matters)');
  
  subsection('What to Cache vs. Not Cache');
  const cacheCols = [
    { label: 'DATA', width: 160 },
    { label: 'CACHE?', width: 60 },
    { label: 'REASON', width: CW - 220 },
  ];
  tableHeader(cacheCols);
  [
    ['Public tiffin listing results', 'YES', 'Read-heavy, changes infrequently (TTL: 5 min)'],
    ['Today\'s menu for a kitchen', 'YES', 'Read-heavy, changes daily (TTL: 1 hour)'],
    ['College list', 'YES', 'Static data (TTL: 24 hours)'],
    ['User profile data', 'NO', 'Private, user-specific, changes frequently'],
    ['Subscription details', 'NO', 'Sensitive, must be real-time accurate'],
    ['Payment status', 'NO', 'Financial data, must be real-time'],
    ['Delivery logs', 'NO', 'Frequently mutated, provider-specific'],
  ].forEach((row, i) => tableRow(cacheCols, row, i % 2 === 1));
  
  // SECTION 16 — Database Architecture
  newPage();
  sectionTitle(16, 'Database Architecture');
  
  para('StayVeo uses PostgreSQL hosted on Supabase. The database schema is managed via Prisma ORM with 1312 lines of schema definition across 40+ models.');
  
  subsection('Database Connection Architecture');
  bullet('DATABASE_URL: Supabase session-mode pooler (port 5432)');
  bullet('DIRECT_URL: Same connection (used for Prisma migrations)');
  bullet('Prisma Client: Singleton pattern with globalThis caching for hot-reload');
  bullet('Connection logging: Error-level only');
  
  subsection('Major Entity Groups');
  const entityCols = [
    { label: 'GROUP', width: 100 },
    { label: 'TABLES', width: 200 },
    { label: 'RELATIONS', width: CW - 300 },
  ];
  tableHeader(entityCols);
  [
    ['Identity', 'users, student_profiles', 'User → StudentProfile (1:1)'],
    ['Provider Core', 'provider_profiles, providers, provider_services', 'User → ProviderProfile (1:1)'],
    ['PG Module', 'pg_details, room_listings, pg_rooms', 'ProviderProfile → RoomListing (1:N)'],
    ['Tiffin Kitchen', 'tiffin_kitchens, kitchen_images, meal_timings', 'ProviderProfile → Kitchen (1:1)'],
    ['Tiffin Menu', 'weekly_menus, menu_histories', 'Kitchen → Menu (1:N), unique day+meal'],
    ['Tiffin Plans', 'subscription_plans', 'Kitchen → Plans (1:N)'],
    ['Tiffin Subscriptions', 'customer_subscriptions, subscription_days', 'Kitchen → Subscription (1:N)'],
    ['Tiffin Meals', 'meal_logs, meal_deliveries', 'Subscription → MealLog (1:N)'],
    ['Payments', 'tiffin_payments, payments, receipts', 'Subscription → Payment (1:N)'],
    ['Notifications', 'notifications, templates, preferences', 'User → Notification (1:N)'],
    ['Bookings', 'bookings, visit_requests', 'User → Booking (1:N)'],
    ['Discovery', 'tiffin_services, colleges, saved_listings', 'Legacy + current listings'],
  ].forEach((row, i) => tableRow(entityCols, row, i % 2 === 1));
  
  doc.moveDown(0.5);
  subsection('Key Database Patterns');
  bullet('UUID primary keys: All tables use gen_random_uuid() for IDs');
  bullet('Soft deletes: TiffinKitchen has deletedAt; most tables use hard deletes');
  bullet('Timestamps: created_at (auto), updated_at (Prisma @updatedAt)');
  bullet('Unique constraints: User.phone_number, Kitchen.ownerId, Menu day+meal+kitchen');
  bullet('Cascading deletes: Kitchen → Menus, Plans, Subscriptions');
  bullet('Indexed columns: Kitchen lat/lng, subscription status+endDate, meal logs');
  
  // SECTION 17 — RLS
  newPage();
  sectionTitle(17, 'Database Security / RLS');
  
  callout('warn', 'STATUS: NOT VERIFIED. Row Level Security (RLS) status could not be confirmed without direct database access. The Prisma schema does not define RLS policies (Prisma does not manage RLS). The Supabase migrations directory exists but was not inspected for RLS SQL.');
  
  subsection('Current State');
  para('The backend connects to PostgreSQL using a connection string that likely uses the postgres role (service role), which bypasses RLS. All access control is therefore enforced at the application layer (Fastify services), not at the database layer.');
  
  subsection('RLS Design Considerations');
  callout('tip', 'IMPORTANT: RLS policies should be designed AFTER authentication identity mapping is finalized. RLS policies depend on auth.uid() matching a user record, which requires the backend to connect with a per-user role or use Supabase\'s auth context — not the service role.');
  
  para('If the backend uses the service role (which bypasses RLS), then RLS only protects against direct Supabase client access from the frontend. Since the frontend uses the Supabase anon key for storage and real-time, RLS on storage.objects is critical.');
  
  // SECTION 18 — Storage
  newPage();
  sectionTitle(18, 'Storage Security');
  
  subsection('Current Storage Implementation');
  
  statusBadge('Supabase Storage', 'CURRENT');
  statusBadge('File upload from frontend', 'CURRENT');
  statusBadge('Signed upload URLs for KYC', 'CURRENT');
  statusBadge('Storage RLS policies', 'NOT VERIFIED');
  
  doc.moveDown(0.5);
  
  subsubsection('Storage Buckets');
  bullet('pg-images — PG listing photos (public bucket, uploaded from frontend)');
  bullet('provider-kyc-documents — KYC documents (private bucket, signed upload URLs from backend)');
  
  subsubsection('Upload Flows');
  para('PG Images: Frontend → Supabase Storage (direct upload with anon key)');
  para('KYC Documents: Frontend → Backend (request signed URL) → Backend → Supabase (create signed URL) → Frontend → Supabase Storage (upload with signed URL)');
  
  callout('success', 'The KYC upload flow correctly uses server-side signed URLs, preventing unauthorized uploads. The path includes the provider ID, ensuring document ownership. File type validation accepts only JPEG, PNG, and PDF.');
  
  callout('warn', 'PG image uploads go directly from the frontend to Supabase Storage using the anon key. Without proper RLS policies on the pg-images bucket, any authenticated user could potentially upload to or overwrite files in other providers\' directories.');
  
  // SECTION 19 — Secrets
  newPage();
  sectionTitle(19, 'Secrets Management');
  
  callout('danger', 'Secrets are stored in plaintext .env files in the repository. The .env files are present in the working directory (and may be committed to git). This is acceptable for local development but MUST NOT be deployed to production.');
  
  subsection('Secret Classification');
  const secretCols = [
    { label: 'SECRET', width: 160 },
    { label: 'EXPOSURE', width: 100 },
    { label: 'RISK', width: CW - 260 },
  ];
  tableHeader(secretCols);
  [
    ['DATABASE_URL (password)', 'Backend .env', 'Full database access if leaked'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'Backend .env', 'Bypasses all RLS, full admin access'],
    ['VITE_SUPABASE_ANON_KEY', 'Frontend .env + bundle', 'Safe — designed for public use with RLS'],
    ['VITE_MAPBOX_TOKEN', 'Frontend .env + bundle', 'Low — maps API with domain restrictions'],
    ['CLOUDINARY_API_SECRET', 'Backend .env', 'Can manipulate/delete all Cloudinary assets'],
  ].forEach((row, i) => tableRow(secretCols, row, i % 2 === 1));
  
  doc.moveDown(0.5);
  para('NOTE: Actual secret values are intentionally excluded from this document. The above table describes the types and risks, not the values.');
  
  subsection('Recommendations');
  bullet('Move production secrets to environment variables set by the hosting platform');
  bullet('Never commit .env files to git (verify .gitignore)');
  bullet('Rotate DATABASE_URL password periodically');
  bullet('Rotate SUPABASE_SERVICE_ROLE_KEY if it has been exposed');
  bullet('Use separate Supabase projects for development and production');
}

// ═══════════════════════════════════════════════════════════════════════
// SECTIONS 20-22: Monitoring, Backup, Threat Model
// ═══════════════════════════════════════════════════════════════════════

function renderOpsSections() {
  newPage();
  sectionTitle(20, 'Logging & Monitoring');
  
  callout('info', 'STATUS: PARTIAL. Fastify uses Pino logger with pino-pretty for development. No persistent log storage, no metrics collection, no alerting, no tracing.');
  
  subsection('Current Logging');
  bullet('Pino logger configured in buildApp() — debug level in dev, info in production');
  bullet('pino-pretty for colorized console output in development');
  bullet('Unhandled errors logged via console.error in global error handler');
  bullet('No structured log shipping to external service');
  
  subsection('Recommended Observability Stack');
  const obsCols = [
    { label: 'COMPONENT', width: 100 },
    { label: 'TOOL', width: 140 },
    { label: 'WHEN NEEDED', width: CW - 240 },
  ];
  tableHeader(obsCols);
  [
    ['Logs', 'Pino → Loki / CloudWatch / Datadog', 'Before production launch'],
    ['Metrics', 'Prometheus + Grafana / Datadog', 'When traffic grows beyond dev testing'],
    ['Tracing', 'OpenTelemetry → Jaeger / Tempo', 'When debugging cross-service latency'],
    ['Uptime', 'UptimeRobot / Better Stack', 'Immediately at production launch'],
    ['Alerts', 'PagerDuty / Slack webhooks', 'When 24/7 reliability is required'],
    ['Error Tracking', 'Sentry', 'Before production launch (frontend + backend)'],
  ].forEach((row, i) => tableRow(obsCols, row, i % 2 === 1));
  
  // SECTION 21 — Backup
  newPage();
  sectionTitle(21, 'Backup & Disaster Recovery');
  
  callout('info', 'STATUS: RELYING ON SUPABASE. Supabase provides automatic daily backups on paid plans and point-in-time recovery (PITR) on Pro+ plans. No custom backup strategy is configured.');
  
  subsection('Supabase Backup Capabilities');
  bullet('Free plan: No automatic backups');
  bullet('Pro plan ($25/mo): Daily backups, 7-day retention');
  bullet('Pro plan with PITR add-on: Point-in-time recovery');
  
  subsection('Recovery Objectives');
  const drCols = [
    { label: 'METRIC', width: 120 },
    { label: 'DEFINITION', width: 200 },
    { label: 'TARGET', width: CW - 320 },
  ];
  tableHeader(drCols);
  [
    ['RPO', 'Maximum acceptable data loss', '24 hours (daily backup) → 1 hour (PITR)'],
    ['RTO', 'Maximum acceptable downtime', '4 hours (manual restore) → 1 hour (automated)'],
  ].forEach((row, i) => tableRow(drCols, row, i % 2 === 1));
  
  // SECTION 22 — Threat Model
  newPage();
  sectionTitle(22, 'Threat Model');
  
  para('This threat model is based on analysis of the actual StayVeo codebase and identifies realistic attack vectors relevant to this application.');
  
  const threatCols = [
    { label: 'THREAT', width: 95 },
    { label: 'VECTOR', width: 115 },
    { label: 'IMPACT', width: 55 },
    { label: 'LIKELIHOOD', width: 55 },
    { label: 'MITIGATION', width: CW - 320 },
  ];
  tableHeader(threatCols);
  [
    ['Account Takeover', 'Send arbitrary x-user-id header', 'CRITICAL', 'HIGH', 'Add JWT verification middleware'],
    ['Provider Impersonation', 'Send arbitrary x-provider-phone', 'CRITICAL', 'HIGH', 'Verify Supabase JWT, map to provider'],
    ['OTP Brute Force', 'Dummy OTP accepts any value', 'HIGH', 'HIGH', 'Replace with Supabase Auth OTP'],
    ['IDOR on Student', 'Change userId in saved/bookings', 'HIGH', 'HIGH', 'Verify userId from JWT, not header'],
    ['Data Leakage', 'Error messages expose DB codes', 'MEDIUM', 'MEDIUM', 'Sanitize error responses (partially done)'],
    ['SQL Injection', 'Malformed input in raw queries', 'HIGH', 'LOW', 'Prisma.sql templates (currently used correctly)'],
    ['XSS', 'Inject script in menu items/names', 'MEDIUM', 'LOW', 'React auto-escapes; validate input length'],
    ['DDoS', 'Flood API endpoints', 'HIGH', 'MEDIUM', 'Add rate limiting + CDN/WAF'],
    ['Malicious Upload', 'Upload non-image to KYC bucket', 'MEDIUM', 'LOW', 'Backend validates content type (current)'],
    ['Secret Leakage', '.env committed to git', 'CRITICAL', 'MEDIUM', 'Verify .gitignore, rotate exposed keys'],
    ['Session Theft', 'Steal localStorage userId', 'HIGH', 'MEDIUM', 'Replace with HttpOnly cookie or JWT'],
    ['Privilege Escalation', 'Student accesses provider routes', 'HIGH', 'HIGH', 'Add role-based middleware'],
  ].forEach((row, i) => tableRow(threatCols, row, i % 2 === 1));
}

// ═══════════════════════════════════════════════════════════════════════
// SECTIONS 23-26: Testing, Scaling, Cost, Current Architecture
// ═══════════════════════════════════════════════════════════════════════

function renderStrategySections() {
  newPage();
  sectionTitle(23, 'Security Testing Strategy');
  
  callout('info', 'STATUS: NOT IMPLEMENTED. The repository contains no test files — no unit tests, integration tests, or security tests.');
  
  subsection('Recommended Testing Checklist');
  numberedItem(1, 'Authentication Tests: Verify JWT validation rejects invalid/expired tokens');
  numberedItem(2, 'Authorization Tests: Verify student cannot access provider routes and vice versa');
  numberedItem(3, 'IDOR Tests: Verify user A cannot access user B\'s resources by changing IDs');
  numberedItem(4, 'Ownership Tests: Verify provider A cannot modify provider B\'s kitchen');
  numberedItem(5, 'Input Validation: Test boundary values, special characters, oversized payloads');
  numberedItem(6, 'Rate Limiting: Verify OTP endpoint blocks after threshold');
  numberedItem(7, 'RLS Tests: Verify database policies enforce row-level access');
  numberedItem(8, 'Dependency Scanning: npm audit, Snyk, or GitHub Dependabot');
  numberedItem(9, 'Secret Scanning: Ensure no secrets in committed code (git-secrets, truffleHog)');
  
  // SECTION 24 — Scaling
  newPage();
  sectionTitle(24, 'Scaling Strategy');
  
  subsection('Stage 1: Development / MVP (Current)');
  bullet('Single Fastify server process');
  bullet('Supabase Free/Pro plan');
  bullet('Dev Tunnels for mobile testing');
  bullet('No CDN, no WAF, no load balancer — NOT NEEDED YET');
  
  subsection('Stage 2: Early Production (0–1,000 users)');
  bullet('Deploy to Railway / Render / Fly.io (single container)');
  bullet('Add CDN for frontend (Vercel / Cloudflare Pages)');
  bullet('Add Sentry for error tracking');
  bullet('Add UptimeRobot for health monitoring');
  bullet('Supabase Pro plan for daily backups');
  
  subsection('Stage 3: Growing (1,000–10,000 users)');
  bullet('PM2 cluster mode (multi-process on single machine)');
  bullet('Add Redis for rate limiting and caching');
  bullet('Add Cloudflare WAF (free tier)');
  bullet('Consider read replica for heavy query patterns');
  
  subsection('Stage 4: Scale (10,000+ users)');
  bullet('Kubernetes / ECS with multiple API replicas behind ALB');
  bullet('Managed Redis (Upstash / ElastiCache)');
  bullet('Full observability stack (Datadog / Grafana Cloud)');
  bullet('Database connection pooling tuning');
  bullet('Consider dedicated PostgreSQL if Supabase limits are hit');
  
  callout('tip', 'PRINCIPLE: Scale only when a measured bottleneck justifies the complexity and cost. Do not pre-optimize for traffic you do not have.');
  
  // SECTION 25 — Cost
  newPage();
  sectionTitle(25, 'Cost Strategy');
  
  const costCols = [
    { label: 'COMPONENT', width: 100 },
    { label: 'DEV (FREE)', width: 90 },
    { label: 'SMALL PROD', width: 100 },
    { label: 'GROWING', width: CW - 290 },
  ];
  tableHeader(costCols);
  [
    ['Frontend Host', 'Vite dev', 'Vercel Free', 'Vercel Pro ($20/mo)'],
    ['Backend Host', 'localhost', 'Railway ($5/mo)', 'Railway/Fly ($20-50/mo)'],
    ['Database', 'Supabase Free', 'Supabase Pro ($25/mo)', 'Supabase Pro + PITR'],
    ['CDN', 'None', 'Cloudflare Free', 'Cloudflare Free'],
    ['WAF', 'None', 'Cloudflare Free', 'Cloudflare Pro ($20/mo)'],
    ['Redis', 'None', 'None', 'Upstash Free → $10/mo'],
    ['Monitoring', 'None', 'UptimeRobot Free', 'Sentry + Better Stack'],
    ['SMS/OTP', 'None (dummy)', '2Factor.in (~₹0.15/SMS)', '2Factor.in'],
    ['Storage', 'Supabase Free', 'Supabase Pro (incl.)', 'Supabase Pro'],
    ['TOTAL', '$0', '~$55/mo', '~$120-200/mo'],
  ].forEach((row, i) => tableRow(costCols, row, i % 2 === 1));
  
  // SECTION 26 — Current Architecture
  newPage();
  sectionTitle(26, 'Current Architecture Snapshot');
  
  para('This section captures the exact state of the StayVeo architecture as of the repository inspection date. All classifications are based on codebase analysis.');
  
  subsection('Current Security Posture');
  
  const postureCols = [
    { label: 'AREA', width: 160 },
    { label: 'STATUS', width: 100 },
    { label: 'DETAIL', width: CW - 260 },
  ];
  tableHeader(postureCols);
  [
    ['Backend Auth Middleware', 'NOT IMPLEMENTED', 'No JWT/session checking on any route'],
    ['OTP Verification', 'DUMMY (Student)', 'Accepts any OTP value for students'],
    ['OTP Verification', 'SUPABASE (Provider)', 'Real Supabase OTP for providers'],
    ['Provider Ownership', 'IMPLEMENTED', 'resolveOwner() in tiffin-provider.service.ts'],
    ['Student Authorization', 'NOT IMPLEMENTED', 'x-user-id header trusted blindly'],
    ['CORS', 'IMPLEMENTED', 'Configured with allowed origins'],
    ['Input Validation', 'PARTIAL', 'Zod on auth; manual in tiffin service'],
    ['Error Handling', 'IMPLEMENTED', 'Global handler with Prisma/Zod/generic'],
    ['Rate Limiting', 'NOT IMPLEMENTED', 'No rate limiting anywhere'],
    ['Security Headers', 'NOT IMPLEMENTED', 'No helmet or custom headers'],
    ['RLS Policies', 'NOT VERIFIED', 'Cannot confirm without DB access'],
    ['Storage Security', 'PARTIAL', 'KYC: signed URLs; PG images: anon upload'],
    ['Logging', 'PARTIAL', 'Pino stdout only, no persistence'],
    ['Tests', 'NOT IMPLEMENTED', 'No test files in repository'],
  ].forEach((row, i) => tableRow(postureCols, row, i % 2 === 1));
}

// ═══════════════════════════════════════════════════════════════════════
// SECTIONS 27-28: Target Architecture, Migration Plan
// ═══════════════════════════════════════════════════════════════════════

function renderTargetAndMigration() {
  newPage();
  sectionTitle(27, 'Target Architecture');
  
  para('The target architecture adds security, observability, and scalability layers while preserving the existing application structure.');
  
  subsection('Target Architecture Diagram');
  
  const ty = doc.y + 5;
  const bw = 100; const bh = 22;
  
  // Layer 1: Users
  diagramBox(ML + 150, ty, 160, bh, 'Users (Browser / Mobile)', C.dark);
  diagramArrow(ML + 230, ty + bh, ML + 230, ty + bh + 15);
  
  // Layer 2: DNS/CDN
  diagramBox(ML + 100, ty + bh + 15, 260, bh, 'DNS → Cloudflare CDN + WAF', C.indigo);
  diagramArrow(ML + 230, ty + 2*bh + 15, ML + 230, ty + 2*bh + 30);
  
  // Layer 3: LB
  diagramBox(ML + 130, ty + 2*bh + 30, 200, bh, 'Load Balancer (future)', C.purple);
  diagramArrow(ML + 230, ty + 3*bh + 30, ML + 230, ty + 3*bh + 45);
  
  // Layer 4: API
  diagramBox(ML + 80, ty + 3*bh + 45, 300, bh, 'Fastify API × N + Auth Middleware', C.accent);
  diagramArrow(ML + 150, ty + 4*bh + 45, ML + 100, ty + 4*bh + 60);
  diagramArrow(ML + 230, ty + 4*bh + 45, ML + 230, ty + 4*bh + 60);
  diagramArrow(ML + 310, ty + 4*bh + 45, ML + 360, ty + 4*bh + 60);
  
  // Layer 5: Services
  diagramBox(ML + 20, ty + 4*bh + 60, bw, bh, 'Redis Cache', C.red);
  diagramBox(ML + 140, ty + 4*bh + 60, 140, bh, 'PostgreSQL + RLS', C.green);
  diagramBox(ML + 300, ty + 4*bh + 60, 120, bh, 'Supabase Storage', C.teal);
  
  // Monitoring
  diagramBox(ML + 340, ty + bh + 15, bw, bh, 'Monitoring', C.amber);
  
  doc.y = ty + 5*bh + 95;
  diagramCaption('Figure 27.1 — Target Production Architecture');
  
  // SECTION 28 — Migration Plan
  newPage();
  sectionTitle(28, 'Migration Plan');
  
  para('This phased roadmap prioritizes security-critical dependencies first. Each phase can be completed independently, with clear rollback strategies.');
  
  const phases = [
    { phase: 0, name: 'Architecture & Inventory', tasks: 'Document current state, classify all routes, map identity chain', deps: 'None', priority: 'IMMEDIATE' },
    { phase: 1, name: 'Identity / Authentication', tasks: 'Unify auth on Supabase Auth for all users, replace dummy OTP, add JWT middleware', deps: 'None', priority: 'CRITICAL' },
    { phase: 2, name: 'Backend Auth Middleware', tasks: 'Create Fastify auth plugin that verifies Supabase JWT on all /api/v1/* routes', deps: 'Phase 1', priority: 'CRITICAL' },
    { phase: 3, name: 'Authorization / RBAC', tasks: 'Add role-based route guards, separate student/provider/admin access', deps: 'Phase 2', priority: 'HIGH' },
    { phase: 4, name: 'Ownership Enforcement', tasks: 'Refactor resolveOwner() to use JWT identity, apply to all resource routes', deps: 'Phase 2-3', priority: 'HIGH' },
    { phase: 5, name: 'Database Constraints', tasks: 'Audit FK constraints, add missing indexes, enforce data integrity', deps: 'None', priority: 'MEDIUM' },
    { phase: 6, name: 'RLS Policies', tasks: 'Design and apply RLS for Supabase client access (storage, real-time)', deps: 'Phase 1', priority: 'MEDIUM' },
    { phase: 7, name: 'Storage Security', tasks: 'Add RLS to pg-images bucket, validate uploads server-side', deps: 'Phase 6', priority: 'MEDIUM' },
    { phase: 8, name: 'API Security Hardening', tasks: 'Add helmet, request size limits, security headers, CORS tightening', deps: 'Phase 2', priority: 'HIGH' },
    { phase: 9, name: 'Rate Limiting + Redis', tasks: 'Add Redis, rate limit auth/OTP endpoints, add brute-force protection', deps: 'Phase 2', priority: 'HIGH' },
    { phase: 10, name: 'Observability', tasks: 'Add Sentry, structured logging, uptime monitoring, basic alerts', deps: 'None', priority: 'MEDIUM' },
    { phase: 11, name: 'CDN / WAF', tasks: 'Deploy frontend to Vercel/CF Pages, proxy API through Cloudflare', deps: 'None', priority: 'LOW' },
    { phase: 12, name: 'Load Balancing', tasks: 'Add reverse proxy, PM2 cluster, then container orchestration', deps: 'Phase 8-10', priority: 'LOW' },
    { phase: 13, name: 'Backup / DR', tasks: 'Upgrade to Supabase Pro, enable PITR, test restore procedure', deps: 'None', priority: 'MEDIUM' },
  ];
  
  const phaseCols = [
    { label: '#', width: 28 },
    { label: 'PHASE', width: 120 },
    { label: 'KEY TASKS', width: 230 },
    { label: 'PRIORITY', width: CW - 378 },
  ];
  tableHeader(phaseCols);
  phases.forEach((p, i) => tableRow(phaseCols, [p.phase, p.name, p.tasks, p.priority], i % 2 === 1));
}

// ═══════════════════════════════════════════════════════════════════════
// ADRs, Failure Scenarios, Gap Register, Maturity, etc.
// ═══════════════════════════════════════════════════════════════════════

function renderRemainingSections() {
  // ADRs
  newPage();
  sectionTitle(29, 'Architecture Decision Records');
  
  const adrs = [
    { id: 'ADR-001', title: 'Supabase as Backend Infrastructure', context: 'Need managed PostgreSQL, auth, and storage without ops overhead', decision: 'Use Supabase for database, auth, and file storage', reason: 'Reduces operational complexity; free tier supports MVP; includes auth and storage', alternatives: 'Self-hosted PostgreSQL, Firebase, PlanetScale', consequence: 'Vendor lock-in to Supabase; must work within Supabase connection limits' },
    { id: 'ADR-002', title: 'Phone OTP as Primary Authentication', context: 'Indian student users prefer phone-based auth over email/password', decision: 'Use phone OTP for all user authentication', reason: 'Higher conversion rate; matches Indian market expectations (Paytm, GPay pattern)', alternatives: 'Email/password, Google OAuth, Magic links', consequence: 'SMS cost per login; requires reliable SMS delivery in India' },
    { id: 'ADR-003', title: 'Separate Authentication from Authorization', context: 'System has multiple user types with different permissions', decision: 'Auth middleware verifies identity; separate checks enforce permissions', reason: 'Clean separation of concerns; easier to test and audit', alternatives: 'Combined auth+authz middleware', consequence: 'Requires two middleware layers; but simpler individual logic' },
    { id: 'ADR-004', title: 'Server-Side Ownership Enforcement', context: 'Providers must not access other providers\' kitchens', decision: 'Resolve owner from verified identity, not from request parameters', reason: 'Prevents IDOR attacks; client cannot manipulate ownership', alternatives: 'Trust client-provided kitchenId (insecure)', consequence: 'Extra database lookup per request (acceptable cost)' },
    { id: 'ADR-005', title: 'RLS After Identity Mapping', context: 'RLS policies depend on knowing which database user maps to which auth identity', decision: 'Implement RLS only after auth middleware maps JWT to user rows', reason: 'RLS without proper auth context is ineffective or creates false security', alternatives: 'Implement RLS immediately without backend auth', consequence: 'RLS is delayed; but when implemented, it works correctly' },
    { id: 'ADR-006', title: 'Redis Optional Initially', context: 'Early-stage product with low traffic', decision: 'Do not add Redis until a specific bottleneck is identified', reason: 'Avoids premature complexity and cost; in-memory solutions work for early traffic', alternatives: 'Add Redis from day 1', consequence: 'Rate limiting relies on in-process counters initially (acceptable for dev)' },
  ];
  
  adrs.forEach(adr => {
    ensureSpace(100);
    subsubsection(`${adr.id}: ${adr.title}`);
    bullet(`Context: ${adr.context}`);
    bullet(`Decision: ${adr.decision}`);
    bullet(`Reason: ${adr.reason}`);
    bullet(`Alternatives: ${adr.alternatives}`);
    bullet(`Consequence: ${adr.consequence}`);
    doc.moveDown(0.3);
  });
  
  // Failure Scenarios
  newPage();
  sectionTitle(30, 'Failure Scenarios');
  
  const failCols = [
    { label: 'FAILURE', width: 100 },
    { label: 'DETECTION', width: 100 },
    { label: 'USER IMPACT', width: 120 },
    { label: 'RECOVERY', width: CW - 320 },
  ];
  tableHeader(failCols);
  [
    ['API Server Crash', 'Health check fails', 'All API calls fail, app unusable', 'Auto-restart (PM2/container), no data loss'],
    ['Database Down', 'Prisma connection error', 'All reads/writes fail', 'Supabase auto-recovery; check status page'],
    ['Redis Down', 'Connection timeout', 'Cache miss → DB fallback; rate limits reset', 'Degrade gracefully; restart Redis'],
    ['SMS Provider Down', 'OTP delivery fails', 'New users cannot sign up', 'Fallback SMS provider; notify support'],
    ['Supabase Storage Down', 'Upload/download 5xx', 'Images not loading, KYC upload fails', 'Retry with backoff; Supabase status page'],
    ['CDN Down', 'Static assets 5xx', 'Frontend not loading', 'DNS failover to origin; rare with Cloudflare'],
    ['10x Traffic Spike', 'CPU/memory spike', 'Slow responses, timeouts', 'Scale out API servers; enable rate limiting'],
    ['Auth Service Down', 'JWT verification fails', 'Cannot authenticate new requests', 'Cache valid tokens briefly; fallback mode'],
  ].forEach((row, i) => tableRow(failCols, row, i % 2 === 1));
  
  // Security Gap Register
  newPage();
  sectionTitle(31, 'Security Gap Register');
  
  const gapCols = [
    { label: 'ID', width: 35 },
    { label: 'GAP', width: 140 },
    { label: 'SEVERITY', width: 60 },
    { label: 'CURRENT STATE', width: 100 },
    { label: 'FIX', width: CW - 335 },
  ];
  tableHeader(gapCols);
  [
    ['SG-01', 'No backend auth middleware', 'CRITICAL', 'x-user-id header trusted', 'Add JWT verification middleware'],
    ['SG-02', 'Dummy OTP (accepts any)', 'CRITICAL', 'auth.service.ts dummy mode', 'Use Supabase Auth OTP'],
    ['SG-03', 'No rate limiting', 'HIGH', 'All endpoints unlimited', 'Add rate limiter (Redis-backed)'],
    ['SG-04', 'No security headers', 'HIGH', 'No helmet/HSTS/CSP', 'Add @fastify/helmet plugin'],
    ['SG-05', 'Secrets in .env files', 'HIGH', 'Plaintext in working dir', 'Use platform env vars'],
    ['SG-06', 'No automated tests', 'HIGH', 'Zero test coverage', 'Add auth/authz/IDOR tests'],
    ['SG-07', 'No ADMIN role', 'MEDIUM', 'Admin ops require DB access', 'Add ADMIN role and panel'],
    ['SG-08', 'PG image upload auth', 'MEDIUM', 'Anon key upload to Storage', 'Add RLS or signed URLs'],
    ['SG-09', 'No log persistence', 'MEDIUM', 'Pino to stdout only', 'Ship logs to external service'],
    ['SG-10', 'No backup verification', 'MEDIUM', 'Rely on Supabase free tier', 'Upgrade + test restore'],
  ].forEach((row, i) => tableRow(gapCols, row, i % 2 === 1));
  
  // Maturity Assessment
  newPage();
  sectionTitle(32, 'Architecture Maturity Assessment');
  
  para('Scoring: 0 = Not implemented  |  1 = Basic  |  2 = Partial  |  3 = Good  |  4 = Production Ready  |  5 = Mature');
  doc.moveDown(0.3);
  
  const matCols = [
    { label: 'AREA', width: 140 },
    { label: 'SCORE', width: 50 },
    { label: 'JUSTIFICATION', width: CW - 190 },
  ];
  tableHeader(matCols);
  [
    ['Authentication', '1/5', 'Supabase Auth exists for providers but not enforced server-side; dummy OTP for students'],
    ['Authorization', '2/5', 'Provider ownership checks exist; no role-based middleware; student routes unprotected'],
    ['API Security', '2/5', 'CORS configured; Zod validation on some routes; no rate limits or security headers'],
    ['Database Security', '2/5', 'Prisma prevents SQL injection; FK constraints and unique indexes; RLS unverified'],
    ['RLS', '0/5', 'Not verified; likely not enforced due to service-role connection'],
    ['Storage Security', '2/5', 'KYC uses signed URLs (good); PG images use anon upload (needs RLS)'],
    ['Secrets Management', '1/5', 'Secrets in .env files; no rotation; no vault'],
    ['Observability', '1/5', 'Pino logger to stdout; no metrics, tracing, or alerting'],
    ['Scalability', '1/5', 'Single server; no clustering, caching, or load balancing'],
    ['Backup / DR', '1/5', 'Relying on Supabase free tier; no tested restore procedure'],
    ['Testing', '0/5', 'No test files in repository'],
    ['Error Handling', '3/5', 'Comprehensive global handler for Prisma/Zod/generic errors'],
  ].forEach((row, i) => tableRow(matCols, row, i % 2 === 1));
  
  doc.moveDown(0.5);
  callout('info', 'OVERALL MATURITY: Pre-Production (Early Development). The application architecture is sound for an MVP, but significant security hardening is required before handling real user data and payments.');
  
  // Request Lifecycle
  newPage();
  sectionTitle(33, 'Request Lifecycle Examples');
  
  subsection('Example 1: Student Opens Tiffin Listing');
  numberedItem(1, 'Browser navigates to /tiffin → React SPA renders TiffinListing component');
  numberedItem(2, 'Component calls API: GET /api/v1/tiffin (via frontend client.js)');
  numberedItem(3, 'Request hits Fastify server on port 3000');
  numberedItem(4, 'tiffin.routes.ts → tiffinController.list');
  numberedItem(5, 'tiffin.service.ts → tiffinRepository.findFiltered()');
  numberedItem(6, 'Repository executes raw SQL CTE via prisma.$queryRaw (with Haversine distance)');
  numberedItem(7, 'PostgreSQL returns rows via Supabase session pooler');
  numberedItem(8, 'Response: { success: true, data: { items: [...], pagination: {...} } }');
  numberedItem(9, 'React renders listing cards');
  
  doc.moveDown(0.5);
  subsection('Example 2: Provider Publishes Menu');
  numberedItem(1, 'Provider clicks "Publish Menu" on /provider/tiffin/menu');
  numberedItem(2, 'Frontend calls PUT /api/v1/tiffin/provider/menu with merged menu data');
  numberedItem(3, 'x-provider-phone and x-user-id headers are sent');
  numberedItem(4, 'tiffin-provider.controller.ts → saveMenu()');
  numberedItem(5, 'resolveOwner() resolves ProviderProfile from phone, verifies otpVerified');
  numberedItem(6, 'Kitchen resolved via ownerId FK (ownership enforced)');
  numberedItem(7, 'Existing menus pre-fetched in single findMany query');
  numberedItem(8, 'Transaction: create history records + upsert menu items atomically');
  numberedItem(9, 'Response returns updated menu; frontend shows success toast');
  
  // Security Principles
  newPage();
  sectionTitle(34, 'Security Principles');
  
  const principles = [
    ['Zero Trust', 'Never trust any request by default. Verify every identity, every time, regardless of network location.'],
    ['Least Privilege', 'Grant only the minimum permissions needed. Students should not access provider routes; providers should not access other providers\' data.'],
    ['Defense in Depth', 'Layer multiple security controls (WAF → auth → authorization → validation → RLS). If one fails, others still protect.'],
    ['Secure by Default', 'New routes should require authentication by default. An opt-out (public) annotation should be explicit.'],
    ['Fail Closed', 'If authentication fails, deny access. Never fall through to an open/public state.'],
    ['Never Trust Client Input', 'All input from the browser is untrusted. Validate, sanitize, and escape everything server-side.'],
    ['Never Trust Client Identity', 'The client cannot prove who it is via custom headers alone. Use cryptographic tokens (JWT) verified server-side.'],
    ['Secrets Never in Frontend', 'Service-role keys, database passwords, and API secrets must never appear in client-side JavaScript bundles.'],
    ['Minimize Attack Surface', 'Remove unnecessary routes, disable debug endpoints in production, hide server version headers.'],
  ];
  
  principles.forEach(([title, desc]) => {
    ensureSpace(40);
    doc.fontSize(9).fillColor(C.accent).font('Helvetica-Bold')
      .text(`▸ ${title}`, ML, doc.y, { width: CW });
    doc.fontSize(8.5).fillColor(C.dark).font('Helvetica')
      .text(`  ${desc}`, ML + 8, doc.y, { width: CW - 16, lineGap: 2 });
    doc.moveDown(0.4);
  });
  
  // Glossary
  newPage();
  sectionTitle(35, 'Glossary');
  
  const glossary = [
    ['DNS', 'Domain Name System — translates domain names (stayveo.com) to IP addresses'],
    ['CDN', 'Content Delivery Network — caches static files at edge locations worldwide for faster delivery'],
    ['WAF', 'Web Application Firewall — inspects and filters malicious HTTP traffic before it reaches the server'],
    ['DDoS', 'Distributed Denial of Service — attack that overwhelms a server with massive traffic'],
    ['Load Balancer', 'Distributes incoming requests across multiple server instances'],
    ['Reverse Proxy', 'Server that forwards requests to backend servers; hides origin details'],
    ['API Gateway', 'Entry point that handles routing, rate limiting, and authentication for APIs'],
    ['Authentication', 'Verifying WHO a user is (identity proof)'],
    ['Authorization', 'Verifying WHAT a user is allowed to do (permission check)'],
    ['RBAC', 'Role-Based Access Control — permissions assigned to roles (STUDENT, PROVIDER)'],
    ['JWT', 'JSON Web Token — digitally signed token containing user identity claims'],
    ['RLS', 'Row Level Security — PostgreSQL feature that restricts which rows a user can access'],
    ['ORM', 'Object-Relational Mapping — library that maps database tables to code objects (Prisma)'],
    ['Prisma', 'Type-safe ORM for Node.js/TypeScript that generates database queries from a schema'],
    ['TLS', 'Transport Layer Security — encrypts data in transit (HTTPS)'],
    ['CORS', 'Cross-Origin Resource Sharing — controls which domains can call the API'],
    ['CSRF', 'Cross-Site Request Forgery — attack that tricks a browser into making unwanted requests'],
    ['XSS', 'Cross-Site Scripting — attack that injects malicious scripts into web pages'],
    ['IDOR', 'Insecure Direct Object Reference — accessing resources by manipulating IDs in requests'],
    ['Rate Limiting', 'Restricting how many requests a client can make in a time period'],
    ['SAST', 'Static Application Security Testing — analyzing source code for vulnerabilities'],
    ['DAST', 'Dynamic Application Security Testing — testing a running application for vulnerabilities'],
    ['RPO', 'Recovery Point Objective — maximum acceptable data loss in a disaster'],
    ['RTO', 'Recovery Time Objective — maximum acceptable downtime after a failure'],
  ];
  
  const glossCols = [
    { label: 'TERM', width: 100 },
    { label: 'DEFINITION', width: CW - 100 },
  ];
  tableHeader(glossCols);
  glossary.forEach((row, i) => tableRow(glossCols, row, i % 2 === 1));
  
  // Final Recommendations
  newPage();
  sectionTitle(36, 'Final Recommendations');
  
  doc.fontSize(14).fillColor(C.dark).font('Helvetica-Bold')
    .text('What Should We Implement First?', ML, doc.y, { width: CW });
  doc.moveDown(0.8);
  
  para('The following roadmap is ordered by security criticality and dependency chain. Each item builds on the previous one.', { size: 9.5 });
  doc.moveDown(0.3);
  
  const recItems = [
    { priority: '🔴 P0', item: 'Replace dummy OTP with Supabase Auth phone OTP for all users', reason: 'Anyone can impersonate any user currently' },
    { priority: '🔴 P0', item: 'Add JWT verification middleware to all API routes', reason: 'No authentication exists on the backend' },
    { priority: '🟠 P1', item: 'Add role-based route guards (STUDENT vs PROVIDER)', reason: 'Students can call provider endpoints and vice versa' },
    { priority: '🟠 P1', item: 'Refactor identity resolution to use JWT (not headers)', reason: 'Headers can be spoofed by any HTTP client' },
    { priority: '🟠 P1', item: 'Add rate limiting on auth/OTP endpoints', reason: 'Prevent brute-force and abuse' },
    { priority: '🟡 P2', item: 'Add security headers (helmet) and tighten CORS', reason: 'Basic web security hygiene' },
    { priority: '🟡 P2', item: 'Add Sentry error tracking (frontend + backend)', reason: 'Production visibility into errors' },
    { priority: '🟡 P2', item: 'Write auth/authorization integration tests', reason: 'Prevent security regression' },
    { priority: '🟢 P3', item: 'Add RLS to Supabase Storage buckets', reason: 'Protect uploaded files from unauthorized access' },
    { priority: '🟢 P3', item: 'Deploy to production hosting with proper domain', reason: 'Eliminate dev tunnel dependency' },
    { priority: '🔵 P4', item: 'Add Redis for caching and rate limiting', reason: 'Performance and security at scale' },
    { priority: '🔵 P4', item: 'Set up CDN + WAF (Cloudflare)', reason: 'Edge protection and performance' },
  ];
  
  recItems.forEach((item, i) => {
    ensureSpace(36);
    const y = doc.y;
    const bgColor = i % 2 === 0 ? C.white : C.slate100;
    doc.rect(ML, y, CW, 28).fill(bgColor);
    doc.fontSize(8).fillColor(C.dark).font('Helvetica-Bold')
      .text(`${item.priority}  ${item.item}`, ML + 8, y + 4, { width: CW - 16 });
    doc.fontSize(7.5).fillColor(C.mid).font('Helvetica')
      .text(item.reason, ML + 40, y + 16, { width: CW - 48 });
    doc.y = y + 30;
  });
  
  doc.moveDown(1);
  callout('danger', 'DO NOT deploy to production with real user data until at minimum P0 items (JWT authentication middleware + real OTP) are completed. The current codebase allows any HTTP client to impersonate any user.');
  
  // Final page — document end
  doc.moveDown(2);
  doc.fontSize(9).fillColor(C.mid).font('Helvetica-Oblique')
    .text('— End of Document —', ML, doc.y, { width: CW, align: 'center' });
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN — Assemble and generate
// ═══════════════════════════════════════════════════════════════════════

console.log('🔨 Generating StayVeo System & Security Architecture PDF...');

renderCover();
renderTOCPlaceholder();
renderExecutiveSummary();
renderSection1();
renderSection2();
renderInfrastructureSections();
renderAuthSections();
renderAuthzSections();
renderDataSections();
renderOpsSections();
renderStrategySections();
renderTargetAndMigration();
renderRemainingSections();

doc.end();

stream.on('finish', () => {
  const stats = fs.statSync(OUTPUT);
  const pages = pageNum;
  console.log(`✅ PDF generated: ${OUTPUT}`);
  console.log(`   Pages: ~${pages}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(0)} KB`);
});
