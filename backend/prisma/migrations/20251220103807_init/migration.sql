-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "twitter_handle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "twitter_handle" TEXT NOT NULL,
    "twitter_id" TEXT,
    "display_name" TEXT,
    "profile_image" TEXT,
    "follower_count" INTEGER,
    "engagement_rate" DECIMAL(65,30),
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "qualified_at" TIMESTAMP(3),
    "stake_paid" BOOLEAN NOT NULL DEFAULT false,
    "stake_returned" BOOLEAN NOT NULL DEFAULT false,
    "total_market_volume" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "shares_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "shares_unlocked_at" TIMESTAMP(3),
    "contract_address" TEXT,
    "total_shares" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "twitter_access_token" TEXT,
    "twitter_refresh_token" TEXT,
    "twitter_user_id" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorShare" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "contract_address" TEXT NOT NULL,
    "total_supply" INTEGER NOT NULL DEFAULT 0,
    "current_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareTransaction" (
    "id" TEXT NOT NULL,
    "share_id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "total_cost" DECIMAL(65,30) NOT NULL,
    "fee_amount" DECIMAL(65,30) NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "block_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpinionMarket" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "condition_id" TEXT,
    "question" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "image_url" TEXT,
    "contract_address" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "initial_liquidity" DECIMAL(65,30) NOT NULL,
    "creation_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "volume" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "outcome" INTEGER,
    "approval_status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpinionMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketOutcome" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "probability" DECIMAL(65,30) NOT NULL DEFAULT 0.5,
    "current_price" DECIMAL(65,30) NOT NULL DEFAULT 0.5,

    CONSTRAINT "MarketOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPosition" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "outcome_index" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "avg_price" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorVolumeTracking" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "volume" DECIMAL(65,30) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorVolumeTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BTCMarket" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "contract_address" TEXT,
    "interval" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "start_price" DECIMAL(18,8) NOT NULL,
    "end_price" DECIMAL(18,8),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "outcome" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BTCMarket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_address_key" ON "User"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_user_id_key" ON "Creator"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_twitter_handle_key" ON "Creator"("twitter_handle");

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

-- CreateIndex
CREATE UNIQUE INDEX "BTCMarket_market_id_key" ON "BTCMarket"("market_id");

-- CreateIndex
CREATE INDEX "BTCMarket_interval_idx" ON "BTCMarket"("interval");

-- CreateIndex
CREATE INDEX "BTCMarket_start_time_idx" ON "BTCMarket"("start_time");

-- CreateIndex
CREATE INDEX "BTCMarket_resolved_idx" ON "BTCMarket"("resolved");

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorShare" ADD CONSTRAINT "CreatorShare_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareTransaction" ADD CONSTRAINT "ShareTransaction_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "CreatorShare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpinionMarket" ADD CONSTRAINT "OpinionMarket_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketOutcome" ADD CONSTRAINT "MarketOutcome_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "OpinionMarket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketPosition" ADD CONSTRAINT "MarketPosition_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "OpinionMarket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorVolumeTracking" ADD CONSTRAINT "CreatorVolumeTracking_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
