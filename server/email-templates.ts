import { storage } from "./storage.js";

const baseTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 0; 
      padding: 0; 
      background-color: #f4f4f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header { 
      background-color: #1a1a1a; 
      padding: 20px;
      border-radius: 8px 8px 0 0;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 20px;
    }
    .header img { 
      max-height: 81px; 
      width: auto;
      vertical-align: middle;
    }
    .header h1 { 
      color: white; 
      margin: 0;
      font-size: 24px;
      display: inline-block;
      vertical-align: middle;
    }
    .content { 
      background-color: white;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .footer { 
      text-align: center; 
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
    .status {
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
    }
    .status.up {
      background-color: #dcfce7;
      color: #166534;
    }
    .status.down {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .alert {
      padding: 12px;
      border-radius: 6px;
      margin: 16px 0;
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #f59e0b;
    }
    .details {
      background-color: #f4f4f5;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .details ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .details li {
      margin: 8px 0;
      padding-left: 20px;
      position: relative;
    }
    .details li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #666;
    }
    @media only screen and (max-width: 600px) {
      .container { width: 100%; padding: 10px; }
      .content { padding: 20px; }
      .header { flex-direction: column; align-items: center; gap: 15px; }
      .header img { max-height: 65px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{logoUrl}}" alt="{{appName}} Logo" />
      <h1>{{appName}}</h1>
    </div>
    <div class="content">
      {{content}}
    </div>
    <div class="footer">
      This is an automated message from {{appName}}. Please do not reply to this email.
    </div>
  </div>
</body>
</html>
`;

const templates = [
  {
    name: "Service Status Alert",
    subject: "Service Status Update: {{serviceName}}",
    template: baseTemplate.replace("{{content}}", `
      <h2>Service Status Update</h2>
      <p>The service "{{serviceName}}" is currently <strong>{{status}}</strong>.</p>
      <div class="status {{#if isUp}}up{{else}}down{{/if}}">
        <strong>Status Details:</strong>
        <ul>
          <li>Service: {{serviceName}}</li>
          <li>Status: {{status}}</li>
          <li>Time: {{timestamp}}</li>
          <li>Duration: {{duration}}</li>
        </ul>
      </div>
      <p>Please check the service dashboard for more details.</p>
    `),
    defaultTemplate: true
  },
  {
    name: "Game Server Request",
    subject: "New Game Server Request",
    template: baseTemplate.replace("{{content}}", `
      <h2>New Game Server Request</h2>
      <p>A new game server has been requested:</p>
      <div class="details">
        <ul>
          <li><strong>Game:</strong> {{game}}</li>
          <li><strong>Requested by:</strong> {{username}}</li>
          <li><strong>User Email:</strong> {{userEmail}}</li>
          <li><strong>Time:</strong> {{timestamp}}</li>
        </ul>
      </div>
      <p>Please review this request in the admin dashboard.</p>
    `),
    defaultTemplate: true
  },
  {
    name: "User Password Reset Request",
    subject: "Password Reset Request",
    template: baseTemplate.replace("{{content}}", `
      <h2>Password Reset Request</h2>
      <p>A password reset has been requested for your account.</p>
      <div class="details">
        <ul>
          <li><strong>Temporary Password:</strong> {{tempPassword}}</li>
          <li><strong>Account:</strong> {{username}}</li>
          <li><strong>Time:</strong> {{timestamp}}</li>
        </ul>
      </div>
      <div class="alert">
        <strong>Important:</strong> For security reasons, you will be required to change this password when you next log in.
        If you did not request this password reset, please contact your administrator immediately.
      </div>
      <p>Please use this temporary password to log in to your account.</p>
    `),
    defaultTemplate: true
  },
  {
    name: "Admin Password Reset",
    subject: "Password Reset by Administrator",
    template: baseTemplate.replace("{{content}}", `
      <h2>Password Reset by Administrator</h2>
      <p>Your password has been reset by an administrator.</p>
      <div class="details">
        <ul>
          <li><strong>Temporary Password:</strong> {{tempPassword}}</li>
          <li><strong>Account:</strong> {{username}}</li>
          <li><strong>Time:</strong> {{timestamp}}</li>
        </ul>
      </div>
      <div class="alert">
        <strong>Important:</strong> For security reasons, you will be required to change this password when you next log in.
        If you did not expect this password reset, please contact your administrator immediately.
      </div>
      <p>Please use this temporary password to log in to your account.</p>
    `),
    defaultTemplate: true
  }
];

export async function setupDefaultTemplates() {
  try {
    console.log('Setting up default email templates...');

    for (const template of templates) {
      // Check if template already exists
      const existing = await storage.getEmailTemplateByName(template.name);

      if (!existing) {
        console.log(`Creating template: ${template.name}`);
        await storage.createEmailTemplate(template);
      } else {
        console.log(`Template already exists: ${template.name}`);
      }
    }

    console.log('Default email templates setup complete');
  } catch (error) {
    console.error('Error setting up default templates:', error);
    throw error;
  }
}