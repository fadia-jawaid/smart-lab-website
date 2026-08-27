-- CreateEnum
CREATE TYPE "Lab" AS ENUM ('LAB_A', 'LAB_B');

-- AlterTable
ALTER TABLE "LabIncharge" ADD COLUMN     "lab" "Lab";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "lab" "Lab";

-- CreateIndex
CREATE INDEX "Transaction_lab_idx" ON "Transaction"("lab");
