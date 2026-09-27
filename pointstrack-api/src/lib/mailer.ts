import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Transactional mail. Without SMTP_HOST configured (local dev) messages are
// logged to the console so the reset flow stays testable end-to-end.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter(): ReturnType<typeof nodemailer.createTransport> | null {
  if (!env.mail.smtpHost) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.smtpHost,
      port: env.mail.smtpPort,
      secure: env.mail.smtpPort === 465,
      auth:
        env.mail.smtpUser && env.mail.smtpPass
          ? { user: env.mail.smtpUser, pass: env.mail.smtpPass }
          : undefined,
    });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[mail:dev] to=${to} subject=${subject}\n${text}`);
    return;
  }
  await t.sendMail({ from: env.mail.from, to, subject, text, html });
}

export function passwordResetEmail(name: string, resetUrl: string): { subject: string; text: string; html: string } {
  const subject = 'Reset your PointsTrack password';
  const text = [
    `Hi ${name},`,
    '',
    'Someone requested a password reset for your PointsTrack account.',
    `Reset it here (valid for 1 hour, single use): ${resetUrl}`,
    '',
    "If that wasn't you, ignore this email — your password stays the same.",
  ].join('\n');
  const html = `<p>Hi ${name},</p><p>Someone requested a password reset for your PointsTrack account.</p><p><a href="${resetUrl}">Reset your password</a> (valid for 1 hour, single use).</p><p>If that wasn't you, ignore this email — your password stays the same.</p>`;
  return { subject, text, html };
}
