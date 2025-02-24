import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TestTube2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EmailTemplate } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface EmailTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestEmail: (templateId: number, email: string) => void;
}

const defaultTemplate = `<p>Dear Administrator,</p>

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
Your Monitoring System</p>`;

export function EmailTemplateDialog({ open, onOpenChange, onTestEmail }: EmailTemplateDialogProps) {
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate>) => {
      const res = await apiRequest("POST", "/api/email-templates", template);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setEditingTemplate(null);
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
    mutationFn: async (template: Partial<EmailTemplate>) => {
      const res = await apiRequest("PATCH", `/api/email-templates/${template.id}`, template);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setEditingTemplate(null);
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

  const handleCreateOrUpdate = () => {
    if (!editingTemplate?.name || !editingTemplate?.subject || !editingTemplate?.template) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (editingTemplate.id) {
      updateTemplateMutation.mutate(editingTemplate);
    } else {
      createTemplateMutation.mutate(editingTemplate);
    }
  };

  const handleTest = (templateId: number) => {
    if (!testEmail) {
      toast({
        title: "Validation error",
        description: "Please enter a test email address.",
        variant: "destructive",
      });
      return;
    }
    onTestEmail(templateId, testEmail);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Email Templates</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!editingTemplate ? (
            <>
              <div className="flex justify-end">
                <Button
                  onClick={() => setEditingTemplate({
                    name: "",
                    subject: "",
                    template: defaultTemplate,
                    defaultTemplate: false
                  })}
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
                        {template.template}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setEditingTemplate(template)}
                      >
                        Edit
                      </Button>
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
                          onClick={() => handleTest(template.id)}
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
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Template name"
                value={editingTemplate.name || ""}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Email subject"
                value={editingTemplate.subject || ""}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, subject: e.target.value }))}
              />
              <Textarea
                placeholder="HTML template content"
                value={editingTemplate.template || ""}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, template: e.target.value }))}
                className="min-h-[200px] font-mono"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOrUpdate}>
                  {editingTemplate.id ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
