// StayVeo current-codebase architecture and developer handover PDF.
// Run from any directory with: node /path/to/docs/architecture/generate-pdf.js
// This generator reads the checked-in Prisma schema and route declarations;
// it writes only the user-designated reference PDF in the docs folder.

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUTPUT = path.join(__dirname, 'StayVeo_Current_Engineering_Architecture.pdf');
const VERSION = '3.0.0';
const AUDIT_DATE = '2026-10-01';
const COMMIT = '346beb8';
const SCHEMA = path.join(ROOT, 'backend/prisma/schema.prisma');
const C = {
  ink: '#102033', navy: '#10243A', blue: '#2457A7', blue2: '#3B82F6',
  teal: '#0F766E', green: '#16834A', amber: '#B56A08', red: '#B42318',
  paper: '#FFFFFF', wash: '#F3F6FA', line: '#D7E0EA', muted: '#65758B',
  paleBlue: '#EFF6FF', paleGreen: '#ECFDF3', paleAmber: '#FFFAEB', paleRed: '#FEF3F2',
};
const PW = 595.28, PH = 841.89, ML = 54, MR = 54, MT = 63, MB = 54;
const CW = PW - ML - MR;
const doc = new PDFDocument({
  size: 'A4', margins: { top: MT, bottom: MB, left: ML, right: MR },
  bufferPages: true, compress: true,
  info: {
    Title: 'STAYVEO — Current Engineering Architecture',
    Author: 'StayVeo Engineering — Codebase Audit',
    Subject: 'Source-verified architecture, security, database, operations and developer handover',
    Keywords: 'StayVeo, architecture, Fastify, React, Prisma, Redis, Razorpay, handover',
  },
});
const stream = fs.createWriteStream(OUTPUT);
doc.pipe(stream);
let sectionPage = [];
let pageCount = 0;
let currentChapter = '';

