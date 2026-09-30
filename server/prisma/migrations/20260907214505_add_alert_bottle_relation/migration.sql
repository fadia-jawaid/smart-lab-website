-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "studentId" TEXT,
    "bottleId" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "Admin" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Alert_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "Bottle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Alert" ("bottleId", "createdAt", "id", "isResolved", "message", "resolvedAt", "resolvedBy", "severity", "studentId", "type") SELECT "bottleId", "createdAt", "id", "isResolved", "message", "resolvedAt", "resolvedBy", "severity", "studentId", "type" FROM "Alert";
DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";
CREATE INDEX "Alert_isResolved_idx" ON "Alert"("isResolved");
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");
CREATE INDEX "Alert_type_idx" ON "Alert"("type");
CREATE INDEX "Alert_bottleId_idx" ON "Alert"("bottleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
