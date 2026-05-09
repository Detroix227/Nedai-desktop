-- AlterEnum: Add OTHER to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OTHER';
