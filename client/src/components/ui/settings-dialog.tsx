import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, updateSettingsSchema } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export function SettingsDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      id: settings?.id ?? 1,
      defaultRole: settings?.defaultRole ?? "pending",
      siteTitle: settings?.siteTitle ?? "",
      fontFamily: settings?.fontFamily ?? "",
      loginDescription: settings?.loginDescription ?? "",
      onlineColor: settings?.onlineColor ?? "#22c55e",
      offlineColor: settings?.offlineColor ?? "#ef4444",
      showRefreshInterval: settings?.showRefreshInterval ?? true,
      showLastChecked: settings?.showLastChecked ?? true,
      showServiceUrl: settings?.showServiceUrl ?? true,
      showUptimeLog: settings?.showUptimeLog ?? false,
      adminShowRefreshInterval: settings?.adminShowRefreshInterval ?? true,
      adminShowLastChecked: settings?.adminShowLastChecked ?? true,
      adminShowServiceUrl: settings?.adminShowServiceUrl ?? true,
      logoUrl: settings?.logoUrl ?? "",
      logoUrlLarge: settings?.logoUrlLarge ?? "",
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Parameters<typeof updateSettingsSchema.parse>[0]) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "UI settings have been updated successfully",
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <SettingsIcon className="h-4 w-4 mr-2" />
          UI Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>UI Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="visibility">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="visibility">Visibility</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <div className="text-sm text-muted-foreground">
              General settings coming soon
            </div>
          </TabsContent>
          <TabsContent value="branding">
            <div className="text-sm text-muted-foreground">
              Branding settings coming soon
            </div>
          </TabsContent>
          <TabsContent value="visibility">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-6">
                <div className="space-y-6">
                  {/* Admin Settings Section */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Administrator View</h3>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="adminShowRefreshInterval"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="adminShowRefreshInterval" className="text-sm cursor-pointer">Admin Refresh Interval</FormLabel>
                              <Switch
                                id="adminShowRefreshInterval"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="adminShowLastChecked"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="adminShowLastChecked" className="text-sm cursor-pointer">Admin Last Checked Time</FormLabel>
                              <Switch
                                id="adminShowLastChecked"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="adminShowServiceUrl"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="adminShowServiceUrl" className="text-sm cursor-pointer">Admin Service URL</FormLabel>
                              <Switch
                                id="adminShowServiceUrl"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* User Settings Section */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Regular User View</h3>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="showUptimeLog"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="showUptimeLog" className="text-sm cursor-pointer">Show Uptime Log</FormLabel>
                              <Switch
                                id="showUptimeLog"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="showRefreshInterval"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="showRefreshInterval" className="text-sm cursor-pointer">Refresh Interval</FormLabel>
                              <Switch
                                id="showRefreshInterval"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="showLastChecked"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="showLastChecked" className="text-sm cursor-pointer">Last Checked Time</FormLabel>
                              <Switch
                                id="showLastChecked"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="showServiceUrl"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="showServiceUrl" className="text-sm cursor-pointer">Service URL</FormLabel>
                              <Switch
                                id="showServiceUrl"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending && (
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