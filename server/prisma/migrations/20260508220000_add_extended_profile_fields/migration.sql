-- AlterTable: add extended profile fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "age" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "maritalStatus" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "academicLevel" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "institutionalLevel" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "futureCareer" TEXT;
