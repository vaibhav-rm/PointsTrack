ALTER TABLE "organizers" ADD COLUMN "links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "organizers" ADD COLUMN "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "organizers" ADD COLUMN "announcement" text;--> statement-breakpoint
ALTER TABLE "organizers" ADD COLUMN "announcement_link" text;--> statement-breakpoint
ALTER TABLE "organizers" ADD COLUMN "cover_style" text;--> statement-breakpoint
ALTER TABLE "organizers" ADD COLUMN "secondary_color" text;--> statement-breakpoint
ALTER TABLE "organizers" ADD COLUMN "hidden_sections" jsonb DEFAULT '[]'::jsonb NOT NULL;