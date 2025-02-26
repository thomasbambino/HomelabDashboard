import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { storage } from './storage';

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
  templateId?: number;
  templateData?: Record<string, any>;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    let html = params.html;
    let subject = params.subject;

    // If templateId is provided, fetch and use the template
    if (params.templateId) {
      const template = await storage.getEmailTemplate(params.templateId);
      if (!template) {
        throw new Error(`Email template with ID ${params.templateId} not found`);
      }

      subject = template.subject;
      html = compileTemplate(template.template, {
        ...params.templateData,
        appName: process.env.APP_NAME || 'Homelab Monitor',
        logoUrl: process.env.APP_LOGO_URL || '/logo.png'
      });
    }

    await client.messages.create(process.env.MAILGUN_DOMAIN!, {
      from: process.env.MAILGUN_FROM_EMAIL!,
      to: [params.to],
      subject: subject,
      text: params.text || '',
      html: html || '',
    });
    return true;
  } catch (error) {
    console.error('Mailgun email error:', error);
    return false;
  }
}

export function compileTemplate(template: string, data: Record<string, any>): string {
  // Replace all placeholders in the format {{key}} with their corresponding values
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    if (value === undefined) {
      console.warn(`Template variable "${key}" not found in data`);
      return match; // Keep the placeholder if no value is found
    }
    return String(value);
  });
}

// Helper function to get and compile a template by ID
export async function getCompiledTemplate(templateId: number, data: Record<string, any>): Promise<{ subject: string; html: string } | null> {
  try {
    const template = await storage.getEmailTemplate(templateId);
    if (!template) {
      return null;
    }

    const compiledHtml = compileTemplate(template.template, {
      ...data,
      appName: process.env.APP_NAME || 'Homelab Monitor',
      logoUrl: process.env.APP_LOGO_URL || '/logo.png'
    });

    return {
      subject: template.subject,
      html: compiledHtml
    };
  } catch (error) {
    console.error('Error compiling template:', error);
    return null;
  }
}