-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "paidById" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "nativeAmountCents" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amountCents", "createdAt", "description", "groupId", "id", "paidById") SELECT "amountCents", "createdAt", "description", "groupId", "id", "paidById" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";

-- Backfill (phase 07): every expense entered before multi-currency was USD,
-- so its native amount equals the stored USD amount.
UPDATE "Expense" SET "nativeAmountCents" = "amountCents";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
