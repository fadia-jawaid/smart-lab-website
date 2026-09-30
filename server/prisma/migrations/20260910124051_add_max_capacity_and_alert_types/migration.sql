-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bottle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rfidTag" TEXT NOT NULL,
    "chemicalName" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "initialQty" REAL NOT NULL,
    "maxCapacity" REAL NOT NULL DEFAULT 92,
    "currentQty" REAL NOT NULL,
    "lowStockPct" INTEGER NOT NULL DEFAULT 20,
    "location" TEXT,
    "supplier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bottle" ("chemicalName", "createdAt", "currentQty", "description", "id", "initialQty", "isActive", "location", "lowStockPct", "rfidTag", "supplier", "unit", "updatedAt") SELECT "chemicalName", "createdAt", "currentQty", "description", "id", "initialQty", "isActive", "location", "lowStockPct", "rfidTag", "supplier", "unit", "updatedAt" FROM "Bottle";
DROP TABLE "Bottle";
ALTER TABLE "new_Bottle" RENAME TO "Bottle";
CREATE UNIQUE INDEX "Bottle_rfidTag_key" ON "Bottle"("rfidTag");
CREATE INDEX "Bottle_rfidTag_idx" ON "Bottle"("rfidTag");
CREATE INDEX "Bottle_isActive_idx" ON "Bottle"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
