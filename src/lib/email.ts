import "server-only";
import { Resend } from "resend";
import type { Post, User } from "./types";

const FROM = process.env.EMAIL_FROM ?? "DWKY Connect <notifications@dwky-connect.org>";
const APP_URL = process.env.APP_URL ?? "https://dwky-connect.org";

function postTypeLabel(type: Post["type"]): string {
  return type;
}

function postEmailHtml(post: Post, authorName: string, recipientName: string): string {
  const preview = post.content.length > 400 ? `${post.content.slice(0, 400)}…` : post.content;
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #151a2d;">
      <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #2f8f5b; margin: 0 0 12px;">
        ${postTypeLabel(post.type)} · Updates & Encouragement
      </p>
      <p style="font-size: 15px; margin: 0 0 16px;">Hi ${recipientName},</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
        <strong>${authorName}</strong> just posted in Updates & Encouragement:
      </p>
      <blockquote style="margin: 0 0 20px; padding: 14px 16px; background: #f7f9fd; border-left: 3px solid #2f8f5b; border-radius: 8px; font-size: 14px; line-height: 1.55; color: #151a2d;">
        ${preview.replace(/\n/g, "<br/>")}
      </blockquote>
      <a href="${APP_URL}/updates" style="display: inline-block; padding: 10px 18px; background: #2f8f5b; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 600;">
        View in DWKY Connect
      </a>
      <p style="font-size: 11px; color: #5f6478; margin: 28px 0 0;">
        You're receiving this because you have an account on the DWKY Connect Sunday School intranet.
      </p>
    </div>
  `;
}

function resetPasswordEmailHtml(recipientName: string, resetUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #151a2d;">
      <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #2f8f5b; margin: 0 0 12px;">
        Password reset
      </p>
      <p style="font-size: 15px; margin: 0 0 16px;">Hi ${recipientName},</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
        We received a request to reset your DWKY Connect password. Click the button below to choose a new one.
        This link works once and expires in 1 hour.
      </p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 18px; background: #2f8f5b; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 600;">
        Reset your password
      </a>
      <p style="font-size: 12px; color: #5f6478; margin: 20px 0 0;">
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
    </div>
  `;
}

export async function sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set — skipping password reset email for user", user.id);
    return;
  }

  const resend = new Resend(apiKey);
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  try {
    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: "Reset your DWKY Connect password",
      html: resetPasswordEmailHtml(user.name.split(" ")[0], resetUrl),
    });
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }
}

export async function sendPostNotificationEmails(post: Post, author: User, recipients: User[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set — skipping email notification for post", post.id);
    return;
  }
  if (recipients.length === 0) return;

  const resend = new Resend(apiKey);
  const subject = `${author.name} posted in Updates & Encouragement`;

  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      resend.emails.send({
        from: FROM,
        to: recipient.email,
        subject,
        html: postEmailHtml(post, author.name, recipient.name.split(" ")[0]),
      })
    )
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to send post notification email:", result.reason);
    }
  }
}
