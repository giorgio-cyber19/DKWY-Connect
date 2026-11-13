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

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function welcomeEmailHtml(user: User, tempPassword: string): string {
  const first = escapeHtml(user.name.split(" ")[0]);
  const email = escapeHtml(user.email);
  const username = user.username ? escapeHtml(user.username) : null;
  const password = escapeHtml(tempPassword);
  const loginUrl = `${APP_URL}/login`;
  const mono = "font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size: 15px; font-weight: 600;";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #151a2d;">
      <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #2f8f5b; margin: 0 0 12px;">Welcome to DWKY Connect</p>
      <p style="font-size: 15px; margin: 0 0 16px;">Hi ${first},</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
        An account has been created for you on DWKY Connect, the Sunday School intranet.
        Sign in with your email address${username ? " or your username" : ""} and the one-time password below.
      </p>
      <div style="margin: 0 0 16px; padding: 14px 16px; background: #f7f9fd; border-left: 3px solid #2f8f5b; border-radius: 8px; font-size: 14px; line-height: 1.7;">
        Email address: <span style="${mono}">${email}</span><br/>
        ${username ? `Username: <span style="${mono}">${username}</span><br/>` : ""}
        One-time password: <span style="${mono}">${password}</span>
      </div>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 20px;">
        The first time you sign in you will be asked to choose your own password.
      </p>
      <a href="${loginUrl}" style="display: inline-block; padding: 10px 18px; background: #2f8f5b; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 600;">Sign in</a>
      <p style="font-size: 11px; color: #5f6478; margin: 28px 0 0;">
        Keep this email private; the password only works once.
      </p>
    </div>
  `;
}

/** Emails a new user their sign-in details. Returns whether the email was handed to the mail service. */
export async function sendWelcomeEmail(user: User, tempPassword: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set — skipping welcome email for user", user.id);
    return false;
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: FROM,
      to: user.email,
      subject: "Your DWKY Connect account",
      html: welcomeEmailHtml(user, tempPassword),
    });
    if (error) {
      console.error("Failed to send welcome email:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send welcome email:", err);
    return false;
  }
}
