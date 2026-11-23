import type { NextConfig } from "next";

// Content-Security-Policy, shipped in REPORT-ONLY mode first: the browser never blocks anything,
// it only logs violations to the console. This lets us confirm Razorpay checkout, Google Analytics
// and Cloudinary all pass before switching to an enforcing policy. To enforce later, change the
// header key below to "Content-Security-Policy" (keep the value).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next.js hydration + the inline Google Analytics bootstrap need inline scripts; Razorpay may use eval.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.razorpay.com https://lumberjack.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "frame-src https://*.razorpay.com https://api.razorpay.com",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  // pdfkit reads its font files from disk, so it must not be bundled
  serverExternalPackages: ["pdfkit"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
