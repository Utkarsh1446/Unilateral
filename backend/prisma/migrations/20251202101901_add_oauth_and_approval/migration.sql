/*
  Warnings:

  - You are about to drop the column `twitter_id` on the `Creator` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OpinionMarket" ADD COLUMN "category" TEXT;
ALTER TABLE "OpinionMarket" ADD COLUMN "deadline" DATETIME;
ALTER TABLE "OpinionMarket" ADD COLUMN "description" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Creator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "twitter_handle" TEXT NOT NULL,
    "follower_count" INTEGER,
    "engagement_rate" DECIMAL,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "qualified_at" DATETIME,
    "stake_paid" BOOLEAN NOT NULL DEFAULT false,
    "stake_returned" BOOLEAN NOT NULL DEFAULT false,
    "total_market_volume" DECIMAL NOT NULL DEFAULT 0,
    "shares_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "shares_unlocked_at" DATETIME,
    "contract_address" TEXT,
    "total_shares" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "twitter_access_token" TEXT,
    "twitter_refresh_token" TEXT,
    "twitter_user_id" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Creator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Creator" ("contract_address", "created_at", "engagement_rate", "follower_count", "id", "qualified_at", "shares_unlocked", "shares_unlocked_at", "stake_paid", "stake_returned", "status", "total_market_volume", "total_shares", "twitter_handle", "updated_at", "user_id") SELECT "contract_address", "created_at", "engagement_rate", "follower_count", "id", "qualified_at", "shares_unlocked", "shares_unlocked_at", "stake_paid", "stake_returned", "status", "total_market_volume", "total_shares", "twitter_handle", "updated_at", "user_id" FROM "Creator";
DROP TABLE "Creator";
ALTER TABLE "new_Creator" RENAME TO "Creator";
CREATE UNIQUE INDEX "Creator_user_id_key" ON "Creator"("user_id");
CREATE UNIQUE INDEX "Creator_twitter_handle_key" ON "Creator"("twitter_handle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
