-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT,
    "bottleId" TEXT,
    "labInchargeId" TEXT NOT NULL,
    "initialWeight" REAL NOT NULL,
    "finalWeight" REAL,
    "quantityUsed" REAL,
    "timeTaken" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeReturned" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "purpose" TEXT,
    "lab" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "Bottle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_labInchargeId_fkey" FOREIGN KEY ("labInchargeId") REFERENCES "LabIncharge" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("bottleId", "createdAt", "finalWeight", "id", "initialWeight", "lab", "labInchargeId", "notes", "purpose", "quantityUsed", "status", "studentId", "timeReturned", "timeTaken", "updatedAt") SELECT "bottleId", "createdAt", "finalWeight", "id", "initialWeight", "lab", "labInchargeId", "notes", "purpose", "quantityUsed", "status", "studentId", "timeReturned", "timeTaken", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_studentId_idx" ON "Transaction"("studentId");
CREATE INDEX "Transaction_bottleId_idx" ON "Transaction"("bottleId");
CREATE INDEX "Transaction_labInchargeId_idx" ON "Transaction"("labInchargeId");
CREATE INDEX "Transaction_timeTaken_idx" ON "Transaction"("timeTaken");
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX "Transaction_lab_idx" ON "Transaction"("lab");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
