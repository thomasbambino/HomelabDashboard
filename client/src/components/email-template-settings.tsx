import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EmailTemplate, insertEmailTemplateSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import * as z from "zod";

const emailTemplateSchema = insertEmailTemplateSchema.extend({
  id: z.number().optional(),
});

type EmailTemplateForm = z.infer<typeof emailTemplateSchema>;

export function EmailTemplateSettings() {
  const { toast } = useToast();
  const form = useForm<EmailTemplateForm>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      name: "",
      subject: "",
      template: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .header img { max-height: 60px; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logo_url}}
        <img src="{{logo_url}}" alt="{{site_title}}">
      {{/if}}
      <h1>{{site_title}}</h1>
    </div>
    <div class="content">
      {{{message}}}
    </div>
  </div>
</body>
</html>
`,
      defaultTemplate: false,
    },
  });

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: EmailTemplateForm) => {
      const res = await apiRequest("POST", "/api/email-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      form.reset();
      toast({
        title: "Success",
        description: "Email template created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: EmailTemplateForm & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/email-templates/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      form.reset();
      toast({
        title: "Success",
        description: "Email template updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testTemplateMutation = useMutation({
    mutationFn: async ({ templateId, email }: { templateId: number; email: string }) => {
      const res = await apiRequest("POST", "/api/test-notification", { templateId, email });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test email sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Templates</CardTitle>
        <CardDescription>
          Manage email templates for notifications and user communications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium">Create New Template</h3>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) =>
                  data.id
                    ? updateTemplateMutation.mutate(data as EmailTemplateForm & { id: number })
                    : createTemplateMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
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
                      <FormLabel>HTML Template</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={15} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                >
                  {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {form.getValues("id") ? "Update Template" : "Create Template"}
                </Button>
              </form>
            </Form>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Existing Templates</h3>
            {isLoading ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4">
                {templates?.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>{template.subject}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            form.reset({
                              id: template.id,
                              name: template.name,
                              subject: template.subject,
                              template: template.template,
                              defaultTemplate: template.defaultTemplate,
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const email = prompt("Enter email address to send test to:");
                            if (email) {
                              testTemplateMutation.mutate({
                                templateId: template.id,
                                email,
                              });
                            }
                          }}
                        >
                          Send Test
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
