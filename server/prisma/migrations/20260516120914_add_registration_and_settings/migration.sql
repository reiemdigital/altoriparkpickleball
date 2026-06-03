-- CreateTable
CREATE TABLE "CategorySetting" (
    "category" TEXT NOT NULL PRIMARY KEY,
    "maxSlots" INTEGER NOT NULL DEFAULT 16
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Open Doubles(Coed)',
    "contactNo" TEXT,
    "address" TEXT,
    "email" TEXT,
    "pointsFor" INTEGER NOT NULL DEFAULT 0,
    "pointsAgainst" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "groupId" TEXT
);
INSERT INTO "new_Team" ("groupId", "id", "matchesPlayed", "name", "pointsAgainst", "pointsFor", "wins") SELECT "groupId", "id", "matchesPlayed", "name", "pointsAgainst", "pointsFor", "wins" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
