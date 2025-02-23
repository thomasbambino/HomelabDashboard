import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings as SettingsIcon, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, updateSettingsSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { ImageUpload } from "./image-upload";

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
      id: 1,
      defaultRole: "pending" as const,
      siteTitle: "",
      fontFamily: "",
      loginDescription: "",
      onlineColor: "#22c55e",
      offlineColor: "#ef4444",
      showRefreshInterval: true,
      showLastChecked: true,
      showServiceUrl: true,
      adminShowRefreshInterval: true,
      adminShowLastChecked: true,
      adminShowServiceUrl: true,
      logoUrl: "",
      logoUrlLarge: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        id: settings.id,
        defaultRole: settings.defaultRole,
        siteTitle: settings.siteTitle || "",
        fontFamily: settings.fontFamily || "",
        loginDescription: settings.loginDescription || "",
        onlineColor: settings.onlineColor || "#22c55e",
        offlineColor: settings.offlineColor || "#ef4444",
        showRefreshInterval: settings.showRefreshInterval ?? true,
        showLastChecked: settings.showLastChecked ?? true,
        showServiceUrl: settings.showServiceUrl ?? true,
        adminShowRefreshInterval: settings.adminShowRefreshInterval ?? true,
        adminShowLastChecked: settings.adminShowLastChecked ?? true,
        adminShowServiceUrl: settings.adminShowServiceUrl ?? true,
        logoUrl: settings.logoUrl || "",
        logoUrlLarge: settings.logoUrlLarge || "",
      });
    }
  }, [settings, form]);

  const updateUserPreferences = useMutation({
    mutationFn: async (showUptimeHistory: boolean) => {
      const res = await apiRequest("PATCH", "/api/user", {
        id: user?.id,
        showUptimeHistory,
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to update preferences: ${errorText}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Preferences updated",
        description: "Your display preferences have been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Parameters<typeof updateSettingsSchema.parse>[0]) => {
      const validatedData = updateSettingsSchema.parse(data);
      const res = await apiRequest("PATCH", "/api/settings", validatedData);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to update settings: ${errorText}`);
      }
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
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="visibility">Visibility</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="siteTitle"
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
                  name="fontFamily"
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
                  name="loginDescription"
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
                  name="logoUrl"
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
                  name="logoUrlLarge"
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
                  name="onlineColor"
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
                  name="offlineColor"
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
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Personal Preferences</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm text-muted-foreground">Show Uptime History Bar</FormLabel>
                      <Switch
                        checked={user?.showUptimeHistory ?? true}
                        onCheckedChange={(checked) => updateUserPreferences.mutate(checked)}
                      />
                    </div>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-base font-medium">Administrator View</h3>
                        <FormField
                          control={form.control}
                          name="adminShowRefreshInterval"
                          render={({ field }) => (
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="adminShowRefreshInterval" className="text-sm text-muted-foreground">
                                Refresh Interval
                              </FormLabel>
                              <Switch
                                id="adminShowRefreshInterval"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="adminShowLastChecked"
                          render={({ field }) => (
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="adminShowLastChecked" className="text-sm text-muted-foreground">
                                Last Checked Time
                              </FormLabel>
                              <Switch
                                id="adminShowLastChecked"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="adminShowServiceUrl"
                          render={({ field }) => (
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="adminShowServiceUrl" className="text-sm text-muted-foreground">
                                Service URL
                              </FormLabel>
                              <Switch
                                id="adminShowServiceUrl"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-base font-medium">Regular User View</h3>
                        <FormField
                          control={form.control}
                          name="showRefreshInterval"
                          render={({ field }) => (
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="showRefreshInterval" className="text-sm text-muted-foreground">
                                Refresh Interval
                              </FormLabel>
                              <Switch
                                id="showRefreshInterval"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="showLastChecked"
                          render={({ field }) => (
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="showLastChecked" className="text-sm text-muted-foreground">
                                Last Checked Time
                              </FormLabel>
                              <Switch
                                id="showLastChecked"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="showServiceUrl"
                          render={({ field }) => (
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="showServiceUrl" className="text-sm text-muted-foreground">
                                Service URL
                              </FormLabel>
                              <Switch
                                id="showServiceUrl"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={updateSettingsMutation.isPending}>
                        {updateSettingsMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}