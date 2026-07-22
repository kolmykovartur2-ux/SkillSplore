import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

// Email adapter over generic SMTP. In local/demo this points at Mailpit, which
// captures mail without sending it anywhere. In production it points at any
// standard SMTP provider. No proprietary email service is required.
let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  try {
    const info = await getTransport().sendMail({ from: env.MAIL_FROM, ...mail });
    logger.info({ to: mail.to, subject: mail.subject, messageId: info.messageId }, 'email sent');
  } catch (err) {
    // Never let a mail failure break a user flow; log for follow-up.
    logger.error({ err, to: mail.to, subject: mail.subject }, 'email send failed');
  }
}

export function verificationEmail(name: string, link: string): Mail['text'] {
  return `Hi ${name},\n\nConfirm your Learnfolk email address:\n${link}\n\nIf you did not create this account you can ignore this message.`;
}
