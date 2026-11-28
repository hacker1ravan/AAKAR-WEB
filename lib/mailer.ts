import nodemailer from "nodemailer";
import { getSettings } from "./settings";
import { cld } from "./img";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_PORT === "465",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

type Button = { text: string; url: string };
type Settings = Awaited<ReturnType<typeof getSettings>>;

// Extra, optional styling/content for richer transactional emails (order summaries etc.).
// Everything here is presentational — it never changes when or why an email is sent.
export type MailOpts = {
  heading?: string; // large title under the header bar
  badge?: string; // small status pill (e.g. "Payment received")
  accent?: string; // pill / divider colour (hex); falls back to the brand accent
  preheader?: string; // inbox preview text (hidden in the body)
  bodyHtml?: string; // trusted, pre-escaped HTML inserted after the intro lines
};

// A single, modern, responsive email layout used by every message the store sends.
// Table-based with inline styles so it renders consistently across mail clients.
export function renderEmail(
  s: Settings,
  subject: string,
  lines: string[],
  button?: Button,
  opts: MailOpts = {}
) {
  const brand = esc(s.primaryColor || "#111111");
  const onBrand = esc(s.secondaryColor || "#ffffff");
  const accent = esc(opts.accent || s.accentColor || "#e11d48");
  const siteName = esc(s.siteName || "Our Store");
  const siteUrl = /^https?:\/\//.test(s.siteUrl) ? esc(s.siteUrl) : "";
  const preheader = esc(opts.preheader || lines.find(Boolean) || subject);

  const header = s.logoUrl
    ? `<img src="${esc(cld(s.logoUrl, 400))}" alt="${siteName}" height="40" style="display:block;height:40px;width:auto;border:0;outline:none">`
    : `<span style="font-size:20px;font-weight:700;letter-spacing:.5px;color:${onBrand};text-decoration:none">${siteName}</span>`;

  const heading = opts.heading
    ? `<h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;color:#1c1917;font-weight:700">${esc(opts.heading)}</h1>`
    : "";

  const badge = opts.badge
    ? `<span style="display:inline-block;margin:0 0 14px;padding:5px 12px;border-radius:999px;background:${accent};color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase">${esc(opts.badge)}</span><br>`
    : "";

  const intro = lines
    .filter(Boolean)
    .map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#44403c">${esc(l)}</p>`)
    .join("");

  const body = opts.bodyHtml || "";

  // Only link out to real web URLs; ignore anything else (e.g. javascript:/data:) defensively.
  const btnUrl = button && /^https?:\/\//i.test(button.url) ? button.url : "";
  const btn = button && btnUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px">
         <tr><td style="border-radius:8px;background:${brand}">
           <a href="${esc(btnUrl)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:${onBrand};text-decoration:none;border-radius:8px">${esc(button.text)}</a>
         </td></tr>
       </table>`
    : "";

  const social = [
    s.instagramUrl && /^https?:\/\//.test(s.instagramUrl) ? `<a href="${esc(s.instagramUrl)}" style="color:#78716c;text-decoration:underline">Instagram</a>` : "",
    s.facebookUrl && /^https?:\/\//.test(s.facebookUrl) ? `<a href="${esc(s.facebookUrl)}" style="color:#78716c;text-decoration:underline">Facebook</a>` : "",
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");

  const contactBits = [
    s.contactEmail ? esc(s.contactEmail) : "",
    s.contactPhone ? esc(s.contactPhone) : "",
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title>
<style>
  body{margin:0;padding:0;background:#f4f3f1;-webkit-text-size-adjust:100%}
  img{border:0;line-height:100%;outline:none;text-decoration:none}
  a{color:inherit}
  .wrap{width:100%;background:#f4f3f1}
  .card{width:600px;max-width:600px}
  @media only screen and (max-width:620px){
    .card{width:100% !important}
    .px{padding-left:20px !important;padding-right:20px !important}
    .hide-sm{display:none !important}
  }
</style>
</head>
<body>
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f3f1">${preheader}</span>
<table role="presentation" class="wrap" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" class="card" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #ebe7e1">
    <tr><td style="background:${brand};padding:22px 32px" class="px" align="left">
      ${siteUrl ? `<a href="${siteUrl}" style="text-decoration:none">${header}</a>` : header}
    </td></tr>
    <tr><td class="px" style="padding:30px 32px 10px">
      ${badge}${heading}${intro}
    </td></tr>
    ${body ? `<tr><td class="px" style="padding:4px 32px 0">${body}</td></tr>` : ""}
    ${btn ? `<tr><td class="px" style="padding:0 32px 10px">${btn}</td></tr>` : ""}
    <tr><td class="px" style="padding:22px 32px 30px">
      <div style="height:1px;background:#ebe7e1;margin:0 0 18px"></div>
      <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#78716c">
        ${siteUrl ? `<a href="${siteUrl}" style="color:#44403c;font-weight:600;text-decoration:none">${siteName}</a>` : `<strong style="color:#44403c">${siteName}</strong>`}
        ${s.tagline ? ` — ${esc(s.tagline)}` : ""}
      </p>
      ${contactBits ? `<p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#a8a29e">${contactBits}</p>` : ""}
      ${s.address ? `<p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#a8a29e">${esc(s.address)}</p>` : ""}
      ${social ? `<p style="margin:8px 0 0;font-size:12px;color:#a8a29e">${social}</p>` : ""}
      <p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#c4bfb8">You are receiving this email because you placed an order or created an account with us.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

export async function sendMail(
  to: string,
  subject: string,
  lines: string[],
  button?: Button,
  attachments?: { filename: string; content: Buffer; contentType: string }[],
  opts: MailOpts = {}
) {
  try {
    if (!to) return;
    // Never let a stray CR/LF in the subject (e.g. from an admin-set site name) fold into mail headers.
    subject = subject.replace(/[\r\n]+/g, " ").trim();
    // Automated tests: write the email to a file instead of sending it
    if (process.env.E2E_MAIL_LOG) {
      const { appendFileSync } = await import("fs");
      appendFileSync(
        process.env.E2E_MAIL_LOG,
        `\n[email not sent: test mode]\nTo: ${to}\nSubject: ${subject}\n${lines.join("\n")}${button ? `\n${button.text}: ${button.url}` : ""}${attachments?.length ? `\n[attachments: ${attachments.map((a) => `${a.filename} (${a.content.length} bytes)`).join(", ")}]` : ""}\n`
      );
      return;
    }
    // No email account set up yet (normal while developing): show the email in the terminal instead.
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log(`\n[email not sent: SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n${lines.join("\n")}${button ? `\n${button.text}: ${button.url}` : ""}${attachments?.length ? `\n[attachments: ${attachments.map((a) => `${a.filename} (${a.content.length} bytes)`).join(", ")}]` : ""}\n`);
      return;
    }
    const s = await getSettings();
    const html = renderEmail(s, subject, lines, button, opts);
    await transporter.sendMail({ from: `"${s.siteName.replace(/["\r\n]/g, "")}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`, to, subject, html, attachments });
  } catch (e) {
    console.error("Mail failed", e); // never break the order flow because of email
  }
}

