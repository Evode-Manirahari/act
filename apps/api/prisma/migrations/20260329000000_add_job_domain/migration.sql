-- CreateEnum
CREATE TYPE "JobDomain" AS ENUM ('PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'HVAC', 'PAINTING', 'TILING', 'GENERAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "domain" "JobDomain";
