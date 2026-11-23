-- Add an admin-editable card/panel surface colour to site settings.
ALTER TABLE "SiteSettings" ADD COLUMN "surfaceColor" TEXT NOT NULL DEFAULT '#ffffff';
