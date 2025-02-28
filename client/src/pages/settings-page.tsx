import { useState, useEffect } from "react";
import { Settings, updateSettingsSchema } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationBar } from "@/components/navigation-bar";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Mail, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState("general");
  const isSuperAdmin = user?.role === 'superadmin';
  const [horizontalPadding, setHorizontalPadding] = useState(32);
  const [verticalPadding, setVerticalPadding] = useState(24);
  const [maxWidth, setMaxWidth] = useState(1400);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      id: 1,
      show_layout_debugger: false,
      layout_horizontal_padding: 32,
      layout_vertical_padding: 24,
      layout_max_width: 1400,
      favicon_url: "",
      favicon_label: "",
      tracking_code: "",
      default_role: "pending",
      site_title: "",
      font_family: "",
      login_description: "",
      online_color: "#22c55e",
      offline_color: "#ef4444",
      discord_url: "https://discord.gg/YhGnr92Bep",
      show_refresh_interval: true,
      show_last_checked: true,
      show_service_url: true,
      show_status_badge: true,
      admin_show_refresh_interval: true,
      admin_show_last_checked: true,
      admin_show_service_url: true,
      admin_show_status_badge: true,
      logo_url: "",
      logo_url_large: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        ...settings,
        id: settings.id ?? 1,
      });

      // Update the state values and apply CSS when settings are loaded
      setHorizontalPadding(settings.layout_horizontal_padding);
      setVerticalPadding(settings.layout_vertical_padding);
      setMaxWidth(settings.layout_max_width);

      // Apply CSS variables when settings are loaded
      document.documentElement.style.setProperty('--layout-horizontal-padding', `${settings.layout_horizontal_padding}px`);
      document.documentElement.style.setProperty('--layout-vertical-padding', `${settings.layout_vertical_padding}px`);
      document.documentElement.style.setProperty('--layout-max-width', `${settings.layout_max_width}px`);
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Parameters<typeof updateSettingsSchema.parse>[0]) => {
      const relevantData: any = { id: data.id };

      if (currentTab === "debug") {
        // For debug tab, include both the layout debugger toggle and the current layout values
        Object.assign(relevantData, {
          show_layout_debugger: data.show_layout_debugger,
          layout_horizontal_padding: horizontalPadding,
          layout_vertical_padding: verticalPadding,
          layout_max_width: maxWidth,
        });

        // Apply CSS variables immediately when saving
        document.documentElement.style.setProperty('--layout-horizontal-padding', `${horizontalPadding}px`);
        document.documentElement.style.setProperty('--layout-vertical-padding', `${verticalPadding}px`);
        document.documentElement.style.setProperty('--layout-max-width', `${maxWidth}px`);
      } else {
        // For other tabs, include only the relevant fields
        Object.assign(relevantData, data);
      }

      const res = await apiRequest("PATCH", "/api/settings", relevantData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully",
      });
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
    <PageTransition>
      <div className="min-h-screen bg-background">
        <NavigationBar settings={settings} pageTitle="Settings" />

        <main className="container mx-auto pt-24 pb-6 space-y-6">
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Settings</CardTitle>
              <Link href="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="general" className="space-y-4" onValueChange={setCurrentTab}>
                <TabsList className="w-full flex justify-start gap-2 rounded-md bg-muted p-2">
                  <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                  <TabsTrigger value="branding" className="flex-1">Branding</TabsTrigger>
                  <TabsTrigger value="visibility" className="flex-1">Visibility</TabsTrigger>
                  {isSuperAdmin && (
                    <>
                      <TabsTrigger value="amp" className="flex-1">AMP</TabsTrigger>
                      <TabsTrigger value="email" className="flex-1 flex items-center justify-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </TabsTrigger>
                      <TabsTrigger value="debug" className="flex-1">Debug</TabsTrigger>
                    </>
                  )}
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
                      {isSuperAdmin && (
                        <FormField
                          control={form.control}
                          name="default_role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Default User Role</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select default role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
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
                            <FormLabel>Logo URL</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="https://example.com/logo.png" {...field} value={field.value || ""} />
                              </FormControl>
                              <Button variant="outline" type="button" className="shrink-0">
                                Upload
                              </Button>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="logo_url_large"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Large Logo URL</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="https://example.com/logo-large.png" {...field} value={field.value || ""} />
                              </FormControl>
                              <Button variant="outline" type="button" className="shrink-0">
                                Upload
                              </Button>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="favicon_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Favicon URL</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="https://example.com/favicon.ico" {...field} value={field.value || ""} />
                              </FormControl>
                              <Button variant="outline" type="button" className="shrink-0">
                                Upload
                              </Button>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="favicon_label"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Favicon Label</FormLabel>
                            <FormControl>
                              <Input placeholder="My Dashboard" {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="online_color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Online Status Color</FormLabel>
                              <FormControl>
                                <Input type="color" {...field} value={field.value || "#22c55e"} className="h-10 px-2" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="offline_color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Offline Status Color</FormLabel>
                              <FormControl>
                                <Input type="color" {...field} value={field.value || "#ef4444"} className="h-10 px-2" />
                              </FormControl>
                            </FormItem>
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
                </TabsContent>

                <TabsContent value="visibility">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium">Default User Settings</h3>
                          <p className="text-sm text-muted-foreground mb-4">Configure default visibility settings for new users</p>
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="show_refresh_interval"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="show_refresh_interval" className="text-sm cursor-pointer">Show Refresh Interval</Label>
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
                                    <Label htmlFor="show_last_checked" className="text-sm cursor-pointer">Show Last Checked Time</Label>
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
                                    <Label htmlFor="show_service_url" className="text-sm cursor-pointer">Show Service URL</Label>
                                    <Switch
                                      id="show_service_url"
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="show_status_badge"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="show_status_badge" className="text-sm cursor-pointer">Show Status Badge</Label>
                                    <Switch
                                      id="show_status_badge"
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator className="my-6" />

                        <div>
                          <h3 className="text-lg font-medium">Admin Default Settings</h3>
                          <p className="text-sm text-muted-foreground mb-4">Configure default visibility settings for admin users</p>
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="admin_show_refresh_interval"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="admin_show_refresh_interval" className="text-sm cursor-pointer">Show Refresh Interval</Label>
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
                                    <Label htmlFor="admin_show_last_checked" className="text-sm cursor-pointer">Show Last Checked Time</Label>
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
                                    <Label htmlFor="admin_show_service_url" className="text-sm cursor-pointer">Show Service URL</Label>
                                    <Switch
                                      id="admin_show_service_url"
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="admin_show_status_badge"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="admin_show_status_badge" className="text-sm cursor-pointer">Show Status Badge</Label>
                                    <Switch
                                      id="admin_show_status_badge"
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
                      <Button type="submit" className="w-full mt-6" disabled={updateSettingsMutation.isPending}>
                        {updateSettingsMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                {isSuperAdmin && (
                  <>
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
                                  <Input placeholder="https://amp.example.com" {...field} />
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
                                  <Input {...field} />
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
                                  <Input type="password" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="flex gap-2">
                            <Button type="submit" className="flex-1" disabled={updateAMPCredentialsMutation.isPending}>
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

                    <TabsContent value="email">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium">Email Templates</h3>
                            <p className="text-sm text-muted-foreground">
                              Customize the email templates used for notifications and user communications
                            </p>
                          </div>
                          <Button onClick={() => setShowEmailTemplates(true)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Manage Templates
                          </Button>
                        </div>
                      </div>
                      <EmailTemplateDialog
                        open={showEmailTemplates}
                        onOpenChange={setShowEmailTemplates}
                      />
                    </TabsContent>
                    <TabsContent value="debug">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-lg font-medium">Debug Tools</h3>
                              <p className="text-sm text-muted-foreground mb-4">Configure development and debugging tools</p>
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="show_layout_debugger"
                                  render={({ field }) => (
                                    <FormItem>
                                      <div className="flex items-center justify-between">
                                        <Label htmlFor="show_layout_debugger" className="text-sm cursor-pointer">Layout Debugger</Label>
                                        <Switch
                                          id="show_layout_debugger"
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Shows a tool to adjust page layout spacing in real-time
                                      </p>
                                    </FormItem>
                                  )}
                                />

                                <div className="mt-4 pt-4 border-t">
                                  <h4 className="text-sm font-medium mb-4">Layout Configuration</h4>
                                  <div className="space-y-6">
                                    <div>
                                      <div className="flex justify-between items-center mb-2">
                                        <Label>Horizontal Padding</Label>
                                        <span className="text-sm text-muted-foreground">{horizontalPadding}px</span>
                                      </div>
                                      <Slider
                                        defaultValue={[horizontalPadding]}
                                        max={200}
                                        step={4}
                                        value={[horizontalPadding]}
                                        onValueChange={([value]) => {
                                          setHorizontalPadding(value);
                                          document.documentElement.style.setProperty('--layout-horizontal-padding', `${value}px`);
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <div className="flex justify-between items-center mb-2">
                                        <Label>Vertical Padding</Label>
                                        <span className="text-sm text-muted-foreground">{verticalPadding}px</span>
                                      </div>
                                      <Slider
                                        defaultValue={[verticalPadding]}
                                        max={200}
                                        step={4}
                                        value={[verticalPadding]}
                                        onValueChange={([value]) => {
                                          setVerticalPadding(value);
                                          document.documentElement.style.setProperty('--layout-vertical-padding', `${value}px`);
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <div className="flex justify-between items-center mb-2">
                                        <Label>Max Content Width</Label>
                                        <span className="text-sm text-muted-foreground">{maxWidth}px</span>
                                      </div>
                                      <Slider
                                        defaultValue={[maxWidth]}
                                        min={800}
                                        max={2000}
                                        step={50}
                                        value={[maxWidth]}
                                        onValueChange={([value]) => {
                                          setMaxWidth(value);
                                          document.documentElement.style.setProperty('--layout-max-width', `${value}px`);
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button type="submit" className="w-full" disabled={updateSettingsMutation.isPending}>
                            {updateSettingsMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save Changes
                          </Button>
                        </form>
                      </Form>
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </CardContent>
          </Card>
          <Separator className="mx-auto w-full max-w-[calc(100%-2rem)] bg-border/60" />
        </main>
      </div>
    </PageTransition>
  );
}