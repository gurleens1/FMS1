-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feedback_ticket_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_data" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by_role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_attachments_feedback_ticket_id_fkey" FOREIGN KEY ("feedback_ticket_id") REFERENCES "feedback_tracker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
