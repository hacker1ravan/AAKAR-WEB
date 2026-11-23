-- Add an admin-editable page background colour to site settings.
ALTER TABLE "SiteSettings" ADD COLUMN "backgroundColor" TEXT NOT NULL DEFAULT '#fdfcfa';
