import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, updateSettingsSchema } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Loader2, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { ImageUpload } from "./image-upload";

export function SettingsDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      id: settings?.id ?? 1,
      default_role: settings?.default_role ?? "pending",
      site_title: settings?.site_title ?? "",
      font_family: settings?.font_family ?? "",
      login_description: settings?.login_description ?? "",
      online_color: settings?.online_color ?? "#22c55e",
      offline_color: settings?.offline_color ?? "#ef4444",
      discord_url: settings?.discord_url ?? "https://discord.gg/YhGnr92Bep",
      show_refresh_interval: settings?.show_refresh_interval ?? true,
      show_last_checked: settings?.show_last_checked ?? true,
      show_service_url: settings?.show_service_url ?? true,
      show_uptime_log: settings?.show_uptime_log ?? false,
      beta_features: settings?.beta_features ?? false,
      admin_show_refresh_interval: settings?.admin_show_refresh_interval ?? true,
      admin_show_last_checked: settings?.admin_show_last_checked ?? true,
      admin_show_service_url: settings?.admin_show_service_url ?? true,
      admin_show_uptime_log: settings?.admin_show_uptime_log ?? false,
      logo_url: settings?.logo_url ?? "",
      logo_url_large: settings?.logo_url_large ?? "",
      admin_show_status_badge: settings?.admin_show_status_badge ?? true,
      show_status_badge: settings?.show_status_badge ?? true,
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

  const ampForm = useForm({
    defaultValues: {
      amp_url: "",
      amp_username: "",
      amp_password: "",
    },
  });

  const updateAMPCredentialsMutation = useMutation({
    mutationFn: async (data: { amp_url: string; amp_username: string; amp_password: string }) => {
      const res = await apiRequest("POST", "/api/update-amp-credentials", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "AMP Credentials Updated",
        description: "Your AMP credentials have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update AMP credentials",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testAMPConnection = async () => {
    try {
      setIsTestingConnection(true);
      const res = await apiRequest("GET", "/api/amp-test");
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Connection Successful",
          description: `Connected to AMP. Found ${data.instanceCount} instances.`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.message || "Could not connect to AMP server.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>UI Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="visibility">Visibility</TabsTrigger>
            <TabsTrigger value="amp">AMP</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="site_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Homelab Dashboard" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discord_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discord Invite URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://discord.gg/..." {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="font_family"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Font Family</FormLabel>
                      <FormControl>
                        <Input placeholder="Inter" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="login_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login Page Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Monitor your services and game servers..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="beta_features"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="font-medium">Beta Features</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enable experimental features like server metrics and controls
                      </p>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={updateSettingsMutation.isPending}>
                  {updateSettingsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="branding">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Header Logo</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value}
                          onChange={field.onChange}
                          onClear={() => field.onChange("")}
                          uploadType="site"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logo_url_large"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login Page Logo</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value}
                          onChange={field.onChange}
                          onClear={() => field.onChange("")}
                          uploadType="site"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="online_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Online Status Color</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="color" {...field} value={field.value || "#22c55e"} className="w-16 p-1 h-9" />
                        </FormControl>
                        <Input {...field} value={field.value || "#22c55e"} className="flex-1" />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="offline_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offline Status Color</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="color" {...field} value={field.value || "#ef4444"} className="w-16 p-1 h-9" />
                        </FormControl>
                        <Input {...field} value={field.value || "#ef4444"} className="flex-1" />
                      </div>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={updateSettingsMutation.isPending}>
                  {updateSettingsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="visibility">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Administrator View</h3>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="admin_show_status_badge"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="admin_show_status_badge" className="text-sm cursor-pointer">Show Status Badge</FormLabel>
                              <Switch
                                id="admin_show_status_badge"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="admin_show_uptime_log"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="admin_show_uptime_log" className="text-sm cursor-pointer">Show Uptime Log</FormLabel>
                              <Switch
                                id="admin_show_uptime_log"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="admin_show_refresh_interval"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="admin_show_refresh_interval" className="text-sm cursor-pointer">Show Refresh Interval</FormLabel>
                              <Switch
                                id="admin_show_refresh_interval"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="admin_show_last_checked"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="admin_show_last_checked" className="text-sm cursor-pointer">Show Last Checked Time</FormLabel>
                              <Switch
                                id="admin_show_last_checked"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="admin_show_service_url"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="admin_show_service_url" className="text-sm cursor-pointer">Show Service URL</FormLabel>
                              <Switch
                                id="admin_show_service_url"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-3">Regular User View</h3>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="show_status_badge"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="show_status_badge" className="text-sm cursor-pointer">Show Status Badge</FormLabel>
                              <Switch
                                id="show_status_badge"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="show_uptime_log"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="show_uptime_log" className="text-sm cursor-pointer">Show Uptime Log</FormLabel>
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
                              <FormLabel htmlFor="show_refresh_interval" className="text-sm cursor-pointer">Show Refresh Interval</FormLabel>
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
                              <FormLabel htmlFor="show_last_checked" className="text-sm cursor-pointer">Show Last Checked Time</FormLabel>
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
                              <FormLabel htmlFor="show_service_url" className="text-sm cursor-pointer">Show Service URL</FormLabel>
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
          <TabsContent value="amp">
            <Form {...ampForm}>
              <form onSubmit={ampForm.handleSubmit((data) => updateAMPCredentialsMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={ampForm.control}
                  name="amp_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AMP Server URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://your-amp-server.com" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={ampForm.control}
                  name="amp_username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AMP Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="AMP admin username" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={ampForm.control}
                  name="amp_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AMP Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="AMP admin password" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={updateAMPCredentialsMutation.isPending}
                  >
                    {updateAMPCredentialsMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Credentials
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testAMPConnection}
                    disabled={isTestingConnection}
                  >
                    {isTestingConnection ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}