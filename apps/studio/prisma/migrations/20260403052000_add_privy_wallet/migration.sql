-- CreateTable
CREATE TABLE "PrivyWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivyWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivyWallet_userId_key" ON "PrivyWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivyWallet_walletId_key" ON "PrivyWallet"("walletId");

-- CreateIndex
CREATE INDEX "PrivyWallet_userId_idx" ON "PrivyWallet"("userId");
