import nodemailer from 'nodemailer';
import { Settings, Service } from '@shared/schema';

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn("Email notification system is not configured. Please set SMTP environment variables.");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailData {
  serviceName: string;
  status: string;
  lastChecked: string;
  responseTime: number;
}

export async function sendServiceStatusEmail(
  to: string,
  settings: Settings,
  data: EmailData
): Promise<boolean> {
  try {
    const subject = settings.notification_email_subject || 'Service Status Change Alert';
    let body = settings.notification_email_template || 'Service {serviceName} is now {status}.\n\nCurrent Status: {status}\nLast Checked: {lastChecked}\nResponse Time: {responseTime}ms';

    // Replace template variables
    body = body
      .replace(/{serviceName}/g, data.serviceName)
      .replace(/{status}/g, data.status)
      .replace(/{lastChecked}/g, data.lastChecked)
      .replace(/{responseTime}/g, data.responseTime.toString());

    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || 'noreply@yourdomain.com',
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    });
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export async function sendTestEmail(to: string, settings: Settings): Promise<boolean> {
  const testData: EmailData = {
    serviceName: 'Test Service',
    status: 'offline',
    lastChecked: new Date().toISOString(),
    responseTime: 150,
  };
  return sendServiceStatusEmail(to, settings, testData);
}