function pageNumber() { return doc.bufferedPageRange().count; }
function header() {
  const y = 27;
  doc.save().font('Helvetica-Bold').fontSize(7).fillColor(C.muted)
    .text('STAYVEO  /  CURRENT ENGINEERING ARCHITECTURE', ML, y, { width: CW - 45 });
  doc.font('Helvetica').text(`AUDIT ${AUDIT_DATE}  ·  v${VERSION}`, ML + CW - 160, y, { width: 160, align: 'right' });
  doc.moveTo(ML, y + 13).lineTo(PW - MR, y + 13).strokeColor(C.line).lineWidth(.6).stroke().restore();
}
function footer() {
  const y = PH - 31;
  doc.save().moveTo(ML, y - 7).lineTo(PW - MR, y - 7).strokeColor(C.line).lineWidth(.5).stroke();
  doc.font('Helvetica').fontSize(7).fillColor(C.muted)
    .text('CONFIDENTIAL  ·  INTERNAL ENGINEERING HANDOVER', ML, y, { width: CW - 90 })
    .text(`Page ${pageNumber()}`, ML + CW - 90, y, { width: 90, align: 'right' }).restore();
}
function addPage() { doc.addPage(); pageCount += 1; header(); footer(); }
function ensure(h = 28) { if (doc.y + h > PH - MB - 18) addPage(); }
function cover() {
  doc.rect(0, 0, PW, PH).fill(C.navy);
  doc.rect(0, 0, PW, 8).fill(C.blue2);
  doc.rect(0, PH - 8, PW, 8).fill(C.blue2);
  doc.save().fillColor('#AFC7ED').font('Helvetica-Bold').fontSize(9)
    .text('STAYVEO  /  ENGINEERING', ML + 18, 126, { characterSpacing: 2 });
  doc.fillColor(C.paper).font('Helvetica-Bold').fontSize(32)
    .text('CURRENT SYSTEM', ML + 18, 176, { width: CW - 36 });
  doc.fillColor('#76A7FF').fontSize(32).text('ARCHITECTURE', ML + 18, 216, { width: CW - 36 });
  doc.moveTo(ML + 18, 278).lineTo(ML + 190, 278).strokeColor(C.blue2).lineWidth(3).stroke();
  doc.fillColor('#E2EAF5').font('Helvetica').fontSize(13)
    .text('Codebase reverse engineering · security and data audit\nDeveloper handover · change-impact and operations guide', ML + 18, 306, { width: CW - 36, lineGap: 5 });
  const facts = [
    ['DOCUMENT STATUS', 'CURRENT CODEBASE AUDIT'],
    ['AUDIT DATE', AUDIT_DATE],
    ['REPOSITORY COMMIT', COMMIT + ' (worktree contains pre-existing modifications)'],
    ['PRIMARY SOURCE', 'Current repository files and configuration'],
    ['SECONDARY SOURCE', 'Supplied StayVeo technical architecture PDF'],
    ['SCOPE', 'Engineering documentation only; no application source modified'],
  ];
  facts.forEach((r, i) => {
    const y = 512 + i * 34;
    doc.fillColor('#95A9C3').font('Helvetica-Bold').fontSize(7.5).text(r[0], ML + 18, y, { width: 130 });
    doc.fillColor(C.paper).font('Helvetica').fontSize(8.5).text(r[1], ML + 154, y, { width: CW - 190 });
  });
  doc.fillColor('#95A9C3').fontSize(8).text('CURRENT CODEBASE IS THE SOURCE OF TRUTH', ML + 18, PH - 102, { characterSpacing: 1.3 });
  doc.restore();
}
function chapterTitle(number, title, subtitle = '') {
  currentChapter = title;
  ensure(86);
  const y = doc.y;
  doc.save().rect(ML, y, CW, 40).fill(C.blue);
  doc.fillColor('#D9E8FF').font('Helvetica-Bold').fontSize(8).text(`PHASE ${String(number).padStart(2, '0')}`, ML + 13, y + 6);
  doc.fillColor(C.paper).fontSize(12.5).text(title.toUpperCase(), ML + 13, y + 20, { width: CW - 26 });
  doc.restore();
  doc.y = y + 49;
  if (subtitle) paragraph(subtitle, { color: C.muted, size: 8.4, italic: true });
  sectionPage.push({ number, title, page: pageNumber() });
}
function subhead(text) {
  ensure(28);
  doc.moveDown(.35);
  const y = doc.y;
  doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C.blue2).lineWidth(1.25).stroke();
  doc.moveDown(.35);
  doc.font('Helvetica-Bold').fontSize(10.2).fillColor(C.blue).text(text, ML, doc.y, { width: CW });
  doc.moveDown(.4);
  doc.font('Helvetica').fontSize(8.5).fillColor(C.ink);
}
function paragraph(text, options = {}) {
  ensure(30);
  doc.font(options.bold ? 'Helvetica-Bold' : options.italic ? 'Helvetica-Oblique' : 'Helvetica')
    .fontSize(options.size || 8.5).fillColor(options.color || C.ink)
    .text(String(text), ML, doc.y, { width: CW, lineGap: options.lineGap ?? 2.2, align: options.align || 'left' });
  doc.moveDown(options.after ?? .35);
}
function bullet(text, indent = 0) {
  ensure(20);
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(8.3).fillColor(C.blue).text('•', ML + indent, y, { width: 12 });
  doc.font('Helvetica').fontSize(8.3).fillColor(C.ink).text(String(text), ML + 12 + indent, y, { width: CW - indent - 15, lineGap: 1.7 });
  doc.moveDown(.14);
}
function code(text) {
  const lines = String(text).split('\n');
  const h = lines.length * 11 + 15;
  ensure(Math.min(h, PH - MT - MB));
  let y = doc.y;
  lines.forEach((line) => {
    if (y + 15 > PH - MB - 18) { addPage(); y = doc.y; }
    doc.rect(ML, y, CW, 13).fill(C.wash);
    doc.font('Courier').fontSize(7.4).fillColor(C.navy).text(line, ML + 8, y + 3, { width: CW - 16, lineBreak: false });
    y += 13;
  });
  doc.y = y + 5;
}
function callout(label, text, type = 'info') {
  const color = type === 'warning' ? C.amber : type === 'danger' ? C.red : type === 'success' ? C.green : C.blue;
  const bg = type === 'warning' ? C.paleAmber : type === 'danger' ? C.paleRed : type === 'success' ? C.paleGreen : C.paleBlue;
  const hText = doc.font('Helvetica').fontSize(8).heightOfString(String(text), { width: CW - 30, lineGap: 1.5 });
  const h = Math.max(36, hText + 25);
  ensure(h + 8);
  const y = doc.y;
  doc.save().rect(ML, y, CW, h).fill(bg).rect(ML, y, 3, h).fill(color);
  doc.font('Helvetica-Bold').fontSize(7).fillColor(color).text(label.toUpperCase(), ML + 11, y + 6, { width: CW - 22 });
  doc.font('Helvetica').fontSize(8).fillColor(C.ink).text(String(text), ML + 11, y + 17, { width: CW - 24, lineGap: 1.5 });
  doc.restore(); doc.y = y + h + 8;
}
function table(columns, rows, options = {}) {
  const widths = columns.map((c) => c.width);
  const full = widths.reduce((a, b) => a + b, 0);
  const drawHeader = () => {
    ensure(23);
    const y = doc.y;
    doc.rect(ML, y, full, 20).fill(C.navy);
    let x = ML;
    columns.forEach((c, i) => {
      doc.font('Helvetica-Bold').fontSize(options.headerSize || 7).fillColor(C.paper)
        .text(c.label, x + 4, y + 5, { width: widths[i] - 8 });
      x += widths[i];
    });
    doc.y = y + 20;
  };
  drawHeader();
  rows.forEach((row, ri) => {
    const vals = row.map((v) => String(v ?? '—'));
    const hs = vals.map((v, i) => doc.font('Helvetica').fontSize(options.size || 7.1)
      .heightOfString(v, { width: widths[i] - 8, lineGap: 1.3 }));
    const rh = Math.max(options.minRowHeight || 17, Math.max(...hs) + 8);
    if (doc.y + rh > PH - MB - 18) { addPage(); drawHeader(); }
    const y = doc.y;
    if (ri % 2) doc.rect(ML, y, full, rh).fill(C.wash);
    doc.rect(ML, y, full, rh).strokeColor(C.line).lineWidth(.45).stroke();
    let x = ML;
    vals.forEach((v, i) => {
      doc.font(i === 0 && options.firstBold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(options.size || 7.1).fillColor(C.ink)
        .text(v, x + 4, y + 4, { width: widths[i] - 8, lineGap: 1.3 });
      x += widths[i];
    });
    doc.y = y + rh;
  });
  doc.moveDown(.35);
}

const chapters = [
  { title: 'Document Control', blocks: [
    ['p', 'This is a source-oriented technical handover for developers who need to operate, debug, and change StayVeo without relying on undocumented knowledge. It is based on repository inspection, not on intended architecture.'],
    ['table', [['Item', 120], ['Verified value', CW - 120]], [
      ['Current audit date', AUDIT_DATE], ['Repository HEAD', COMMIT], ['Worktree state', 'Dirty before this documentation task; unrelated modifications preserved'],
      ['Frontend', 'React + Vite single-page application'], ['Backend', 'Fastify 5 + TypeScript API'], ['Database', 'PostgreSQL via Prisma 6'],
      ['Session store', 'Redis via ioredis'], ['Authentication', 'Email/password + email OTP; HttpOnly cookie sessions'],
      ['Payments', 'Razorpay integration; webhook endpoint and persisted payment lifecycle'], ['Storage', 'Supabase Storage client and signed KYC URL flow'],
      ['Deployment evidence', 'Frontend Wrangler config + Render API origin constant; no backend deploy manifest found in repository'],
    ]],
    ['callout', 'The previous reference PDF documents an earlier frontend-focused snapshot and includes architecture claims that no longer match current source. Where it conflicts, current source wins.', 'warning'],
  ]},
  { title: 'How to Read This Document', blocks: [
    ['p', 'The reference PDF uses progressive phases: overview first, then entry points, execution, routing, dependencies, domain workflows, risks, and recommendations. This edition keeps that handover style but expands the audit to the actual frontend, API, auth/session, database, payment, Tiffin, storage, deployment, and operations code.'],
    ['bullets', [
      'A file path is repository-relative unless explicitly labelled as an absolute output path.',
      'VERIFIED means direct source/config evidence was inspected. NOT VERIFIED means the repository lacks evidence or the external system is not accessible here.',
      'This document captures the audited worktree on 2026-10-01; HEAD is 346beb8, but tracked/untracked source changes existed in the worktree.',
      'No live production database, Redis instance, cloud account, payment dashboard, or Render deployment was queried. Runtime claims are limited to code/config evidence.',
    ]],
  ]},
  { title: 'Current System Overview', blocks: [
    ['p', 'StayVeo is a student-oriented marketplace for PG accommodation, Tiffin meal subscriptions, and related provider-managed services. A React SPA calls a separate Fastify API; the API owns persistence/business logic through Prisma and PostgreSQL, and relies on Redis for authentication sessions and provider dashboard caching.'],
    ['code', 'Browser (React/Vite or deployed static SPA)\n  -> fetch client, credentials: include\n  -> Fastify API (Render origin configured in src/config/api.js)\n  -> route preHandler / validation / controller / domain service\n  -> Prisma Client -> PostgreSQL\n  -> Redis for sessions + small dashboard cache\n  -> Razorpay / Resend / Supabase Storage / Mapbox as applicable'],
    ['table', [['Surface', 105], ['Observed implementation', CW - 105]], [
      ['Student app', 'Manual React Router route table in src/App.jsx; AuthContext mirrors /auth/me identity; screens call API services.'],
      ['Provider app', 'PG and Tiffin areas use distinct layouts; provider endpoints authenticate with provider cookie and ownership derives from session.'],
      ['API', 'Fastify route groups registered in backend/src/app.ts; /api/v1 plus legacy /api/provider paths.'],
      ['Persistence', 'Prisma schema at backend/prisma/schema.prisma; SQL migrations at backend/prisma/migrations/.'],
      ['External services', 'Resend email OTP, Razorpay orders/webhooks, Supabase Storage/Realtime, Mapbox maps.'],
    ]],
  ]},
  { title: 'Technology Stack Analysis', blocks: [
    ['table', [['Layer', 100], ['Current dependencies / configuration', 200], ['Source', CW - 300]], [
      ['Frontend', 'React 19, React DOM 19, React Router DOM 7, Vite 8', 'package.json, src/main.jsx, src/App.jsx'],
      ['Frontend integrations', '@supabase/supabase-js, mapbox-gl, react-map-gl, lucide-react', 'package.json, src/lib/supabase.js, map components'],
      ['API server', 'Node, Fastify 5, TypeScript, tsx', 'backend/package.json, backend/src/server.ts'],
      ['Backend plugins', '@fastify/cookie, cors, rate-limit, sensible, fastify-plugin', 'backend/src/app.ts and backend/src/plugins/'],
      ['Persistence', 'Prisma 6 + @prisma/client; PostgreSQL', 'backend/prisma/schema.prisma, backend/src/plugins/prisma.ts'],
      ['Runtime data', 'ioredis 6', 'backend/src/plugins/redis.ts'],
      ['Auth/email', 'bcryptjs, crypto, Resend SDK', 'auth.service.ts, otp.utils.ts, email.service.ts'],
      ['Validation', 'Zod', 'module *.schema.ts and service parsing'],
      ['Payments', 'Razorpay API/signature integration', 'razorpay.client.ts, payment services'],
      ['Frontend deploy', 'Wrangler 4 + Cloudflare Pages-style asset config', 'wrangler.jsonc; package.json deploy command'],
    ]],
    ['callout', 'The manifests contain no Jest/Vitest/Playwright test script. The architecture package test command is a placeholder that exits with failure. Do not describe test coverage as implemented without adding actual test artifacts.', 'warning'],
  ]},
  { title: 'Repository Architecture', blocks: [
    ['table', [['Path', 175], ['Role and notable contents', CW - 175]], [
      ['src/', 'React SPA: App.jsx/main.jsx; pages/, components/, api/, context/, services/, stores/, hooks/, realtime/, lib/, config/.'],
      ['backend/src/', 'Fastify application, plugins, auth hooks, common utilities, domain modules and controllers/services/repositories.'],
      ['backend/prisma/', 'Prisma schema, migration history and generated-client inputs.'],
      ['supabase/migrations/', 'Supabase SQL migration for provider KYC storage policy/config.'],
      ['docs/architecture/', 'Architecture PDF generator (this file), local package manifest, and older generated/docs artifacts.'],
      ['wrangler.jsonc', 'Cloudflare asset deployment configuration with SPA fallback.'],
      ['vite.config.js', 'Vite dev server, allowed tunnel host patterns and /api proxy target.'],
    ]],
    ['bullets', [
      'Root scripts: npm run dev, build, lint, preview, deploy.',
      'Backend scripts: npm run dev, build (Prisma generate + tsc), start, db:generate, db:push, db:migrate, db:studio.',
      'Backend entry is backend/src/server.ts; Fastify composition lives in backend/src/app.ts.',
      'The root README is the Vite scaffold README and is not a reliable operational runbook.',
    ]],
  ]},
  { title: 'System Architecture and Request Lifecycle', blocks: [
    ['code', 'Browser route/component\n  -> src/api/client.js request() (fetch; credentials: include)\n  -> Fastify module route registered in backend/src/app.ts\n  -> rate limit / cookie parsing / route preHandler\n  -> controller parses Zod schema and derives actor from request auth\n  -> domain service\n  -> Prisma repository/query (or service-level Prisma)\n  -> PostgreSQL transaction/records\n  -> response envelope { success, data, message }\n  -> page/context/store updates UI'],
    ['table', [['Layer', 110], ['Implementation', 220], ['Audit note', CW - 330]], [
      ['Bootstrap', 'src/main.jsx', 'StrictMode wraps AuthProvider > ProviderProvider > ToastProvider > App.'],
      ['Routing', 'src/App.jsx', 'BrowserRouter + explicit Routes; many student/provider chunks lazy-loaded.'],
      ['Transport', 'src/api/client.js', 'Native fetch, parses JSON, credentials include, throws ApiRequestError.'],
      ['API composition', 'backend/src/app.ts', 'CORS, rate-limit, sensible, cookie, Prisma, Redis, routes, 404.'],
      ['Data layer', 'backend/src/plugins/prisma.ts; backend/src/common/db/prisma.ts', 'Fastify decoration and singleton access both exist; check imports before changing.'],
      ['Errors/logs', 'backend/src/errors/handler.ts; Fastify Pino logger', 'Global handler formats errors; production info vs dev debug/pino-pretty.'],
    ]],
  ]},
  { title: 'Frontend Bootstrap and State', blocks: [
    ['code', 'index.html -> src/main.jsx -> StrictMode -> AuthProvider -> ProviderProvider -> ToastProvider -> App -> BrowserRouter -> route match'],
    ['table', [['Concern', 130], ['Current owner', 190], ['Behavior / dependencies', CW - 320]], [
      ['Authentication mirror', 'src/context/AuthContext.jsx', 'On mount calls getAuthMe(); browser stores some profile convenience values in localStorage, but session token is HttpOnly cookie and not read from JS.'],
      ['Provider context', 'src/context/ProviderContext.jsx', 'Provider session/profile state; provider API calls use provider session cookie.'],
      ['Notifications', 'src/stores/notificationStore.ts + src/hooks/useRealtimeNotifications.ts', 'useSyncExternalStore; DB-backed REST bootstrap plus Supabase Realtime subscription.'],
      ['Toasts', 'src/context/ToastContext.jsx', 'Global transient UI feedback.'],
      ['API config', 'src/config/api.js', 'VITE_API_URL / VITE_PROVIDER_URL or hard-coded Render API origin defaults.'],
    ]],
    ['callout', 'localStorage is used as a convenience cache for profile/onboarding/portal preferences in multiple frontend modules; it is not the authenticated session source. Treat it as untrusted UI state.', 'info'],
  ]},
  { title: 'Routing Architecture and Route Map', blocks: [
    ['p', 'Routes are explicitly declared in src/App.jsx. Public/student/provider grouping is convention and layout composition rather than a universal authorization boundary: no global route guard is applied to all pages. API authorization is the security boundary.'],
    ['table', [['Route group', 125], ['Paths / component families', 205], ['Layout / access notes', CW - 330]], [
      ['Entry/auth', '/', '/role-select, /auth, /forgot-password, /college-select, /onboarding; eager entry components; no student bottom nav.'],
      ['Student marketplace', '/home, /search, /room/:id, /booking/:id, /dashboard, /profile, /saved, /notifications, /support', 'React pages; student navigation shown on most routes; API endpoints provide actual access control.'],
      ['Tiffin student', '/tiffin, /tiffin/:id, /tiffin/:id/reservation (+ payment/success)', 'Student marketplace pages in src/pages; tiffin API module.'],
      ['Provider auth/onboarding', '/provider/login, /provider/select, /provider/pg/onboarding, /provider/verify', 'Not wrapped in provider dashboard layout. /provider/onboarding redirects to PG onboarding.'],
      ['PG provider', '/provider/dashboard, /provider/bookings, /provider/add-property, /provider/listing/*, /provider/services/*, /provider/manage-beds, /provider/calendar, /provider/earnings, /provider/settings/*', 'ProviderLayout; imports pages/provider/*.jsx.'],
      ['Tiffin provider', '/provider/tiffin/onboarding and /provider/tiffin/{dashboard,customers,deliveries,menu,reports,settings}', 'TiffinProviderLayout for dashboard routes; onboarding is a separate route.'],
      ['Legacy/dead route status', '/broker/* suppression check exists in AppContent but route declarations were not found', 'Likely historical code path; verify before removing.'],
    ]],
    ['callout', 'Current route table has no catch-all NotFound route. A route match may render no page content for unknown paths while the shell remains.', 'warning'],
  ]},
  { title: 'API Architecture and Route Registration', blocks: [
    ['p', 'backend/src/app.ts registers domain route plugins under /api/v1 and separately mounts legacy/provider onboarding routes. A direct API inventory is appended in Appendix A from current route declarations. The code-level shape is Fastify routes -> controller -> service -> Prisma; not every module has a separate repository layer.'],
    ['table', [['Mount prefix', 155], ['Route source', 175], ['Domain', CW - 330]], [
      ['/api/v1/auth', 'modules/auth/auth.routes.ts', 'Email/password OTP, reset, logout, /me'],
      ['/api/v1/provider', 'modules/provider/provider.routes.ts', 'Provider session, profile, dashboard'],
      ['/api/provider', 'modules/provider/provider.routes.ts', 'Provider OTP/onboarding, identity/KYC, bank details'],
      ['/api/v1/tiffin', 'modules/tiffin/tiffin.routes.ts', 'Public discovery, student subscription/payment, provider subroutes'],
      ['/api/v1/bookings', 'modules/bookings/booking.routes.ts', 'Booking create/list/status/detail'],
      ['/api/v1/payments', 'modules/payments/payment.routes.ts', 'Razorpay order/payment verification/webhook and provider views'],
      ['/api/v1/room-listings', 'modules/room-listings/room-listing.routes.ts', 'Public room listings; provider mutations mounted separately'],
      ['/api/v1/*', 'users/student/services/PG/media/documents/visits/colleges/saved/notifications/profile-views', 'See API appendix for exact declared route paths.'],
    ]],
    ['bullets', [
      'Success envelope is built with common/utils/response.ts (sendSuccess/sendCreated).',
      'Global rate limit is 100 requests/minute; auth, booking, payment and Tiffin write routes add local limits.',
      'CORS allows no-origin calls, configured FRONTEND_URL, stayveo.com, stayveo.pages.dev and local origins; dev also allows tunnel patterns.',
      'Security headers set in app.ts onSend: nosniff, frame deny, XSS legacy header, referrer policy and permissions policy. CSP/HSTS are not set by that hook.',
    ]],
  ]},
  { title: 'Authentication — Student and Email/Password', blocks: [
    ['code', 'src/pages/AuthScreen.jsx\n -> src/api/client.js startAuth()/verifyOtp()\n -> POST /api/v1/auth/start, POST /api/v1/auth/verify-otp\n -> auth.routes.ts -> auth.controller.ts -> auth.service.ts\n -> User + EmailAuthChallenge (Prisma) + Resend email\n -> createSession(Redis) -> Set-Cookie stayveo_session'],
    ['bullets', [
      'Auth service validates Zod inputs, normalizes email/role, uses bcryptjs for password hashes and password comparison.',
      'OTP values are generated and hashed using backend/src/common/utils/otp.utils.ts; OTP expiry is 5 minutes and challenge records are in email_auth_challenges.',
      'Email delivery is via backend/src/common/utils/email.service.ts and RESEND_API_KEY. A missing key/send failure prevents completing the mail flow; no alternate provider is configured in repository.',
      'OTP verification creates/loads the user, marks challenge use, and creates a server-side session. New/incomplete profile setup uses an encrypted short-lived handoff cookie, not an authenticated session.',
      'GET /auth/me is optional-auth and returns the current user when the session cookie validates; auth UI hydrates from that response.',
    ]],
    ['callout', 'Do not treat x-user-id, localStorage userId, or phone headers as proof of identity. Several compatibility headers remain permitted by CORS/client code, but protected APIs must derive authority from validated session state.', 'danger'],
  ]},
  { title: 'Authentication — Provider, Password Reset, Logout', blocks: [
    ['code', 'ProviderLogin.jsx -> provider API client -> POST /api/provider/send-otp -> verify-otp\n -> provider.routes.ts onboarding handlers -> provider.service.ts\n -> Provider/User/ProviderProfile lookup -> createProviderSession(Redis)\n -> Set-Cookie stayveo_provider_session\n\nForgot password -> /api/v1/auth/forgot-password -> email_auth_challenges\n -> verify-password-reset -> short-lived reset token -> reset-password\n -> bcrypt hash update + student/provider session invalidation'],
    ['table', [['Flow', 115], ['Verified behavior', 200], ['Important source paths', CW - 315]], [
      ['Provider registration', 'POST /api/provider/send-otp then /verify-otp. Provider session cookie differs from student cookie; select type/onboarding continues behind provider auth.', 'backend/src/modules/provider/provider.routes.ts; provider.service.ts; provider-session.ts'],
      ['Provider guard', 'authenticateProvider validates Redis session, reloads users/provider_profiles from DB, enforces role and profile/provider-type consistency.', 'backend/src/common/hooks/authenticate-provider.ts'],
      ['Forgot/reset', 'Email challenges in DB; attempt counter key password-reset:verify:{email}; reset token hash and expiresAt are persisted; resend email through Resend.', 'backend/src/modules/auth/auth.service.ts; auth.repository.ts'],
      ['Student logout', 'POST /api/v1/auth/logout deletes student session mapping/session and clears student cookie; provider logout is separate.', 'auth.controller.ts; session.ts'],
      ['Provider logout', 'POST /api/provider/logout deletes provider session and clears provider cookie.', 'provider.controller.ts; provider-session.ts'],
      ['Reset invalidation', 'Password reset invalidates the active student session and all tracked provider sessions for that account.', 'auth.service.ts; session.ts; provider-session.ts'],
    ]],
  ]},
  { title: 'Session and Cookie Architecture', blocks: [
    ['table', [['Cookie / artifact', 140], ['Lifetime and flags', 145], ['Purpose / backing data', CW - 285]], [
      ['stayveo_session', '30 days; HttpOnly; Secure in production; SameSite configurable by SESSION_SAME_SITE, default none in prod/lax outside; path /.', 'Redis single active student session (session:{id}); mapping user_session:{userId}.'],
      ['stayveo_provider_session', '30 days; HttpOnly; Secure in production; SameSite configurable by PROVIDER_SESSION_SAME_SITE then SESSION_SAME_SITE; path /.', 'Redis provider session (provider:session:{id}); provider:user_sessions:{userId} set; legacy mapping key provider:user_session:{userId}.'],
      ['stayveo_profile_setup', '15 minutes; inherited HttpOnly/Secure/SameSite/path flags.', 'AES-256-GCM encrypted token from SESSION_SECRET (or fallback JWT_SECRET); profile completion handoff only, not API auth.'],
    ]],
    ['bullets', [
      'Session IDs are 32 random bytes encoded base64url (43 chars). Student and provider session payloads include userId, role, timestamps; provider payload also has providerType/providerId.',
      'Student creation atomically revokes the previous session for that user. Provider sessions intentionally allow multiple devices and maintain a Redis set index.',
      'Activity touch updates lastSeenAt/lastActivityAt but preserves fixed Redis TTL (KEEPTTL); it is not sliding expiry.',
      'Cookies have no explicit Domain attribute in the option objects. Browser cookie domain is host-scoped; frontend/backend cross-site deployment depends on Secure + SameSite=None + credentials CORS.',
      'No JWT bearer token is used as the primary API session. SESSION_SECRET is used for profile handoff encryption; the Redis session ID is opaque.',
    ]],
    ['callout', 'Redis outage is an authentication outage: provider auth catches session-store failures and returns 503; student auth route middleware/session access also cannot establish identity. There is no fail-open authenticated fallback.', 'warning'],
  ]},
  { title: 'Redis Architecture and Key Registry', blocks: [
    ['p', 'Redis is initialized once by backend/src/plugins/redis.ts using REDIS_URL (localhost:6379 outside production fallback; required in production). ioredis retries each request up to three times; connect/error events are logged; Fastify onClose quits/disconnects. Redis is both the session store and a small dashboard cache—not the source of truth for users/payments/bookings.'],
    ['table', [['Key pattern', 160], ['Writer / reader / expiry', 195], ['Classification and failure behavior', CW - 355]], [
      ['session:{sessionId}', 'createSession / getSession / touchSession; 30 days; JSON SessionData.', 'Student authentication authority; Redis loss makes protected student requests unavailable.'],
      ['user_session:{userId}', 'create/delete/invalidate scripts; 30 days; opaque current session ID.', 'Student single-session pointer; reset/logout deletes associated record atomically.'],
      ['provider:session:{sessionId}', 'create/get/touch/delete provider session; 30 days; JSON provider session.', 'Provider authentication authority; multiple sessions supported.'],
      ['provider:user_sessions:{userId}', 'Provider session scripts; Redis Set of session IDs, cleaned when deleting/invalidation.', 'Provider session index; used for reset-all and stale-member cleanup.'],
      ['provider:user_session:{userId}', 'Legacy compatibility pointer read/deleted by provider session Lua scripts.', 'Legacy migration compatibility; do not depend on it for normal current sessions.'],
      ['provider:dashboard:pg:{providerId}', 'Dashboard service read/write; 120-second cache; nonfinancial PG metrics.', 'Cache only; source remains PostgreSQL. Cache helper logs and degrades to DB on read/write failure.'],
      ['provider:dashboard:tiffin:{providerId}', 'Key helper is defined; usage/invalidation must be verified against specific Tiffin call sites before reliance.', 'Potential cache namespace; no claim of active reader/writer without call-site evidence.'],
      ['password-reset:verify:{email}', 'Auth service INCR + first-count EXPIRE; 10-minute TTL; attempt counter.', 'Abuse/rate-control temporary state; database challenge remains reset authority.'],
    ]],
    ['callout', 'Current Redis code does not show OTP storage: EmailAuthChallenge rows store otpHash and expiresAt in PostgreSQL. Global Fastify rate limiting is configured by the plugin and is not documented here as Redis-backed unless the limiter store is explicitly supplied.', 'info'],
  ]},
  { title: 'Authorization and Ownership Model', blocks: [
    ['table', [['Resource / route family', 150], ['Identity / scope enforcement', 190], ['Security status', CW - 340]], [
      ['Student private routes', 'authenticate reads stayveo_session -> Redis -> reloads User from Prisma; requireAuthenticated rejects absent identity.', 'Server-side actor binding enforced where hook is applied.'],
      ['Provider routes', 'authenticateProvider reads separate provider cookie, validates Redis payload, reloads User + ProviderProfile and checks role/profile/type.', 'Strong session/profile validation; each service still needs tenant scope.'],
      ['Tiffin provider', 'Authenticated provider identity is passed to resolveOwner; kitchen/profile is derived from current provider/user and customer queries are scoped by kitchenId.', 'Phone is private provider-customer data; only provider customer endpoints should return it.'],
      ['Bookings', 'Provider routes use provider auth; list-by-current-provider resolves current profile; client-supplied providerId paths still require service check.', 'Audit service ownership for each ID-addressed mutation before changing.'],
      ['Public listing/search', 'Public routes return listing/service fields by explicit query select/serialization.', 'Phone must not be added to public listing DTOs.'],
    ]],
    ['bullets', [
      'Roles present in schema: STUDENT and PROVIDER; no ADMIN role was found.',
      'Frontend route visibility is not authorization. Backend route hooks and service ownership queries are the security control.',
      'CORS allow-list is not identity validation and does not prevent direct clients from calling API routes.',
      'RLS policies are not represented in Prisma; only one Supabase SQL migration was found for KYC storage. Do not claim comprehensive database RLS.',
    ]],
  ]},
  { title: 'Database Architecture and Migration Practice', blocks: [
    ['p', 'Prisma schema source is backend/prisma/schema.prisma (currently roughly 1.5K lines). Runtime client is backend/src/plugins/prisma.ts with singleton access via backend/src/common/db/prisma.ts. Migrations are sequential SQL under backend/prisma/migrations/. The source schema is the model/field dictionary below; migration SQL is the database-change history.'],
    ['bullets', [
      'Development workflow exposed by package scripts: npm run db:migrate (prisma migrate dev), db:generate, db:push and db:studio in backend/.',
      'Prefer reviewed SQL migration in a production workflow; db:push changes schema without migration history and is not a production release plan.',
      'The current worktree contains migration 20261001000000_room_listing_contact_number; do not assume it has been deployed to production.',
      'Use Prisma transactions in source where present; do not infer a database FK from a scalar field unless a Prisma @relation and migration constraint exist.',
      'No seed script was found in the inspected package scripts; no test script is configured for the app/backend manifests.',
    ]],
    ['callout', 'The generated dictionary documents Prisma declarations. Migration-level existence of every FK/index must be verified against the corresponding SQL before schema changes; Prisma schema alone is not proof that a production database has been migrated.', 'warning'],
  ]},
  { title: 'Entity Relationship and Domain Map', blocks: [
    ['code', 'User (users)\n  -> StudentProfile (student_profiles, userId unique)\n  -> ProviderProfile (provider_profiles, userId unique)\n       -> RoomListing (provider_id) -> bed / availability data\n       -> TiffinKitchen (owner/provider relation)\n            -> TiffinSubscriptionPlan -> TiffinCustomerSubscription\n                 -> TiffinSubscriptionDay / MealLog -> MealDelivery\n                 -> TiffinPayment -> Invoice / Refund\n  -> Booking (userId/providerId/roomId scalars; inspect FK declarations separately)\n       -> Payment -> Receipt\n  -> Notification / preferences / email challenges'],
    ['p', 'The following appendix is generated directly from Prisma model and enum blocks. It lists model table mappings, scalar/relation fields, defaults, uniqueness, indexes and relation actions. Unmodeled database policies, triggers, check constraints, or production drift are not inferable from the Prisma file and are called out as not verified.'],
  ]},
  { title: 'Student Domain', blocks: [
    ['p', 'Student identity is `User` with role STUDENT; profile data is a separate 1:1 StudentProfile. Email/password auth stores passwordHash on User. Tiffin subscriptions use customerId pointing to the User identity, which contains phone_number; this is the source for authorized customer-phone views.'],
    ['table', [['Concern', 135], ['Files / tables', 195], ['Change impact', CW - 330]], [
      ['Profile onboarding', 'src/pages/StudentOnboarding.jsx -> src/api/client.js createStudentProfile -> POST /api/v1/student/profile -> student.controller/service/repository -> StudentProfile.', 'Profile DTO, student_profiles model, profile completion handoff cookie.'],
      ['Profile fetch/update', 'GET/PUT /api/v1/student/profile; authenticate hook; student_profiles + users.', 'Update response/context hydration and student-facing screens.'],
      ['Saved listings', 'src/api/client.js saved functions -> /api/v1/saved -> saved service/repository -> SavedListing.', 'User ownership and room listing IDs.'],
      ['Student contact', 'users.phone_number; StudentProfile has no phone field.', 'Do not duplicate phone storage in StudentProfile.'],
    ]],
  ]},
  { title: 'Provider Domain and Onboarding', blocks: [
    ['p', 'Provider account identity is User(role=PROVIDER) plus ProviderProfile. Current provider OTP login is email/password-based, and provider type is stored in profile/session. KYC and provider-business details live in separate profile/service models; the database keeps property/service data even when signup flow changes.'],
    ['table', [['Workflow', 130], ['Files and state', 200], ['Change dependencies', CW - 330]], [
      ['Signup/OTP', 'src/pages/provider/ProviderLogin.jsx; backend/src/modules/provider/provider.routes.ts; provider.controller.ts; provider.service.ts.', 'provider user/profile, Redis provider session, email challenge and Resend.'],
      ['PG onboarding', 'src/pages/provider/PGProviderOnboarding.jsx; POST /api/provider/pg-onboarding; provider service/repository.', 'ProviderProfile onboarding state/KYC identity fields; existing property form remains in ProviderCreateListing/RoomListingForm.'],
      ['Tiffin onboarding', 'src/pages/tiffin-provider/TiffinOnboarding.jsx; /api/v1/tiffin/provider/onboarding.', 'Out-of-scope to refactor in the prior product task; documentation records current paths only.'],
      ['Bank data', 'src/pages/provider/ProviderBankDetails.jsx; provider-bank-details module.', 'Encrypted sensitive fields; BANK_DETAILS_ENCRYPTION_KEY or SESSION_SECRET fallback.'],
      ['Dashboard', 'ProviderDashboard.jsx -> provider API -> provider dashboard service -> ProviderProfile/RoomListing/Booking/Payment data + Redis cache.', 'Cache invalidation and financial fields; do not cache authoritative revenue.'],
    ]],
    ['callout', 'No forced re-onboarding is performed by the documentation task. Provider account, property/service creation, and KYC remain separate concepts in schema/routes; do not drop property fields from database or create a second provider model.', 'info'],
  ]},
  { title: 'PG Listings, Location and Property Creation', blocks: [
    ['p', 'Property/location fields belong to property records such as RoomListing (and legacy PGDetails), not a global provider coordinate unless a specific older Provider model still carries location fields. Listing forms are in src/pages/provider/ProviderCreateListing.jsx and RoomListingForm.jsx; map picker is src/components/maps/LocationPicker.jsx. Student map renderer is src/components/maps/RoomDetailMap.jsx.'],
    ['bullets', [
      'Backend property endpoints are mounted under /api/provider/room-listings and handled by backend/src/modules/room-listings/*.',
      'Property create/edit schemas define required/optional details and coordinates; inspect room-listing.schema.ts and repository/service before changing validation.',
      'Student listing/detail queries must return the stored property latitude/longitude; never use a hardcoded default coordinate as production marker.',
      'Current worktree contains edits to map and listing files and an untracked/changed migration adding room_listing_contact_number; audit those deltas against the database before deploying.',
      'No map API token value is documented; frontend reads VITE_MAPBOX_TOKEN in map components.',
    ]],
    ['table', [['Change', 145], ['Primary path', 190], ['Verify', CW - 335]], [
      ['Add/edit property fields', 'ProviderCreateListing.jsx, RoomListingForm.jsx, room-listing.schema.ts/service/repository, schema.prisma + migration.', 'Create and update payloads, persisted values, provider list, student detail.'],
      ['Property location', 'LocationPicker.jsx, RoomDetailMap.jsx, room-listing schema/service/repository.', 'Coordinates in DB and map marker on student room detail.'],
      ['Booking fee source', 'payment.service.ts authoritativeReservationFee() reads RoomListing reservationFee then legacy PGDetails fallback.', 'Ensure change preserves server-side authoritative pricing.'],
    ]],
  ]},
  { title: 'Tiffin Domain and Student Subscription', blocks: [
    ['code', 'Student Tiffin page / src/api/tiffinStudent.js or tiffinReservation.js\n -> /api/v1/tiffin discovery/reservation/payment/verify\n -> tiffin.controller.ts -> tiffin-student.service.ts / tiffin-reservation.service.ts\n -> TiffinKitchen -> Plan -> TiffinCustomerSubscription\n -> SubscriptionDays + TiffinMealLog -> delivery state\n -> TiffinPayment / Invoice / Refund'],
    ['table', [['Lifecycle', 130], ['Current model/service concepts', 205], ['Important persistence', CW - 335]], [
      ['Kitchen', 'TiffinKitchen with owner/provider identity, public fields, availability, address/location, pricing/status.', 'tiffin_kitchens; images, meal timings, menus, plans.'],
      ['Reservation', 'Pending subscription row is reservation; payment verification activates/confirm state.', 'TiffinCustomerSubscription with PENDING/ACTIVE etc.'],
      ['Meal entitlement', 'Subscription days and per-meal logs; skip/pause/resume/renew routes.', 'TiffinSubscriptionDay, pause log, skip, renewal log, TiffinMealLog.'],
      ['Delivery', 'Provider delivery routes update meal/delivery state; optional OTP/detail record.', 'TiffinMealDelivery unique by mealLogId.'],
      ['Money', 'TiffinPayment stores fee split/snapshot; renewal service uses transactions and audit logs.', 'tiffin_payments, tiffin_invoices, tiffin_refunds, payment_audit_logs.'],
    ]],
    ['callout', 'There is a payment adapter abstraction and a `PAYMENT_MODE` switch in Tiffin payment code. Read `tiffin/payment-provider.ts` and `tiffin-payment.service.ts` before assuming every environment uses the same live/test gateway behavior.', 'warning'],
  ]},
  { title: 'Tiffin Provider Customers and PII Boundary', blocks: [
    ['p', 'The current provider Customers page is src/pages/tiffin-provider/TiffinCustomers.jsx. It calls the Tiffin provider API client for `/provider/customers`, which is mounted as GET /api/v1/tiffin/provider/customers and guarded by authenticateProvider. Controller resolves authenticated provider phone/user identity and calls tiffinProviderService.listCustomers.'],
    ['code', 'Provider cookie -> authenticateProvider -> request.providerAuth.userId/profileId\n -> resolveOwner(authenticated phone, userId) -> own kitchen\n -> own TiffinCustomerSubscription rows (customerId)\n -> users by customerId -> users.phone_number\n -> DTO item.phone -> Phone table column'],
    ['bullets', [
      'Phone data source is User.phone_number (`users.phone_number`), linked by TiffinCustomerSubscription.customerId -> User.id. The customer subscription is scoped by the resolved kitchenId.',
      'The page displays a Phone column and uses `customer.phone || "Not available"`; backend absence should serialize an empty/missing phone safely.',
      'Provider A/B separation must be enforced by the backend kitchen scope, not by hiding UI or passing a client-selected kitchen ID.',
      'Do not add student phone to public Tiffin listing/search/detail endpoints or student-facing responses.',
      'Customer detail also resolves user by customerId; apply the same kitchen ownership constraint before returning PII.',
    ]],
    ['callout', 'The provider customer list is authorized private data. Any response-shape change must be checked against listCustomers(), the provider controller, `src/api/tiffinProvider.js`, both customer list/detail screens, and provider A/B authorization.', 'danger'],
  ]},
  { title: 'Booking and Inventory Architecture', blocks: [
    ['p', 'Booking creation starts at src/pages/BookingFlow.jsx and src/api/booking.js, then POST /api/v1/bookings -> booking.controller.ts -> booking.service.ts -> booking.repository.ts. The service builds a Booking row and includes selected listing/price context. Payment intent is a separate step through /api/v1/payments.'],
    ['table', [['Stage', 110], ['Source / persisted data', 210], ['Audit note', CW - 320]], [
      ['Create request', 'BookingFlow.jsx; booking API client; POST /bookings; Booking service.', 'Student identity should be session-derived where protected; verify route middleware because booking route file has create/list routes without a declared auth preHandler in the inspected excerpt.'],
      ['Pricing snapshot', 'Booking fields monthlyRent/securityDeposit/reservationFee/platformFee/charges/price; payment service reloads authoritative room reservation fee.', 'Do not treat frontend price as authority.'],
      ['Payment intent', 'POST /payments; payment.service.ts transaction creates payment/order and audit record.', 'Gateway order and DB payment are separate side effects.'],
      ['Confirmation', 'POST /payments/:paymentId/verify or webhook path; lifecycle/status update; notification/receipt flows.', 'Do not infer exact inventory decrement behavior without a dedicated inventory mutation in current service/repository.'],
      ['Provider view', 'ProviderBookings.jsx -> bookings provider endpoints -> provider-scoped query.', 'Student phone/email sourced from User/customer relation/booking snapshot depending query; preserve existing PG behavior.'],
    ]],
    ['callout', 'Concurrency protection must be described from the actual transaction/unique constraints. No claim of row locking or guaranteed bed allocation should be made solely because booking creation uses a transaction.', 'warning'],
  ]},
  { title: 'Payment Architecture and Financial Calculation', blocks: [
    ['table', [['Product / function', 150], ['Server calculation', 190], ['Persisted values', CW - 340]], [
      ['PG calculatePgPayment(reservationFee)', 'Base = authoritative DB reservationFee; platformFee fixed at 99; bearer STUDENT; ownerAmount = base; studentPayable = base + 99.', 'Payment reservationFee/platformFee/ownerAmount/studentPayable/pricingSnapshot; audit log.'],
      ['Tiffin calculateTiffinPayment(input)', 'Monthly first payment: fee 99 for one meal/day, 199 for two; monthly renewal: 49/99; other plans fee 0. First-payment commission bearer OWNER; renewal bearer STUDENT.', 'TiffinPayment baseAmount/platformFee/commissionBearer/ownerAmount/totalAmount snapshot.'],
      ['Razorpay order', 'razorpayClient creates server order from payable amount in paise.', 'providerOrderId, gateway, status/lifecycle; order failure may leave an initiated DB row for recovery.'],
      ['Verification', 'Client signature verification and webhook signature verification use Razorpay client secret; order/payment IDs bound to records.', 'Payment/TiffinPayment lifecycle, audit, booking/subscription activation, notifications/receipt.'],
    ]],
    ['bullets', [
      'PG calculation: backend/src/modules/payments/payment-calculator.ts::calculatePgPayment; orchestration in payment.service.ts::createPgPaymentIntent.',
      'Tiffin calculation: same calculator module::calculateTiffinPayment; write flow in tiffin-payment.service.ts::createPendingPayment and verification path.',
      'Webhook endpoint POST /api/v1/payments/webhooks/razorpay captures raw body in payment.routes.ts; PaymentWebhookEvent unique eventId supports duplicate event recognition; handler stores received/processed/failed status and signatureVerified.',
      'No live Razorpay credentials or dashboard state were inspected. Env key names include key_id, key_secret and webhook secret read by service/client; values intentionally excluded.',
    ]],
    ['callout', 'Before changing fees, update only the server calculator and validate PG + Tiffin payment snapshots, client amount display, audit log, webhook verification and receipts. Never derive provider payout from a frontend display formula.', 'danger'],
  ]},
  { title: 'Notifications and Realtime', blocks: [
    ['code', 'Domain event -> notification.queue.ts (queueMicrotask) -> notification.event-handler.ts\n -> notification.service.ts -> preference/template/factory -> repository\n -> notifications table + notification logs/retry/dead-letter records\n\nFrontend REST bootstrap -> useRealtimeNotifications -> notificationStore\nSupabase Realtime subscription -> src/realtime/notifications.ts -> store upsert'],
    ['bullets', [
      'Notification event pipeline is process-memory queued, not a durable Redis queue. A process crash can lose an event before persistence.',
      'In-app notification rows are persisted in PostgreSQL. Dispatcher records delivery/log status; retry/dead-letter models exist but a durable scheduler/worker process was not found.',
      'Frontend subscribes to `notifications` table changes by Supabase Realtime channel scoped in channel name to `notifications:user:{userId}`; actual Supabase row policy must be verified separately.',
      'Primary files: backend/src/modules/notifications/notification.{queue,event-handler,service,dispatcher,repository}.ts; src/hooks/useRealtimeNotifications.ts; src/realtime/notifications.ts; src/stores/notificationStore.ts.',
    ]],
  ]},
  { title: 'Storage and Upload Security', blocks: [
    ['table', [['Flow', 145], ['Implementation', 210], ['Trust boundary', CW - 355]], [
      ['PG listing images', 'Frontend Supabase client/storage helper; public listing image references.', 'Bucket access policy is separate from backend auth; inspect Supabase SQL policy before relying on ownership.'],
      ['Provider KYC documents', 'Tiffin/provider onboarding requests signed upload URL from backend and uploads to configured Supabase storage bucket.', 'Backend requires provider authentication and service role key; bucket path/allowlist and expiration in module.'],
      ['General media', 'backend/src/modules/media/* and frontend storage utilities.', 'Route authentication and provider ownership must be checked for each operation.'],
      ['Documents', 'backend/src/modules/documents/*.', 'Document model / storage pointer; sensitive data should not be exposed by public route.'],
    ]],
    ['bullets', [
      'Frontend Supabase configuration reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in src/lib/supabase.js.',
      'Backend private storage calls use SUPABASE_URL or VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_KYC_BUCKET (with code default).',
      'One Supabase migration exists at supabase/migrations/20260817000000_create_provider_kyc_documents.sql; do not assume it describes every bucket policy.',
    ]],
  ]},
  { title: 'Maps and Location Data', blocks: [
    ['table', [['Concern', 130], ['Files', 185], ['Data flow', CW - 315]], [
      ['Property pin', 'src/components/maps/LocationPicker.jsx', 'Mapbox token -> click/current-location interaction -> room/property latitude and longitude form values.'],
      ['Student property map', 'src/components/maps/RoomDetailMap.jsx', 'Room/listing coordinates loaded from API -> Mapbox marker.'],
      ['Tiffin service location', 'src/components/tiffin/ExactLocation.jsx; TiffinKitchen schema', 'Kitchen address/coordinates and delivery radius are service-level data.'],
      ['Distance', 'src/utils/calculateDistance.ts; src/hooks/useDistanceFromCollege.ts; backend/src/common/utils/geo.ts', 'Distance calculation should be confirmed independently when changing discovery filters.'],
    ]],
    ['callout', 'VITE_MAPBOX_TOKEN is client-visible by design and should be scoped/restricted at the Mapbox account. It is not a server secret. Production coordinates must come from property/kitchen records, never a test constant.', 'warning'],
  ]},
  { title: 'Environment Variable Registry', blocks: [
    ['table', [['Variable', 170], ['Files / purpose', 205], ['Classification / effect', CW - 375]], [
      ['DATABASE_URL', 'backend/prisma/schema.prisma; Prisma connection.', 'Secret. Database connection/rotation affects API persistence.'],
      ['DIRECT_URL', 'Prisma schema and backend/common/db/prisma.ts.', 'Secret. Direct DB access/migrations; fallback to DATABASE_URL in client helper.'],
      ['REDIS_URL', 'backend/src/plugins/redis.ts.', 'Secret. Required in production; sessions/cache unavailable on outage.'],
      ['SESSION_SECRET / JWT_SECRET', 'session.ts.', 'Secret. SESSION_SECRET primary; JWT_SECRET compatibility fallback for handoff encryption. Rotating invalidates ability to decrypt existing setup handoffs.'],
      ['SESSION_SAME_SITE / PROVIDER_SESSION_SAME_SITE', 'session.ts; provider-session.ts.', 'Cookie security config; must align with cross-origin frontend and HTTPS.'],
      ['RESEND_API_KEY', 'common/utils/email.service.ts.', 'Secret. Email OTP/password reset delivery.'],
      ['RAZORPAY names', 'key_id, key_secret, webhook-secret settings referenced by payment client/service.', 'Secrets except key_id (publishable identifier). Rotation affects order/payment verification/webhooks.'],
      ['FRONTEND_URL, NODE_ENV, PORT, HOST', 'backend app/server.', 'Deployment origins, cookie flags, bind address and logging.'],
      ['BANK_DETAILS_ENCRYPTION_KEY', 'common/utils/sensitive-data.ts.', 'Secret; SESSION_SECRET fallback. Rotation can affect existing encrypted bank data; inspect migration/crypto versioning first.'],
      ['SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_KYC_BUCKET', 'Tiffin provider storage service.', 'Service role key is highly sensitive; signed KYC upload flow.'],
      ['VITE_API_URL, VITE_PROVIDER_URL', 'src/config/api.js.', 'Frontend build-time API origin; included in browser bundle.'],
      ['VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY', 'src/lib/supabase.js.', 'Public frontend configuration; security depends on Supabase policies.'],
      ['VITE_MAPBOX_TOKEN', 'map picker/detail/exact location components.', 'Client-visible token; restrict domains/scopes.'],
      ['BACKEND_PROXY_URL, VITE_ALLOWED_HOSTS', 'vite.config.js.', 'Local/dev server proxy and host allow list.'],
      ['VITE_REALTIME_DEBUG', 'src/realtime/debug.ts.', 'Frontend debug logging toggle.'],
      ['PAYMENT_MODE, key_id, key_secret', 'Tiffin payment adapter/reservation/renewal.', 'Environment mode + Razorpay credentials; no credential values reproduced.'],
    ]],
    ['callout', 'The full environment registry is a code-reference inventory, not proof that every variable is configured in production. Secret values are intentionally omitted.', 'info'],
  ]},
  { title: 'Deployment and Runtime Configuration', blocks: [
    ['table', [['Area', 135], ['Repository evidence', 210], ['Known limitation', CW - 345]], [
      ['Frontend origin', 'wrangler.jsonc declares name stayveo, compatibility date, SPA not-found handling. Root `npm run deploy` builds then runs wrangler deploy.', 'No custom domain/Cloudflare account deployment state is in repository.'],
      ['Backend origin', 'src/config/api.js defaults API origin to https://stayveo.onrender.com.', 'No render.yaml, Dockerfile, Procfile or CI deployment workflow found in repo scan. Render is evidenced by API URL, not a checked deployment descriptor.'],
      ['Development', 'npm run dev invokes Vite; vite.config.js proxies /api to BACKEND_PROXY_URL or Render origin.', 'Proxy secure=false; allowed tunnel hosts are in configuration.'],
      ['API health', 'GET /health in backend/src/app.ts; backend listens on PORT default 3000, HOST default 0.0.0.0.', 'Health route returns static API healthy timestamp; it does not prove database/Redis readiness.'],
      ['Database / Redis', 'PostgreSQL via Prisma env URLs; Redis via REDIS_URL.', 'External managed endpoints/backup/HA plans not verifiable in repository.'],
      ['Webhook', 'POST /api/v1/payments/webhooks/razorpay.', 'Production configured Razorpay webhook URL not in checked config.'],
    ]],
    ['code', 'Frontend: npm run build -> wrangler deploy\nBackend dev: cd backend && npm run dev\nBackend build: cd backend && npm run build\nBackend runtime: cd backend && npm start\nDB migration (dev): cd backend && npm run db:migrate\nHealth: GET /health'],
  ]},
  { title: 'Security Review and Verified Gaps', blocks: [
    ['table', [['Area / severity', 125], ['Evidence and current control', 220], ['Risk / recommendation', CW - 345]], [
      ['Session security — implemented', 'Opaque random ID, Redis server state, HttpOnly cookies, role/profile DB revalidation; separate student/provider cookies.', 'Preserve SameSite/Secure/CORS alignment and test resets/logout/cross-origin behavior.'],
      ['CORS — partial', 'Origin allowlist in app.ts; credentials true; headers include legacy identity names.', 'CORS does not authorize callers; minimize allowed origins/headers and maintain server actor derivation.'],
      ['CSRF — not verified', 'SameSite defaults and cookie credentials; no explicit CSRF token/header check found in inspected files.', 'Review mutating cookie-auth routes under deployed cross-site topology.'],
      ['Security headers — partial', 'X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy.', 'CSP/HSTS not set in app hook; edge may add them but not repo-verified.'],
      ['PII — sensitive', 'Student phone stored on User and exposed to scoped provider customer functions.', 'Keep response restricted to authenticated kitchen owner; test provider A vs B at backend.'],
      ['Webhook verification — implemented in code', 'Raw body capture; signature verification; PaymentWebhookEvent unique eventId and status.', 'Test invalid signature/retry/duplicate events and secrets at deployment.'],
      ['RLS — not verified', 'Prisma does not express policies; one Supabase storage migration found.', 'Inspect live SQL/RLS configuration before asserting client data isolation.'],
      ['Automated tests — gap', 'No unit/API/e2e test files surfaced and scripts absent.', 'Add auth, ownership, payments, subscription, migration and race tests before claiming coverage.'],
      ['Secrets — deployment not verified', 'Code consumes env secrets; no secret values included.', 'Confirm deploy secrets managed outside repo, rotate exposure if discovered.'],
    ]],
  ]},
  { title: 'Transactions, Idempotency and Concurrency', blocks: [
    ['bullets', [
      'Student/provider session create/delete/touch uses Redis Lua scripts for atomic state changes.',
      'Payment intent and verification paths use Prisma $transaction blocks; Payment has unique transactionId, idempotencyKey, order/payment provider identifiers.',
      'PaymentWebhookEvent.eventId is unique; event processing persists RECEIVED/PROCESSED/FAILED status. This is database deduplication, not a blanket exactly-once guarantee for external side effects.',
      'Tiffin renewal creation/completion and payment activation use transaction blocks; subscription day and meal log uniqueness prevent duplicate date/category rows where declared.',
      'Booking route/service does not prove inventory row-locking; check availability mutation and constraint design before promising race-free allocation.',
      'External Razorpay calls cannot be rolled back by a PostgreSQL transaction. Recovery must inspect initiated/pending rows and gateway order state.',
    ]],
    ['callout', 'Before editing transactional code, record which writes happen before and after external calls, and how retries behave. A database transaction is not a payment-gateway transaction.', 'warning'],
  ]},
  { title: 'State Machines and Lifecycle Fields', blocks: [
    ['p', 'Enums are generated into the database appendix. The principal observed enums include UserRole, BookingStatus, VisitStatus, PaymentType/Status/LifecycleState, TiffinSubscriptionStatus, TiffinPaymentStatus, KitchenStatus/VerificationStatus, MealLogStatus, DeliveryType and complaint/subscription-day states. Some lifecycle columns are free-form strings rather than enums; do not assume exhaustive transition validation.'],
    ['table', [['Domain', 125], ['Lifecycle evidence', 210], ['Transition owners to inspect', CW - 335]], [
      ['Auth challenge', 'EmailAuthChallenge purpose, expiresAt, verifiedAt and resetTokenHash.', 'auth.service.ts / auth.repository.ts'],
      ['Booking', 'BookingStatus enum; create and provider status mutation route.', 'booking.service.ts/controller.ts'],
      ['Payment', 'PaymentStatus + PaymentLifecycleState; provider order/payment IDs and verifiedAt/paidAt.', 'payment.service.ts, payment-webhook.service.ts'],
      ['Tiffin subscription', 'TiffinSubscriptionStatus, paymentStatus, pause/resume/cancel/confirm timestamps.', 'tiffin reservation/student/renewal services'],
      ['Meal', 'MealLogStatus; skipped/delivered/missed timestamps and optional delivery detail.', 'tiffin student/provider services'],
      ['Provider onboarding', 'OnboardingStatus enum and provider type/verification booleans.', 'provider.service.ts and Tiffin onboarding service'],
    ]],
  ]},
  { title: 'Failure Scenarios and Recovery', blocks: [
    ['table', [['Failure', 130], ['Observed behavior', 205], ['Operator / developer checks', CW - 335]], [
      ['Redis unavailable', 'Redis plugin logs and operations fail; auth hook returns 503 for provider session lookup; dashboard cache helper logs and uses DB fallback.', 'REDIS_URL, Redis health/logs, session key TTL; do not disable auth to restore service.'],
      ['PostgreSQL unavailable', 'Prisma operations fail; global handler returns API error response.', 'DATABASE_URL/DIRECT_URL, connectivity, migration state, Prisma logs.'],
      ['Resend unavailable', 'OTP/reset email call fails; no alternate mail provider detected.', 'RESEND_API_KEY, Resend response/log; challenge row expiry and rate limits.'],
      ['Razorpay unavailable', 'Order creation/verification throws; initiated/pending records may remain.', 'key_id/key_secret, providerOrderId, lifecycle, payment audit and gateway dashboard.'],
      ['Webhook delayed/duplicate', 'Unique event ID and persisted event status support duplicate recognition/reprocessing diagnosis.', 'payment_webhook_events status/errorMessage and associated payment lifecycle.'],
      ['Cookie absent/expired', 'Protected route rejects 401; provider hook clears invalid cookie; DB user/profile still exists.', 'Browser cookie flags, CORS credentials, Redis key TTL and auth hook.'],
      ['Realtime disconnect', 'REST bootstrap remains available; live updates pause until channel reconnects/resubscription.', 'Supabase config, row policies, channel logs, useRealtimeNotifications cleanup.'],
      ['Storage upload fails', 'Signed upload or Supabase upload error surfaces; DB pointer may not be saved depending flow stage.', 'Supabase URL/bucket/service-role credentials, signed URL expiry, allowed content type/path.'],
      ['Concurrent booking', 'Actual outcome depends on availability checks and database constraints; no universal locking claim made.', 'Booking service query/write ordering, DB unique/index constraints, concurrent integration test.'],
    ]],
  ]},
  { title: 'Observability and Error Handling', blocks: [
    ['bullets', [
      'Fastify Pino logger is debug in non-production (pino-pretty transport) and info in production, configured in backend/src/app.ts.',
      'Global error handler is backend/src/errors/handler.ts; unknown errors should be inspected in server logs, while response output is sanitized by handler policy.',
      'Redis plugin logs connect/error and shutdown issues; cache helpers emit cache hit/miss/failure diagnostics.',
      'Frontend API client throws ApiRequestError with HTTP status, URL and parsed response details; network exhaustion includes attempted URL metadata.',
      'Health endpoint /health reports API process status only; no liveness/readiness split or external monitoring config was found.',
      'No Sentry, OpenTelemetry, log shipping, CI alerting, or backend health-check deployment file was found in repository configuration.',
    ]],
  ]},
  { title: 'Testing Architecture and Confidence', blocks: [
    ['table', [['Area', 140], ['Repository test evidence', 190], ['Required manual verification', CW - 330]], [
      ['Frontend', 'No test/spec files surfaced by repository scan; root manifest has build/lint only.', 'npm run lint/build; test auth/onboarding, booking, responsive provider pages manually.'],
      ['Backend', 'No test/spec files surfaced; backend package has no test command.', 'npm run build; exercise API with isolated credentials/database and inspect server logs.'],
      ['Auth/Redis', 'No automated session/OTP tests found.', 'student/provider cookie, TTL, reset invalidation, Redis outage and session-cross-role tests.'],
      ['Booking/payment', 'No API/webhook tests found.', 'duplicate create/verify/webhook, invalid signature, gateway timeout, authoritative amount, receipt/notification.'],
      ['Tiffin', 'No subscription/customer ownership tests found.', 'payment activation, skip/pause/renewal, phone list/detail, provider A/B isolation.'],
      ['DB/migration', 'Migration history present; no migration CI test found.', 'Prisma generate, deploy migrations to disposable DB, verify FK/index/data preservation.'],
    ]],
    ['callout', 'This PDF is documentation-only. No source tests/builds were run as part of this audit because application code is explicitly out of scope.', 'info'],
  ]},
  { title: 'File Ownership and Dependency Matrix', blocks: [
    ['table', [['Entry file', 190], ['Layer / dependencies', 200], ['Change-risk surface', CW - 390]], [
      ['src/App.jsx; src/main.jsx', 'Frontend router/bootstrap; layouts and contexts.', 'All route imports, nav visibility, route fallback, React provider order.'],
      ['src/api/client.js; src/config/api.js', 'Shared fetch transport, credentials, envelope and API origins.', 'All API consumers, cookies/CORS, error handling and build-time endpoints.'],
      ['backend/src/app.ts; server.ts', 'Fastify plugin and route composition; server lifecycle.', 'Every endpoint, CORS, rate limit, cookies, security headers and startup.'],
      ['backend/src/common/auth/session.ts; provider-session.ts', 'Redis session authority, Lua scripts, cookie options.', 'Every protected API, login/reset/logout, same-site/deployment.'],
      ['backend/src/modules/payments/payment-calculator.ts', 'Shared server-side PG/Tiffin money split formulas.', 'Payment snapshots, displayed totals, owner proceeds, audit and refunds.'],
      ['backend/src/modules/bookings/*', 'Booking API/business logic, persistence, receipt.', 'Payments, provider bookings, inventory/availability, notifications.'],
      ['backend/src/modules/tiffin/*', 'Subscription, kitchen, provider portal, payment and meals.', 'Student Tiffin, customer PII, plans, meal schedule, gateway events.'],
      ['backend/prisma/schema.prisma + migrations/', 'Database model and deployed schema evolution.', 'Every Prisma query/DTO/migration/data conversion.'],
      ['backend/src/modules/notifications/* + src/realtime/*', 'Persisted notification pipeline + Supabase realtime reader.', 'Booking/payment/Tiffin event UX, preferences, unread counts and RLS.'],
    ]],
  ]},
  { title: 'Change Impact Map', blocks: [
    ['table', [['If this changes', 145], ['Dependencies affected', 195], ['Minimum verification', CW - 340]], [
      ['Session model/TTL', 'Auth services/controllers, both hooks, cookies, AuthContext, provider/tiffin/customer APIs, Redis keys.', 'Login, parallel devices, reset, logout, cookie transport, expiry and Redis outage.'],
      ['User/Provider identity schema', 'Auth, onboarding, customer phone, bank/KYC, listing ownership, bookings, Tiffin owner resolution.', 'Migrations + role/session/profile consistency + phone visibility/private endpoints.'],
      ['Booking/payment amount', 'Booking flow, payment calculator/service, UI checkout, webhook, receipt, earnings, notifications.', 'Authoritative DB amount, gateway order, signature, duplicate webhook, fee ledger.'],
      ['RoomListing coordinates/fields', 'Provider form/map, Zod DTO, API/repository, student detail map/search, payment fee source.', 'Create/edit/read persistence and saved-coordinate map marker.'],
      ['Tiffin subscription relation', 'Reservation/payment activation, customers, phone privacy, meal logs/days/delivery, renewals/refunds.', 'Provider A/B scope, student actor, duplicate subscription and meal entitlement.'],
      ['Notification event', 'Queue/event handler/template/factory/repository, Supabase Realtime listener, UI store/pages.', 'Persisted row, preference, duplicate event behavior, unread count and realtime update.'],
      ['API response field', 'Controller/service serializer, frontend API client and all UI consumers.', 'Null/undefined compatibility, role privacy, error envelope.'],
    ]],
  ]},
  { title: 'Architectural Invariants', blocks: [
    ['table', [['Invariant', 190], ['Status', 90], ['Evidence / caveat', CW - 280]], [
      ['Authenticated identity comes from server session, not arbitrary request identity.', 'ENFORCED where hooks applied', 'Redis-backed hooks attach request.user; route coverage must still be inspected per endpoint.'],
      ['A Tiffin provider only receives own-kitchen customers/phone.', 'ENFORCED in scoped service path', 'resolveOwner + kitchenId query; retain cross-provider API tests.'],
      ['Student and provider sessions are distinct cookies/stores.', 'ENFORCED', 'stayveo_session vs stayveo_provider_session.'],
      ['Database is source of truth for accounts, bookings, payments and subscriptions.', 'ENFORCED by design/code', 'Redis holds session/cache, not canonical business rows.'],
      ['Server recalculates PG payable from database reservation fee.', 'ENFORCED', 'authoritativeReservationFee + calculatePgPayment.'],
      ['Webhook processing is exactly once.', 'PARTIAL', 'Unique eventId and event status deduplicate; external side effects/retries still need review.'],
      ['Provider route group automatically protects every provider endpoint.', 'NOT ENFORCED globally', 'Some route groups declare auth hooks; audit each module, especially public/shared reads.'],
      ['All PostgreSQL access is protected by RLS.', 'NOT VERIFIED', 'No complete RLS migration/policy set found in repository scan.'],
    ]],
  ]},
  { title: 'Production Runbook', blocks: [
    ['table', [['Operation', 155], ['Command / check', 200], ['Safety note', CW - 355]], [
      ['Build frontend', 'npm run build', 'Requires VITE_* build configuration; inspect dist output.'],
      ['Lint frontend', 'npm run lint', 'ESLint over repository; not a substitute for tests.'],
      ['Build backend', 'cd backend && npm run build', 'Runs prisma generate then tsc.'],
      ['Run backend locally', 'cd backend && npm run dev', 'Requires DATABASE_URL, Redis, and email/payment env as exercised.'],
      ['Inspect Prisma models', 'cd backend && npm run db:studio', 'Connects to configured database; protect access to production.'],
      ['Apply migration in development', 'cd backend && npm run db:migrate', 'Review migration and data impact first; production deployment process not defined in repo.'],
      ['Check API', 'GET /health', 'Does not validate DB, Redis, email or payment readiness.'],
      ['Deploy frontend', 'npm run deploy', 'Build + wrangler deploy; requires configured Cloudflare account/env.'],
    ]],
    ['callout', 'Never run schema push, migrations, payment retries, or secret rotation against production without environment confirmation, backup/recovery plan, and an approved release process. That operational authority/configuration is not evidenced in the repository.', 'danger'],
  ]},
  { title: 'New Developer — Start Here', blocks: [
    ['bullets', [
      '1. Read this document’s overview, route map, auth/session and database sections before editing a shared module.',
      '2. Frontend starts at index.html -> src/main.jsx -> src/App.jsx. Root scripts are in package.json.',
      '3. Backend starts at backend/src/server.ts -> buildApp() in backend/src/app.ts.',
      '4. Inspect backend/prisma/schema.prisma and the newest migration before changing persistence; use Prisma scripts in backend/package.json.',
      '5. Understand the difference between student session, provider session, and profile setup handoff in common/auth/session.ts and provider-session.ts.',
      '6. Follow API request() in src/api/client.js and response helpers in backend/src/common/utils/response.ts.',
      '7. Payments and reservation flows require isolated test credentials; never test against live money without explicit environment confirmation.',
      '8. Search using rg. Search an endpoint from UI API client into backend route/controller/service/repository/model.',
      '9. No test suite/runbook currently exists in manifests; add appropriate tests within a separately approved source-code task.',
      '10. Before deployment, verify the external env inventory, migration status, CORS/cookie topology, health/log access and rollback path; deployment backend config is not checked in.',
    ]],
    ['sub', 'FIRST FILES TO READ'],
    ['bullets', [
      'package.json; backend/package.json; vite.config.js; wrangler.jsonc',
      'src/main.jsx; src/App.jsx; src/api/client.js; src/context/AuthContext.jsx',
      'backend/src/server.ts; backend/src/app.ts; backend/src/plugins/redis.ts; backend/src/plugins/prisma.ts',
      'backend/src/common/auth/session.ts; provider-session.ts; common/hooks/authenticate.ts; authenticate-provider.ts',
      'backend/src/modules/auth/*; bookings/*; payments/*; provider/*; tiffin/*; notifications/*',
      'backend/prisma/schema.prisma and the relevant migration directory',
    ]],
  ]},
  { title: 'Troubleshooting Guide', blocks: [
    ['table', [['Symptom', 145], ['Check in order', 235], ['Success condition', CW - 380]], [
      ['Login unauthorized', 'Browser cookie -> credentials include in src/api/client.js -> CORS origin and allow credentials -> Redis session key/TTL -> authenticate hook -> DB User role.', 'GET /api/v1/auth/me returns current profile with a valid session.'],
      ['Provider dashboard fails', 'stayveo_provider_session -> Redis provider:session key -> ProviderProfile matches session -> /provider/dashboard -> cache helper -> PG queries.', 'Provider identity resolved from cookie and current provider-owned records return.'],
      ['Tiffin customer phone missing', 'GET /api/v1/tiffin/provider/customers -> tiffinProviderService.listCustomers -> customerId-to-User join/select -> User.phone_number -> DTO customer.phone -> UI fallback.', 'Valid phone in `users.phone_number`; query is kitchen-scoped and frontend displays it.'],
      ['Cross-provider Tiffin data', 'authenticateProvider session -> resolveOwner(userId/profile) -> own kitchenId query -> customer detail query constraint.', 'Provider B returns only B kitchen records; direct API test returns no A PII.'],
      ['Payment succeeded, booking pending', 'Gateway order/payment -> verify endpoint or webhook -> signature/event row -> payment lifecycle -> booking update -> receipt/notification.', 'Payment record reaches paid/verified terminal state and linked booking/subscription matches.'],
      ['Map marker absent/wrong', 'Mapbox token -> listing API coordinates -> RoomListing/legacy mapping -> LocationPicker persisted values -> RoomDetailMap input.', 'Marker coordinates equal property DB values; no fallback hardcoded coordinate.'],
      ['500 / DB error', 'Response error envelope -> Fastify Pino logs -> handler.ts -> Prisma field/table -> latest applied migration vs schema.', 'Source schema and deployed migration state match; error does not expose secret/SQL details.'],
      ['Realtime notifications stop', 'REST notification fetch -> Supabase client env -> channel status/debug -> table policy -> cleanup/re-subscribe.', 'REST list still loads; realtime channel reconnects and scoped notification updates reach store.'],
    ]],
  ]},
  { title: 'Historical and Deprecated Architecture', blocks: [
    ['table', [['Historical statement / artifact', 205], ['Current-code replacement', CW - 205]], [
      ['Client-sent x-user-id/header identity as trusted authentication', 'Cookie + Redis session hooks. Legacy headers remain in transport/CORS compatibility; never use as authorization proof.'],
      ['Supabase Auth as the API identity authority', 'Current auth uses app-managed email/password + OTP; Supabase JS remains for storage and Realtime integration.'],
      ['Dummy OTP / no server authentication', 'Current service has password bcrypt, hashed challenges, Resend delivery and Redis sessions.'],
      ['Mock-only payment architecture', 'Current backend contains Razorpay client, order/verify logic, raw-body webhook route, payment event/audit persistence; runtime mode/config still varies.'],
      ['No Redis / no session store', 'Current Redis stores student/provider sessions and PG dashboard summary cache.'],
      ['Vite template README as setup guide', 'Use package manifests/config listed in this document; README content is generic scaffold text.'],
    ]],
    ['callout', 'The supplied reference PDF is a historical frontend-only audit and includes old localStorage/header/Supabase auth assumptions. Preserve it as reference; do not copy those claims into current implementation docs.', 'warning'],
  ]},
  { title: 'Current vs Previous Architecture', blocks: [
    ['table', [['Topic', 115], ['Previous/reference state', 165], ['Current repository state', CW - 280]], [
      ['Trust boundary', 'Frontend routes and direct client identity headers.', 'Fastify authentication hooks validate cookies against Redis and re-read user/provider profile.'],
      ['Email/password OTP', 'Older PDF described phone OTP and local profile auth.', 'Email/password + email OTP challenge; Resend; PostgreSQL challenge; bcrypt; role-specific session.'],
      ['Persistence', 'Supabase client presumed to be general database API.', 'Backend Prisma/PostgreSQL is primary application persistence; Supabase is still used for storage and realtime.'],
      ['Payments', 'Old/mock adapter statements.', 'Razorpay client and verified lifecycle exists; Tiffin adapter is mode-aware.'],
      ['Routing', 'Earlier 43-route snapshot.', 'Current src/App.jsx has current student/PG/Tiffin route groups and layouts; exact route registry in Appendix A.'],
      ['Document scope', 'Frontend-only audit with explicit exclusions.', 'Full repository-oriented handover with source-verified gaps and limitations.'],
    ]],
  ]},
  { title: 'Technical Debt and Verified Gaps', blocks: [
    ['bullets', [
      'No automated test suite or CI workflow was found; critical auth/payment/tenant-isolation flows have no repository test evidence.',
      'No checked-in backend deployment manifest, Render service definition, production webhook URL, or deployment/rollback runbook was found.',
      'Health endpoint only confirms process response and does not check PostgreSQL/Redis readiness.',
      'Cookie-authenticated writes have no explicit CSRF token flow in inspected route configuration; review actual deployed same-site topology.',
      'Security headers do not include CSP/HSTS in backend hook; any edge configuration is external and unverified.',
      'Notification queue is an in-process microtask; retry/dead-letter records exist but a durable job worker/scheduler was not found.',
      'Prisma declarations and SQL migrations require production drift verification; schema/migration presence is not evidence of live deployment.',
      'Current route table has no explicit catch-all route; unknown frontend paths may render blank shell.',
      'Provider/public/private route protection must be reviewed endpoint by endpoint; authenticated UI layout is not a server access control.',
    ]],
  ]},
  { title: 'Recommendations — Evidence-Based', blocks: [
    ['numbered', [
      'Add automated tests for auth/session isolation, student/provider role checks, Tiffin kitchen tenant separation/phone privacy, payment calculator/order/webhook retries, and migration integrity.',
      'Check in deployment topology and a runbook for backend host, secrets, CORS origin, cookie SameSite/Secure, health checks, webhook endpoints and rollback.',
      'Implement readiness checks for PostgreSQL and Redis separately from liveness if operators need dependency health.',
      'Review CSRF protections and add CSP/HSTS at the confirmed TLS termination layer; verify through deployed response headers.',
      'Move notification event processing to a durable queue only if delivery guarantees are required; document retry worker schedule and idempotency.',
      'Generate/verify database dictionary against both Prisma schema and applied SQL migrations during release CI.',
      'Add explicit not-found/route guards as product behavior requires; keep API authentication as actual privacy boundary.',
    ]],
    ['callout', 'Recommendations are findings for future engineering work, not changes performed in this documentation-only task.', 'info'],
  ]},
  { title: 'Feature Ownership and Where to Change X', blocks: [
    ['table', [['Ticket / task', 150], ['Primary source locations', 210], ['Dependencies / tests to plan', CW - 360]], [
      ['Student login / OTP', 'src/pages/AuthScreen.jsx; src/api/client.js; backend/src/modules/auth/*; common/utils/otp.utils.ts; common/utils/email.service.ts.', 'EmailAuthChallenge, User, student cookie/session Redis; test wrong/expired OTP and password.'],
      ['Provider login / onboarding', 'src/pages/provider/ProviderLogin.jsx; ProviderVerification.jsx; backend/src/modules/provider/*; common/auth/provider-session.ts.', 'ProviderProfile, provider session set, KYC, business details and type routing.'],
      ['Session duration/cookie flags', 'backend/src/common/auth/session.ts; provider-session.ts; frontend API credentials; backend app CORS.', 'Redis TTL + cookie maxAge + cross-origin settings; run auth/expiry/reset tests.'],
      ['PG reservation/platform fee', 'backend/src/modules/payments/payment-calculator.ts::calculatePgPayment; payment.service.ts.', 'Payment snapshot/audit, checkout amount, provider earnings and receipt.'],
      ['PG inventory/availability', 'backend/src/modules/bookings/*; room-listings/*; relevant RoomListing/bed models.', 'Capacity checks, transactions/constraints, concurrent booking and provider bed UI.'],
      ['Tiffin plan/renewal fee', 'payment-calculator.ts::calculateTiffinPayment; tiffin-payment.service.ts; tiffin-renewal.service.ts.', 'TiffinPayment snapshot, subscription entitlement/date/meal generation, invoice and audit.'],
      ['Tiffin customer phone', 'tiffin-provider.service.ts listCustomers/getCustomer; controller/routes; src/api/tiffinProvider.js; TiffinCustomers.jsx/customer detail.', 'User.phone_number, subscription customerId, kitchenId ownership; test provider A/B.'],
      ['Webhook processing', 'payment.routes.ts; payment.controller.ts; payment-webhook.service.ts; razorpay.client.ts.', 'Raw body/signature secret, PaymentWebhookEvent unique key, payment lifecycle and downstream effects.'],
      ['Notifications', 'notification.queue/event-handler/service/dispatcher/repository; src/realtime/notifications.ts; useRealtimeNotifications.ts.', 'Notifications/template/preferences/log/retry tables and Supabase channel/RLS.'],
      ['Database field/relation', 'backend/prisma/schema.prisma + new backend/prisma/migrations SQL + module schema/service/repository/controller + frontend DTO consumer.', 'Backfill, FK action/index, deployed migration, generated Prisma client, compatibility tests.'],
      ['Deployment env', 'wrangler.jsonc; vite.config.js; src/config/api.js; backend/src/server.ts/app.ts; hosting dashboard outside repo.', 'Rebuild frontend for VITE_*; backend cookie/CORS; secret rotation and health/webhook checks.'],
    ]],
  ]},
  { title: 'API Registry', blocks: [
    ['p', 'The table below is generated from current Fastify route declarations. It records method/path/source and registered mount prefix; authentication details remain route-specific (nested hooks). Controller/service are linked in route source. Generic controller business logic is intentionally not inferred from endpoint names.'],
    ['dynamicApi'],
  ]},
  { title: 'Redis Key Registry', blocks: [
    ['p', 'See Phase 11 for full writer/reader/value/expiry/failure notes. This compact registry is generated from actual current key constructors and the password-reset counter code.'],
    ['table', [['Pattern', 205], ['Purpose', 150], ['Expiry / source', CW - 355]], [
      ['session:{id}', 'Student auth session', '30 days; PostgreSQL users remain authoritative'],
      ['user_session:{userId}', 'Student single-session mapping', '30 days; active session pointer'],
      ['provider:session:{id}', 'Provider auth session', '30 days; session JSON'],
      ['provider:user_sessions:{userId}', 'Provider multi-session set', 'Session memberships; member cleanup'],
      ['provider:user_session:{userId}', 'Legacy provider pointer', 'Compatibility key; normal current path uses set'],
      ['provider:dashboard:pg:{providerId}', 'PG dashboard summary cache', '120 sec; PostgreSQL source'],
      ['provider:dashboard:tiffin:{providerId}', 'Tiffin dashboard key helper', 'Call-site usage not verified in this audit'],
      ['password-reset:verify:{email}', 'Reset verification attempt counter', '10 minutes; DB challenge is authority'],
    ]],
  ]},
  { title: 'Environment Variable Registry', blocks: [
    ['p', 'The exact name-to-purpose inventory appears in Phase 28. Values are never included. Build-time VITE variables are embedded in the frontend bundle; backend secrets must remain server-side.'],
    ['code', 'Frontend build-time: VITE_API_URL, VITE_PROVIDER_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAPBOX_TOKEN, VITE_REALTIME_DEBUG\nBackend runtime: DATABASE_URL, DIRECT_URL, REDIS_URL, SESSION_SECRET, SESSION_SAME_SITE, PROVIDER_SESSION_SAME_SITE, RESEND_API_KEY, FRONTEND_URL, PORT, HOST, NODE_ENV, key_id, key_secret, webhook secret, BANK_DETAILS_ENCRYPTION_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_KYC_BUCKET, PAYMENT_MODE\nVite dev: BACKEND_PROXY_URL, VITE_ALLOWED_HOSTS'],
  ]},
  { title: 'Database Dictionary — All Prisma Models and Fields', blocks: [
    ['p', 'Every model below is parsed from backend/prisma/schema.prisma at PDF generation time. Scalar fields show Prisma type, physical column mapping, nullability, defaults and declared attributes. Relation fields identify model navigation properties; index/unique/map declarations are listed beneath each model. This is exhaustive for the schema text but does not claim live database migration parity.'],
    ['dynamicDb'],
  ]},
  { title: 'Glossary', blocks: [
    ['table', [['Term', 140], ['Meaning in this codebase', CW - 140]], [
      ['ProviderProfile', 'User-linked provider onboarding/business identity model; distinct from legacy Provider.'],
      ['RoomListing', 'Current PG/property listing entity used by listing forms, detail, map and fee query.'],
      ['Redis session', 'Server-side JSON session indexed by opaque random ID and authenticated through HttpOnly cookie.'],
      ['Profile setup cookie', 'Encrypted temporary handoff for profile completion; not a protected-route session.'],
      ['PaymentLifecycleState', 'Detailed payment lifecycle enum separate from high-level payment status.'],
      ['TiffinCustomerSubscription', 'Student-to-kitchen/plan relationship and lifecycle record; customerId identifies User.'],
      ['Idempotency key', 'Unique persisted request/gateway identity to prevent duplicate payment resource creation where used.'],
      ['RLS', 'PostgreSQL row-level security; Prisma schema itself does not define RLS policies.'],
      ['PII', 'Personal data such as student phone/email; access should be scoped to current authorized business relationship.'],
    ]],
  ]},
  { title: 'Documentation Verification Report', blocks: [
    ['table', [['Status', 110], ['Verification result', CW - 110]], [
      ['VERIFIED', 'Frontend boot/router/API transport, Fastify composition, auth/session Redis code, route registration, Prisma model/enum declarations, PG/Tiffin payment calculator, webhook event persistence, storage/env references and checked-in deployment config.'],
      ['OUTDATED', 'Supplied reference PDF’s localStorage/header identity, Supabase auth authority, missing backend, no Redis and mock payment claims conflict with current implementation.'],
      ['DEPRECATED / LEGACY', 'Client identity headers remain accepted by API transport/CORS; legacy Provider/PG schemas and provider:user_session mapping coexist with newer models/keys.'],
      ['NOT FOUND', 'Automated application test suite/scripts, Render deploy manifest, checked-in CI workflow, backend container config, explicit production webhook URL, full operator backup/rollback docs.'],
      ['NOT VERIFIED', 'Live production DB migration parity/FKs/RLS, Redis production availability/TTL state, Cloudflare/Render deployment settings, external gateway/email/storage account configuration.'],
      ['ARCHITECTURAL GAP', 'No readiness health checks, durable notification worker, explicit frontend 404 route; cookie CSRF posture requires deployment-aware review.'],
      ['SECURITY GAP', 'Complete RLS/storage policy inventory and CSRF/CSP/HSTS deployment verification remain unresolved from repository evidence.'],
      ['TECHNICAL DEBT', 'No automated test suite; source schema/migrations require CI drift verification; shared legacy/current data models increase change risk.'],
      ['SCOPE COMPLIANCE', 'Only docs/architecture/generate-pdf.js and the user-designated Downloads PDF are modified by this task. Application changes and other documentation are untouched.'],
    ]],
    ['callout', 'Original-developer independence check: a new engineer can locate primary flows, files, models, Redis keys, configuration and safe verification paths from this guide. Live infrastructure credentials, deployment dashboard settings, applied database state and external-account operations remain environment-specific and are explicitly marked NOT VERIFIED rather than guessed.', 'success'],
  ]]},
];

