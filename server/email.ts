import formData from 'form-data';
import Mailgun from 'mailgun.js';

if (!process.env.MAILGUN_API_KEY) {
  throw new Error("MAILGUN_API_KEY environment variable must be set");
}

if (!process.env.MAILGUN_DOMAIN) {
  throw new Error("MAILGUN_DOMAIN environment variable must be set");
}

if (!process.env.MAILGUN_FROM_EMAIL) {
  throw new Error("MAILGUN_FROM_EMAIL environment variable must be set");
}

const mailgun = new Mailgun(formData);
const client = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await client.messages.create(process.env.MAILGUN_DOMAIN!, {
      from: process.env.MAILGUN_FROM_EMAIL!,
      to: [params.to], // Mailgun expects an array of recipients
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    return true;
  } catch (error) {
    console.error('Mailgun email error:', error);
    return false;
  }
}

export function compileTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}