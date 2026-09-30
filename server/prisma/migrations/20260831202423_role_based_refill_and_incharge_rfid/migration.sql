/*
  Warnings:

  - A unique constraint covering the columns `[rfidTag]` on the table `LabIncharge` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LabIncharge" ADD COLUMN "rfidTag" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RestockLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bottleId" TEXT NOT NULL,
    "studentId" TEXT,
    "labInchargeId" TEXT,
    "amountAdded" REAL NOT NULL,
    "previousQty" REAL NOT NULL,
    "newQty" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RestockLog_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "Bottle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RestockLog_labInchargeId_fkey" FOREIGN KEY ("labInchargeId") REFERENCES "LabIncharge" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RestockLog" ("amountAdded", "bottleId", "createdAt", "id", "newQty", "previousQty", "studentId") SELECT "amountAdded", "bottleId", "createdAt", "id", "newQty", "previousQty", "studentId" FROM "RestockLog";
DROP TABLE "RestockLog";
ALTER TABLE "new_RestockLog" RENAME TO "RestockLog";
CREATE INDEX "RestockLog_bottleId_idx" ON "RestockLog"("bottleId");
CREATE INDEX "RestockLog_createdAt_idx" ON "RestockLog"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LabIncharge_rfidTag_key" ON "LabIncharge"("rfidTag");

-- CreateIndex
CREATE INDEX "LabIncharge_rfidTag_idx" ON "LabIncharge"("rfidTag");
