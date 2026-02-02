import nodemailer from "nodemailer";

/**
 * Creates and returns a configured SMTP transporter using environment variables
 */
export function createSMTPTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    throw new Error("Missing SMTP configuration environment variables");
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports (587 uses STARTTLS)
    requireTLS: smtpPort === 587, // Require TLS for port 587
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
}

/**
 * Gets the default sender email and name from environment variables
 */
export function getDefaultSender() {
  const senderEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "";
  const senderName = process.env.SMTP_FROM_NAME || "GPTO Audit";
  return { senderEmail, senderName };
}

/**
 * Sends an email using SMTP
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  from?: string;
  fromName?: string;
}) {
  const transporter = createSMTPTransporter();
  const { senderEmail, senderName } = getDefaultSender();

  const toAddresses = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  const fromAddress = options.from || senderEmail;
  const fromName = options.fromName || senderName;

  return transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: toAddresses,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
