-- CreateTable
CREATE TABLE "employees" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT,
    "designation" TEXT,
    "joining_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "password" TEXT NOT NULL,
    "reset_otp" TEXT,
    "reset_otp_expiry" DATETIME,
    "password_changed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_roles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parent_tickets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "feedback_source" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "parent_tickets_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feedback_tracker" (
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

-- CreateTable
CREATE TABLE "activity_tracker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feedback_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" INTEGER NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_tracker_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback_tracker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "activity_tracker_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "user_roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "call_recordings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parent_ticket_id" INTEGER NOT NULL,
    "recording_id" TEXT NOT NULL,
    "recording_url" TEXT,
    "category" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "recorded_at" DATETIME,
    "extracted_insights" TEXT,
    "transcription" TEXT,
    "processing_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "call_recordings_parent_ticket_id_fkey" FOREIGN KEY ("parent_ticket_id") REFERENCES "parent_tickets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_start" DATETIME,
    "period_end" DATETIME,
    "insight_type" TEXT NOT NULL,
    "insight_text" TEXT NOT NULL,
    "metadata" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_employee_id_key" ON "user_roles"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_email_key" ON "user_roles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "parent_tickets_employee_id_feedback_source_key" ON "parent_tickets"("employee_id", "feedback_source");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_tracker_assignment_number_key" ON "feedback_tracker"("assignment_number");

-- CreateIndex
CREATE UNIQUE INDEX "call_recordings_recording_id_key" ON "call_recordings"("recording_id");
