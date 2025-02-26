/*
  Warnings:

  - Added the required column `prompt` to the `OutputImages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OutputImages" ADD COLUMN     "prompt" TEXT NOT NULL,
ADD COLUMN     "status" "OutputImageStatusEnum" NOT NULL DEFAULT 'Pending';
