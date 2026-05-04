-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('student', 'provider');

-- CreateEnum
CREATE TYPE "gender_type" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "food_pref" AS ENUM ('veg', 'nonveg', 'jain', 'vegan', 'no_preference');

-- CreateEnum
CREATE TYPE "lifestyle_type" AS ENUM ('early_bird', 'night_owl', 'flexible');

-- CreateEnum
CREATE TYPE "study_habit" AS ENUM ('quiet', 'flexible', 'normal');

-- CreateEnum
CREATE TYPE "social_level" AS ENUM ('introvert', 'extrovert', 'ambivert');

-- CreateEnum
CREATE TYPE "service_category" AS ENUM ('pg', 'tiffin', 'laundry', 'cleaning');

-- CreateEnum
CREATE TYPE "food_type" AS ENUM ('veg', 'nonveg', 'jain', 'vegan');

-- CreateEnum
CREATE TYPE "pricing_model" AS ENUM ('per_kg', 'per_item');

-- CreateEnum
CREATE TYPE "clean_type" AS ENUM ('basic', 'deep_clean');

-- CreateEnum
CREATE TYPE "doc_type" AS ENUM ('id_proof', 'business_proof');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" VARCHAR(15) NOT NULL,
    "role" "user_role" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "college" TEXT NOT NULL,
    "year" INTEGER,
    "gender" "gender_type",
    "food_preference" "food_pref",
    "lifestyle" "lifestyle_type",
    "cleanliness_level" INTEGER,
    "study_habits" "study_habit",
    "personality_type" "social_level",
    "location_preference" TEXT,
    "budget" TEXT,
    "profile_image_url" TEXT,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "phone_number" VARCHAR(15) NOT NULL,
    "location" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "service_radius_km" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "service_type" "service_category" NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pg_rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "pg_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "room_types" JSONB,
    "min_price" DECIMAL(10,2),
    "max_price" DECIMAL(10,2),
    "amenities" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pg_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiffin_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "kitchen_name" TEXT NOT NULL,
    "food_type" "food_type",
    "meal_options" JSONB,
    "monthly_price" DECIMAL(10,2),
    "delivery_range_km" DECIMAL(5,2),
    "delivery_timing" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tiffin_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laundry_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "pricing_model" "pricing_model",
    "price" DECIMAL(10,2),
    "pickup_frequency" TEXT,
    "delivery_time" TEXT,
    "service_radius_km" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laundry_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "service_type" "clean_type",
    "basic_price" DECIMAL(10,2),
    "deep_clean_price" DECIMAL(10,2),
    "staff_available" INTEGER,
    "available_slots" JSONB,
    "service_radius_km" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaning_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_uploads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "service_type" "service_category" NOT NULL,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "doc_type" "doc_type" NOT NULL,
    "file_url" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "providers_user_id_key" ON "providers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_provider_id_service_type_key" ON "services"("provider_id", "service_type");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