// Sends an email whose HTML body is already rendered elsewhere (e.g. a react-email
// template). Shares the same transport, test-mode/no-SMTP fallbacks and never-throw
// guarantee as sendMail — `textLines` is only used for the terminal/test previews.
export async function sendRenderedMail(
  to: string,
  subject: string,
  html: string,
  opts: {
    attachments?: { filename: string; content: Buffer; contentType: string }[];
    textLines?: string[];
  } = {}
) {
  const { attachments, textLines = [] } = opts;
  try {
    if (!to) return;
    subject = subject.replace(/[\r\n]+/g, " ").trim();
    const preview = () =>
      `To: ${to}\nSubject: ${subject}\n${textLines.join("\n")}${attachments?.length ? `\n[attachments: ${attachments.map((a) => `${a.filename} (${a.content.length} bytes)`).join(", ")}]` : ""}`;
    if (process.env.E2E_MAIL_LOG) {
      const { appendFileSync } = await import("fs");
      appendFileSync(process.env.E2E_MAIL_LOG, `\n[email not sent: test mode]\n${preview()}\n`);
      return;
    }
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log(`\n[email not sent: SMTP not configured]\n${preview()}\n`);
      return;
    }
    const s = await getSettings();
    await transporter.sendMail({
      from: `"${s.siteName.replace(/["\r\n]/g, "")}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
  } catch (e) {
    console.error("Mail failed", e); // never break the order flow because of email
  }
}
