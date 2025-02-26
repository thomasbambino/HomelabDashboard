import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TestTube2, Eye, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EmailTemplate } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const emailTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject line is required"),
  template: z.string().min(1, "Template content is required"),
});

type EmailTemplateForm = z.infer<typeof emailTemplateSchema>;

interface EmailTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestEmail: (templateId: number, email: string) => void;
}

const defaultTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    .header { background-color: #1a1a1a; padding: 20px; text-align: center; }
    .header img { max-height: 50px; }
    .header h1 { color: white; margin: 10px 0; }
    .content { padding: 20px; }
    .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="{{logoUrl}}" alt="{{appName}} Logo" />
    <h1>{{appName}}</h1>
  </div>
  <div class="content">
    <p>Dear Administrator,</p>

    <p>This is to notify you that the service "{{serviceName}}" is currently {{status}}.</p>

    <p>Status Details:</p>
    <ul>
      <li>Service: {{serviceName}}</li>
      <li>Status: {{status}}</li>
      <li>Time: {{timestamp}}</li>
      <li>Duration: {{duration}}</li>
    </ul>

    <p>Please check the service dashboard for more details.</p>

    <p>Best regards,<br>
    Your Monitoring System</p>
  </div>
  <div class="footer">
    This is an automated message from {{appName}}. Please do not reply to this email.
  </div>
</body>
</html>`;

export function EmailTemplateDialog({ open, onOpenChange, onTestEmail }: EmailTemplateDialogProps) {
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const form = useForm<EmailTemplateForm>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      name: "",
      subject: "",
      template: defaultTemplate,
    },
  });

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: EmailTemplateForm) => {
      const res = await apiRequest("POST", "/api/email-templates", template);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setEditingTemplate(null);
      form.reset();
      toast({
        title: "Template created",
        description: "The email template has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: EmailTemplate) => {
      const res = await apiRequest("PATCH", `/api/email-templates/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setEditingTemplate(null);
      form.reset();
      toast({
        title: "Template updated",
        description: "The email template has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: EmailTemplateForm) => {
    if (editingTemplate?.id) {
      updateTemplateMutation.mutate({ ...data, id: editingTemplate.id });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      subject: template.subject,
      template: template.template,
    });
  };

  const handlePreview = () => {
    const sampleData = {
      logoUrl: "/logo.png",
      appName: "Homelab Monitor",
      serviceName: "Example Service",
      status: "UP",
      timestamp: new Date().toLocaleString(),
      duration: "5 minutes"
    };

    let preview = form.getValues("template");
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    setPreviewHtml(preview);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!editingTemplate && !previewHtml ? (
            <>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setEditingTemplate({});
                    form.reset({
                      name: "",
                      subject: "",
                      template: defaultTemplate,
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>

              <div className="space-y-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle>{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Subject: {template.subject}
                      </p>
                      <div className="text-sm border rounded-md p-2 max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-xs">
                          {template.template}
                        </pre>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleEdit(template)}
                        >
                          Edit
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="email"
                          placeholder="Test email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="w-48"
                        />
                        <Button
                          variant="secondary"
                          onClick={() => onTestEmail(template.id, testEmail)}
                        >
                          <TestTube2 className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          ) : previewHtml ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setPreviewHtml(null)}>
                  Close Preview
                </Button>
              </div>
              <div 
                className="border rounded-lg p-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter template name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email subject" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Content (HTML)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter HTML template content"
                          className="min-h-[400px] font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setPreviewHtml(null)}>
                    Cancel
                  </Button>
                  <Button type="button" variant="secondary" onClick={handlePreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
                    {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="h-4 w-4 mr-2" />
                    {editingTemplate?.id ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}