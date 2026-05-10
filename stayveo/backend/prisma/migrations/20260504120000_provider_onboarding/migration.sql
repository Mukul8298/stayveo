-- CreateEnum
CREATE TYPE "provider_service_type" AS ENUM ('PG', 'TIFFIN', 'LAUNDRY', 'CLEANING');

-- CreateTable
CREATE TABLE "provider_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "type" "provider_service_type" NOT NULL,

    CONSTRAINT "provider_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pg_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "pg_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "room_type" TEXT NOT NULL,
    "min_price" DOUBLE PRECISION NOT NULL,
    "amenities" TEXT[],
    "photos" TEXT[],

    CONSTRAINT "pg_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiffin_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "meals_per_day" INTEGER NOT NULL,
    "photos" TEXT[],

    CONSTRAINT "tiffin_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laundry_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "pricing" TEXT NOT NULL,
    "photos" TEXT[],

    CONSTRAINT "laundry_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "pricing" TEXT NOT NULL,
    "photos" TEXT[],

    CONSTRAINT "cleaning_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "id_type" TEXT NOT NULL,
    "id_number" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "provider_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_profiles_user_id_key" ON "provider_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_profiles_phone_key" ON "provider_profiles"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "provider_services_provider_id_type_key" ON "provider_services"("provider_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "pg_details_service_id_key" ON "pg_details"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "tiffin_details_service_id_key" ON "tiffin_details"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "laundry_details_service_id_key" ON "laundry_details"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "cleaning_details_service_id_key" ON "cleaning_details"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_verifications_provider_id_id_type_key" ON "provider_verifications"("provider_id", "id_type");

-- AddForeignKey
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pg_details" ADD CONSTRAINT "pg_details_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "provider_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiffin_details" ADD CONSTRAINT "tiffin_details_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "provider_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laundry_details" ADD CONSTRAINT "laundry_details_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "provider_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_details" ADD CONSTRAINT "cleaning_details_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "provider_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_verifications" ADD CONSTRAINT "provider_verifications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
