import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, updateUserSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function UserPreferencesDialog({ user }: { user: User }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("visibility");

  const form = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      id: user.id,
      show_refresh_interval: user.show_refresh_interval ?? true,
      show_last_checked: user.show_last_checked ?? true,
      show_service_url: user.show_service_url ?? true,
      show_uptime_log: user.show_uptime_log ?? false,
      beta_features: user.beta_features ?? false,
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: Parameters<typeof updateUserSchema.parse>[0]) => {
      const res = await apiRequest("PATCH", `/api/users/${user.id}/preferences`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Preferences updated",
        description: "Your display preferences have been updated successfully",
      });
      //setOpen(false); // Removed to keep the dialog open
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: Parameters<typeof updateUserSchema.parse>[0]) => {
    // Only include changed fields in the update
    const changedFields = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== form.formState.defaultValues?.[key]) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Always include id
    changedFields.id = user.id;

    // Don't close the dialog on submit to maintain tab state
    updatePreferencesMutation.mutate(changedFields);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <SettingsIcon className="h-4 w-4 mr-2" />
          UI Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>UI Settings</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="beta">Beta</TabsTrigger>
            <TabsTrigger value="visibility">Visibility</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <div className="text-sm text-muted-foreground">
              General settings coming soon
            </div>
          </TabsContent>
          <TabsContent value="beta">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="beta_features"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="beta_features" className="text-sm cursor-pointer">Enable Beta Features</Label>
                          <Switch
                            id="beta_features"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enable experimental features like server metrics and controls
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={updatePreferencesMutation.isPending}
                >
                  {updatePreferencesMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="visibility">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="show_uptime_log"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="show_uptime_log" className="text-sm cursor-pointer">Show Uptime Log</Label>
                            <Switch
                              id="show_uptime_log"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="show_refresh_interval"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="show_refresh_interval" className="text-sm cursor-pointer">Refresh Interval</Label>
                            <Switch
                              id="show_refresh_interval"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="show_last_checked"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="show_last_checked" className="text-sm cursor-pointer">Last Checked Time</Label>
                            <Switch
                              id="show_last_checked"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="show_service_url"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="show_service_url" className="text-sm cursor-pointer">Service URL</Label>
                            <Switch
                              id="show_service_url"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={updatePreferencesMutation.isPending}
                >
                  {updatePreferencesMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}