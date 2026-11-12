import cloudinary from "@/lib/cloudinary";
import { adminRoute, ok, fail } from "@/lib/api";

export const POST = adminRoute(async (req) => {
  const file = (await req.formData()).get("file") as File | null;
  if (!file || !file.type.startsWith("image/")) return fail("Image required");
  if (file.size > 5 * 1024 * 1024) return fail("Max 5MB");

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await new Promise<string>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        // very large originals are scaled down on upload (the shop serves smaller copies anyway)
        { folder: "clothing-store", transformation: [{ width: 2000, height: 2000, crop: "limit" }] },
        (err, result) =>
        err || !result ? reject(err) : resolve(result.secure_url)
      )
      .end(buffer);
  });
  return ok({ url });
});
