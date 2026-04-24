-- AlterTable: cast existing TEXT data to JSONB in-place (preserves all rows)
ALTER TABLE "Deployment" ALTER COLUMN "abi" TYPE JSONB USING "abi"::JSONB;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "files" TYPE JSONB USING "files"::JSONB;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "deploymentId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_deploymentId_idx" ON "Transaction"("deploymentId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
