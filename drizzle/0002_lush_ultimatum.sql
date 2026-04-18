ALTER TABLE "staff" DROP CONSTRAINT "staff_username_unique";--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_email_unique" UNIQUE("email");