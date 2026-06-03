-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CategorySetting" (
    "category" TEXT NOT NULL PRIMARY KEY,
    "maxSlots" INTEGER NOT NULL DEFAULT 16,
    "groupCount" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_CategorySetting" ("category", "maxSlots") SELECT "category", "maxSlots" FROM "CategorySetting";
DROP TABLE "CategorySetting";
ALTER TABLE "new_CategorySetting" RENAME TO "CategorySetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
