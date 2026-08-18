import nodemailer from "nodemailer";

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "0");
  const user = process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  if (!host || !port || !user || !pass || !from) throw new Error("Email delivery is not configured");
  return { host, port, user, pass, from };
}

export function isMailerConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD && process.env.SMTP_FROM);
}

export function createMailer() {
  const config = getMailConfig();
  return nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, auth: { user: config.user, pass: config.pass } });
}

export async function verifyMailerConnection() {
  await createMailer().verify();
}

export async function sendPasswordResetEmail(input: { recipient: string; recipientName: string | null; resetUrl: string }) {
  const config = getMailConfig();
  const subject = "App Builder — Password reset";
  const greeting = input.recipientName ? `Hello ${input.recipientName},` : "Hello,";
  await createMailer().sendMail({
    from: config.from,
    to: input.recipient,
    subject,
    text: `${greeting}\n\nUse this secure link to reset your App Builder password. It expires in 30 minutes:\n${input.resetUrl}\n\nIf you did not request a password reset, you can ignore this message.`,
    html: `<p>${greeting}</p><p>Use this secure link to reset your <strong>App Builder</strong> password. It expires in 30 minutes:</p><p><a href="${input.resetUrl}">Reset your password</a></p><p>If you did not request a password reset, you can ignore this message.</p>`,
  });
}
