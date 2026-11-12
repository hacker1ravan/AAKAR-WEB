import nodemailer from "nodemailer";
import { getSettings } from "./settings";
import { cld } from "./img";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_PORT === "465",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export async function sendMail(
  to: string,
  subject: string,
  lines: string[],
  button?: { text: string; url: string },
  attachments?: { filename: string; content: Buffer; contentType: string }[]
) {
  try {
    if (!to) return;
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
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #eee">
        ${s.logoUrl
          ? `<div style="padding:16px;border-bottom:1px solid #eee"><img src="${esc(cld(s.logoUrl, 400))}" alt="${esc(s.siteName)}" height="36" style="display:block;height:36px;width:auto"></div>`
          : `<div style="background:${s.primaryColor};color:${s.secondaryColor};padding:16px;font-size:18px">${esc(s.siteName)}</div>`}
        <div style="padding:16px;line-height:1.6">
          ${lines.map((l) => `<p>${esc(l)}</p>`).join("")}
          ${button ? `<p><a href="${esc(button.url)}" style="background:${s.primaryColor};color:${s.secondaryColor};padding:10px 16px;text-decoration:none;border-radius:4px">${esc(button.text)}</a></p>` : ""}
        </div>
      </div>`;
    await transporter.sendMail({ from: `"${s.siteName.replace(/["\r\n]/g, "")}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`, to, subject, html, attachments });
  } catch (e) {
    console.error("Mail failed", e); // never break the order flow because of email
  }
}