function parsePrismaSchema(source) {
  const models = [];
  const enums = [];
  const names = new Set();
  for (const match of source.matchAll(/\bmodel\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    names.add(match[1]);
    models.push({ name: match[1], body: match[2] });
  }
  for (const match of source.matchAll(/\benum\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) enums.push({ name: match[1], body: match[2] });
  const enumNames = new Set(enums.map((item) => item.name));
  const parsedModels = models.map((model) => {
    const fields = [];
    const indexes = [];
    for (const rawLine of model.body.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue;
      if (line.startsWith('@@')) { indexes.push(line); continue; }
      const field = line.match(/^(\w+)\s+([\w\[\]?]+)(?:\s+(.*))?$/);
      if (!field) continue;
      const [, name, type, attrs = ''] = field;
      const baseType = type.replace(/[\[\]?]/g, '');
      const relation = names.has(baseType) || enumsAsRelation(enumNames, baseType) ? attrs.match(/@relation\((.*)\)/)?.[1] : null;
      const details = [];
      const mapped = attrs.match(/@map\("([^"]+)"\)/);
      if (mapped) details.push(`column ${mapped[1]}`);
      if (type.includes('?')) details.push('nullable');
      if (type.includes('[]')) details.push('list');
      const def = attrs.match(/@default\((.*?)\)(?=\s|$)/);
      if (def) details.push(`default ${def[1]}`);
      if (attrs.includes('@id')) details.push('PK');
      if (attrs.includes('@unique')) details.push('unique');
      if (relation) {
        const cols = relation.match(/fields:\s*\[([^\]]+)\]/)?.[1];
        const refs = relation.match(/references:\s*\[([^\]]+)\]/)?.[1];
        const del = relation.match(/onDelete:\s*(\w+)/)?.[1];
        details.push(`relation ${baseType}${cols ? ` via ${cols.trim()}` : ''}${refs ? ` -> ${refs.trim()}` : ''}${del ? `; onDelete ${del}` : ''}`);
      }
      if (attrs.includes('@updatedAt')) details.push('updatedAt');
      if (attrs.includes('@db.')) details.push(attrs.match(/@db\.\w+(?:\([^)]*\))?/)?.[0] || 'native type');
      fields.push({ name, type, details: details.join('; ') || '—', relation: Boolean(relation) });
    }
    return { ...model, fields, indexes };
  });
  return { models: parsedModels, enums };
}
function enumsAsRelation(enumNames, baseType) { return enumNames.has(baseType); }
function modelNameMap(modelBody) {
  return modelBody.match(/@@map\("([^"]+)"\)/)?.[1] || null;
}
function renderDbAppendix() {
  const src = fs.readFileSync(SCHEMA, 'utf8');
  const { models, enums } = parsePrismaSchema(src);
  subhead(`Prisma schema inventory: ${models.length} models, ${enums.length} enums`);
  for (const m of models) {
    ensure(45);
    const physical = modelNameMap(m.body);
    paragraph(`${m.name}${physical ? `  →  ${physical}` : ''}`, { bold: true, size: 9.2, color: C.navy, after: .15 });
    if (m.indexes.length) paragraph(`Declared constraints/indexes: ${m.indexes.join('  ·  ')}`, { size: 6.7, color: C.muted, after: .2 });
    table([
      { label: 'FIELD', width: 118 }, { label: 'PRISMA TYPE', width: 90 }, { label: 'MAPPING / NULL / DEFAULT / RELATION', width: CW - 208 },
    ], m.fields.map((f) => [f.name, f.type, f.details]), { size: 6.65, headerSize: 6.8, minRowHeight: 15 });
  }
  subhead('Enums and database values');
  for (const e of enums) {
    const values = e.body.split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('//') && !s.startsWith('@@'));
    paragraph(`${e.name}: ${values.join(', ')}`, { size: 7.2, after: .3 });
  }
  callout('Database scope note', 'Prisma scalar field definitions, @relation declarations, and model @@ declarations are directly parsed from schema.prisma. The source generator does not connect to a live database, execute migrations, or prove that every declared FK/index exists in the currently deployed PostgreSQL schema.', 'warning');
}

