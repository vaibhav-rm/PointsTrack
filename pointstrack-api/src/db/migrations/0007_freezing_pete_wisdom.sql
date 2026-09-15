ALTER TABLE "events_catalog" DROP CONSTRAINT "events_catalog_club_id_clubs_id_fk";
--> statement-breakpoint
ALTER TABLE "points_ledger" ADD COLUMN "reverses_ledger_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events_catalog" ADD CONSTRAINT "events_catalog_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_reverses_ledger_id_points_ledger_id_fk" FOREIGN KEY ("reverses_ledger_id") REFERENCES "public"."points_ledger"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
