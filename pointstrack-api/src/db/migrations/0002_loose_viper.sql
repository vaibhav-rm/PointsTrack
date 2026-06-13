ALTER TABLE "points_ledger" ADD COLUMN "attendee_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendees_event_student_unique" ON "attendees" USING btree ("event_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "points_ledger_attendee_unique" ON "points_ledger" USING btree ("attendee_id");