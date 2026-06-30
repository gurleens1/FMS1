-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_feedback_tracker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parent_ticket_id" INTEGER NOT NULL,
    "assignment_number" INTEGER NOT NULL,
    "feedback_source" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "priority" TEXT NOT NULL,
    "nature" TEXT,
    "assignee_id" INTEGER,
    "secondary_assignee_id" INTEGER,
    "feedbackTitle" TEXT,
    "description" TEXT,
    "flag" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "feedback_registration_date" DATETIME,
    "notes" TEXT,
    "resolved_on" DATETIME,
    "first_response_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "emp_full_name" TEXT,
    "emp_email" TEXT,
    "emp_code" TEXT,
    "emp_joining_date" DATETIME,
    "emp_designation" TEXT,
    "emp_department" TEXT,
    CONSTRAINT "feedback_tracker_parent_ticket_id_fkey" FOREIGN KEY ("parent_ticket_id") REFERENCES "parent_tickets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "feedback_tracker_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "user_roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "feedback_tracker_secondary_assignee_id_fkey" FOREIGN KEY ("secondary_assignee_id") REFERENCES "user_roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_feedback_tracker" ("assignee_id", "assignment_number", "category", "created_at", "description", "emp_code", "emp_department", "emp_designation", "emp_email", "emp_full_name", "emp_joining_date", "feedbackTitle", "feedback_registration_date", "feedback_source", "first_response_at", "flag", "id", "is_anonymous", "nature", "notes", "parent_ticket_id", "priority", "resolved_on", "secondary_assignee_id", "status", "updated_at") SELECT "assignee_id", "assignment_number", "category", "created_at", "description", "emp_code", "emp_department", "emp_designation", "emp_email", "emp_full_name", "emp_joining_date", "feedbackTitle", "feedback_registration_date", "feedback_source", "first_response_at", "flag", "id", "is_anonymous", "nature", "notes", "parent_ticket_id", "priority", "resolved_on", "secondary_assignee_id", "status", "updated_at" FROM "feedback_tracker";
DROP TABLE "feedback_tracker";
ALTER TABLE "new_feedback_tracker" RENAME TO "feedback_tracker";
CREATE UNIQUE INDEX "feedback_tracker_assignment_number_key" ON "feedback_tracker"("assignment_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