const routeModules = [
  ['backend/src/modules/auth/auth.routes.ts', ['/api/v1/auth']],
  ['backend/src/modules/users/user.routes.ts', ['/api/v1/users', '/api/v1/user']],
  ['backend/src/modules/student/student.routes.ts', ['/api/v1/student']],
  ['backend/src/modules/provider/provider.routes.ts', ['/api/v1/provider', '/api/provider']],
  ['backend/src/modules/services/service.routes.ts', ['/api/v1/provider/services']],
  ['backend/src/modules/pg/pg.routes.ts', ['/api/v1/pg']],
  ['backend/src/modules/tiffin/tiffin.routes.ts', ['/api/v1/tiffin']],
  ['backend/src/modules/media/media.routes.ts', ['/api/v1/media']],
  ['backend/src/modules/documents/document.routes.ts', ['/api/v1/documents']],
  ['backend/src/modules/bookings/booking.routes.ts', ['/api/v1/bookings']],
  ['backend/src/modules/visits/visit.routes.ts', ['/api/v1/visits']],
  ['backend/src/modules/payments/payment.routes.ts', ['/api/v1/payments']],
  ['backend/src/modules/profile-views/profile-view.routes.ts', ['/api/v1/profile-views']],
  ['backend/src/modules/colleges/college.routes.ts', ['/api/v1/colleges', '/colleges']],
  ['backend/src/modules/saved/saved.routes.ts', ['/api/v1/saved']],
  ['backend/src/modules/notifications/notification.routes.ts', ['/api/v1/notifications']],
  ['backend/src/modules/room-listings/room-listing.routes.ts', ['/api/v1/room-listings', '/api/provider/room-listings']],
];
function extractRoutes() {
  const rows = [];
  for (const [rel, prefixes] of routeModules) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const line of text.split('\n')) {
      const match = line.match(/\b(?:fastify|providerRoutes|protectedRoutes|sharedBookingRoutes|studentRoutes|publicRoutes)\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*(['"])([^'"]+)\2/);
      if (!match) continue;
      const method = match[1].toUpperCase();
      const local = match[3];
      const handler = line.match(/,\s*([\w.]+)\s*\)/)?.[1] || 'see route source';
      for (const prefix of prefixes) {
        if (rel.includes('room-listing.routes') && prefix === '/api/provider/room-listings' && local === '/public') continue;
        rows.push([method, `${prefix}${local === '/' ? '' : local}`, rel, handler]);
      }
    }
  }
  return rows;
}
function renderApiAppendix() {
  const routes = extractRoutes();
  paragraph(`Extracted ${routes.length} route declarations/mount combinations from route modules. Authentication is represented by nested preHandler hooks in each source file; review route-specific scope before relying on this index.`, { size: 7.8 });
  table([
    { label: 'METHOD', width: 48 }, { label: 'MOUNTED PATH', width: 202 }, { label: 'SOURCE FILE', width: 162 }, { label: 'HANDLER', width: CW - 412 },
  ], routes, { size: 6.4, headerSize: 6.3, minRowHeight: 14 });
  callout('Route inventory note', 'The parser reports textual route declarations and configured prefixes; it does not resolve every nested plugin prefix, authentication hook, schema validation, side effect, or runtime-conditional registration. Use the listed source as the canonical contract.', 'info');
}

