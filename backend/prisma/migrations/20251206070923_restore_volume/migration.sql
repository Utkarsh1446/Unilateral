/*
  Warnings:

  - You are about to drop the column `contract_address` on the `OpinionMarket` table. All the data in the column will be lost.
  - Added the required column `initial_liquidity` to the `OpinionMarket` table without a default value. This is not possible if the table is not empty.
  - Made the column `category` on table `OpinionMarket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deadline` on table `OpinionMarket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `description` on table `OpinionMarket` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OpinionMarket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creator_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "condition_id" TEXT,
    "question" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "image_url" TEXT,
    "deadline" DATETIME NOT NULL,
    "initial_liquidity" DECIMAL NOT NULL,
    "creation_fee" DECIMAL NOT NULL DEFAULT 0,
    "volume" DECIMAL NOT NULL DEFAULT 0,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "outcome" INTEGER,
    "approval_status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "OpinionMarket_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OpinionMarket" ("category", "condition_id", "created_at", "creator_id", "deadline", "description", "id", "outcome", "question", "question_id", "resolved", "updated_at", "volume") SELECT "category", "condition_id", "created_at", "creator_id", "deadline", "description", "id", "outcome", "question", "question_id", "resolved", "updated_at", "volume" FROM "OpinionMarket";
DROP TABLE "OpinionMarket";
ALTER TABLE "new_OpinionMarket" RENAME TO "OpinionMarket";
CREATE UNIQUE INDEX "OpinionMarket_question_id_key" ON "OpinionMarket"("question_id");
CREATE UNIQUE INDEX "OpinionMarket_condition_id_key" ON "OpinionMarket"("condition_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
