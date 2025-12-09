-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallet_address" TEXT NOT NULL,
    "twitter_handle" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "twitter_id" TEXT NOT NULL,
    "twitter_handle" TEXT NOT NULL,
    "follower_count" INTEGER,
    "engagement_rate" DECIMAL,
    "qualified_at" DATETIME,
    "stake_paid" BOOLEAN NOT NULL DEFAULT false,
    "stake_returned" BOOLEAN NOT NULL DEFAULT false,
    "total_market_volume" DECIMAL NOT NULL DEFAULT 0,
    "shares_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "shares_unlocked_at" DATETIME,
    "contract_address" TEXT,
    "total_shares" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Creator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreatorShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creator_id" TEXT NOT NULL,
    "contract_address" TEXT NOT NULL,
    "total_supply" INTEGER NOT NULL DEFAULT 0,
    "current_price" DECIMAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "CreatorShare_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShareTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "share_id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "total_cost" DECIMAL NOT NULL,
    "fee_amount" DECIMAL NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "block_number" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShareTransaction_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "CreatorShare" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpinionMarket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creator_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "condition_id" TEXT,
    "question" TEXT NOT NULL,
    "contract_address" TEXT,
    "volume" DECIMAL NOT NULL DEFAULT 0,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "outcome" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "OpinionMarket_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketOutcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "market_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "probability" DECIMAL NOT NULL DEFAULT 0.5,
    "current_price" DECIMAL NOT NULL DEFAULT 0.5,
    CONSTRAINT "MarketOutcome_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "OpinionMarket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "market_id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "outcome_index" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "avg_price" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "MarketPosition_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "OpinionMarket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreatorVolumeTracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creator_id" TEXT NOT NULL,
    "volume" DECIMAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorVolumeTracking_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_address_key" ON "User"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_user_id_key" ON "Creator"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_twitter_id_key" ON "Creator"("twitter_id");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorShare_creator_id_key" ON "CreatorShare"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorShare_contract_address_key" ON "CreatorShare"("contract_address");

-- CreateIndex
CREATE UNIQUE INDEX "OpinionMarket_question_id_key" ON "OpinionMarket"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "OpinionMarket_condition_id_key" ON "OpinionMarket"("condition_id");
