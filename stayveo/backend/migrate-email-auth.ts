// One-off migration script: ensure email auth tables/columns exist
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  // 1. Check if email column exists on users
  const userCols: any[] = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name IN ('email', 'password_hash')
  `;
  console.log('users columns found:', userCols.map(r => r.column_name));

  const colNames = userCols.map(r => r.column_name);
  if (!colNames.includes('email')) {
    console.log('Adding email column to users...');
    await prisma.$executeRawUnsafe(`ALTER TABLE public.users ADD COLUMN email VARCHAR(255) UNIQUE`);
    console.log('Done.');
  }
  if (!colNames.includes('password_hash')) {
    console.log('Adding password_hash column to users...');
    await prisma.$executeRawUnsafe(`ALTER TABLE public.users ADD COLUMN password_hash VARCHAR(255)`);
    console.log('Done.');
  }

  // Make phone_number nullable if it isn't already
  const phoneCol: any[] = await prisma.$queryRaw`
    SELECT is_nullable FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone_number'
  `;
  console.log('phone_number nullable:', phoneCol[0]?.is_nullable);
  if (phoneCol[0]?.is_nullable === 'NO') {
    console.log('Making phone_number nullable...');
    await prisma.$executeRawUnsafe(`ALTER TABLE public.users ALTER COLUMN phone_number DROP NOT NULL`);
    console.log('Done.');
  }

  // 2. Check if email_auth_challenges table exists
  const tables: any[] = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_auth_challenges'
  `;
  console.log('email_auth_challenges table exists:', tables.length > 0);

  if (tables.length === 0) {
    console.log('Creating email_auth_challenges table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE public.email_auth_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        role user_role NOT NULL,
        purpose VARCHAR(32) NOT NULL,
        otp_hash VARCHAR(64) NOT NULL,
        password_hash VARCHAR(255),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ(6) NOT NULL,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX idx_eac_email_role_purpose ON public.email_auth_challenges (email, role, purpose)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX idx_eac_expires ON public.email_auth_challenges (expires_at)`);
    console.log('Done.');
  }

  console.log('\n✅ Migration complete!');
}

main()
  .catch(e => { console.error('Migration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
