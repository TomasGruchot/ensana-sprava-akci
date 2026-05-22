-- CreateTable
CREATE TABLE "EventRoom" (
    "eventId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "EventRoom_pkey" PRIMARY KEY ("eventId","roomId")
);

-- Migrate existing single-room links
INSERT INTO "EventRoom" ("eventId", "roomId")
SELECT "id", "roomId" FROM "Event";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_roomId_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "roomId";

-- AddForeignKey
ALTER TABLE "EventRoom" ADD CONSTRAINT "EventRoom_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRoom" ADD CONSTRAINT "EventRoom_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
