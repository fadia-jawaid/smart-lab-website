-- Persist the one-click "fix" suggestion on the alert row itself, so the
-- Inventory card's "Confirm & Apply Refill" / "Update Capacity" buttons
-- still show up after a page refresh, not only while the live socket push
-- is still in memory.
ALTER TABLE "Alert" ADD COLUMN "suggestedQty" REAL;
ALTER TABLE "Alert" ADD COLUMN "suggestedCapacity" REAL;
ALTER TABLE "Alert" ADD COLUMN "actualQty" REAL;