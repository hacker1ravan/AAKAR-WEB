-- Add admin-editable text and border colours to site settings.
ALTER TABLE "SiteSettings" ADD COLUMN "textColor" TEXT NOT NULL DEFAULT '#1c1917';
ALTER TABLE "SiteSettings" ADD COLUMN "borderColor" TEXT NOT NULL DEFAULT '#ebe7e1';
