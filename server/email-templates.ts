import { storage } from "./storage";

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
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header img { 
      max-height: 50px; 
      margin-bottom: 10px;
    }
    .header h1 { 
      color: white; 
      margin: 10px 0; 
      font-size: 24px;
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
    @media only screen and (max-width: 600px) {
      .container { width: 100%; padding: 10px; }
      .content { padding: 20px; }
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
    name: "Password Reset",
    subject: "Password Reset Request",
    template: baseTemplate.replace("{{content}}", `
      <h2>Password Reset Request</h2>
      <p>Your password has been reset as requested.</p>
      <p>Your new temporary password is: <strong>{{tempPassword}}</strong></p>
      <p>Please log in with this password. You will be required to change your password upon login.</p>
      <p><strong>Note:</strong> If you did not request this password reset, please contact your administrator immediately.</p>
    `),
    defaultTemplate: true
  },
  {
    name: "Game Server Request",
    subject: "New Game Server Request",
    template: baseTemplate.replace("{{content}}", `
      <h2>New Game Server Request</h2>
      <p>A new game server has been requested:</p>
      <ul>
        <li><strong>Game:</strong> {{game}}</li>
        <li><strong>Requested by:</strong> {{username}}</li>
        <li><strong>User Email:</strong> {{userEmail}}</li>
        <li><strong>Time:</strong> {{timestamp}}</li>
      </ul>
      <p>Please review this request in the admin dashboard.</p>
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