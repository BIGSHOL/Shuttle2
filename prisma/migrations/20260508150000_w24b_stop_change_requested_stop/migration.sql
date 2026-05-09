-- AlterTable
ALTER TABLE "StopChangeRequest" ADD COLUMN     "requestedStopId" TEXT;

-- AddForeignKey
ALTER TABLE "StopChangeRequest" ADD CONSTRAINT "StopChangeRequest_requestedStopId_fkey" FOREIGN KEY ("requestedStopId") REFERENCES "Stop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