function renderBlock(block) {
  const [type, a, b, c] = block;
  if (type === 'p') paragraph(a);
  else if (type === 'bullets') a.forEach((x) => bullet(x));
  else if (type === 'numbered') a.forEach((x, i) => bullet(`${i + 1}. ${x}`));
  else if (type === 'code') code(a);
  else if (type === 'callout') callout(a, b, c);
  else if (type === 'sub') subhead(a);
  else if (type === 'table') table(a.map(([label, width]) => ({ label, width })), b, { firstBold: true });
  else if (type === 'dynamicDb') renderDbAppendix();
  else if (type === 'dynamicApi') renderApiAppendix();
}

function renderToc() {
  const tocPage = 1;
  doc.switchToPage(tocPage);
  doc.y = MT;
  doc.font('Helvetica-Bold').fontSize(20).fillColor(C.navy).text('TABLE OF CONTENTS', ML, doc.y, { width: CW });
  doc.moveDown(.25);
  paragraph('Progressive phases follow the supplied reference document: orientation first, deep implementation flows next, and working appendices last.', { size: 8, color: C.muted });
  sectionPage.forEach((item) => {
    ensure(17);
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(7.3).fillColor(C.blue).text(String(item.number).padStart(2, '0'), ML, y, { width: 24 });
    doc.font('Helvetica').fontSize(7.5).fillColor(C.ink).text(item.title, ML + 28, y, { width: CW - 68 });
    doc.font('Helvetica').fontSize(7.3).fillColor(C.muted).text(String(item.page), ML + CW - 28, y, { width: 28, align: 'right' });
    doc.moveTo(ML + 28, y + 11).lineTo(ML + CW - 32, y + 11).dash(1, { space: 2 }).strokeColor(C.line).lineWidth(.4).stroke().undash();
    doc.y = y + 14;
  });
}

function main() {
  fs.accessSync(SCHEMA, fs.constants.R_OK);
  cover();
  addPage();
  chapters.forEach((chapter, index) => {
    addPage();
    chapterTitle(index + 1, chapter.title);
    chapter.blocks.forEach(renderBlock);
  });
  renderToc();
  doc.end();
}

console.log('Building StayVeo current-codebase architecture PDF...');
main();
stream.on('finish', () => {
  const stats = fs.statSync(OUTPUT);
  console.log(`PDF generated: ${OUTPUT}`);
  console.log(`Pages: ${doc.bufferedPageRange().count}; size: ${(stats.size / 1024).toFixed(0)} KB`);
});
