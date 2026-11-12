// Product photos are stored on Cloudinary. These helpers ask Cloudinary for a smaller, optimised copy
// (right size, modern format) so pages load fast on phones. Other image links are left unchanged.
const isCld = (u: string) => /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(u);

export function cld(url: string, width: number) {
  return isCld(url) ? url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`) : url;
}

export function cldSet(url: string, widths: number[]) {
  return isCld(url) ? widths.map((w) => `${cld(url, w)} ${w}w`).join(", ") : undefined;
}
