import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings as SettingsIcon, Loader2, Image as ImageIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, updateSettingsSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Dialog as UserDialog, DialogContent as UserDialogContent, DialogHeader as UserDialogHeader, DialogTitle as UserDialogTitle, DialogTrigger as UserDialogTrigger } from "@/components/ui/dialog";
import { User, updateUserSchema } from "@shared/schema";


export function SettingsDialog() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      id: 1,
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
      logoUrlLarge: ""
    }
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        id: settings.id,
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
        logoUrlLarge: settings.logoUrlLarge || ""
      });
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'largeLogo') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG or JPEG image",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });

      toast({
        title: "Logo updated",
        description: "The logo has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="visibility">Visibility</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
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
              </TabsContent>

              <TabsContent value="branding" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Header Logo</Label>
                    <div className="flex items-center gap-4">
                      {settings?.logoUrl && (
                        <img
                          src={settings.logoUrl}
                          alt="Site Logo"
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={(e) => handleLogoUpload(e, 'logo')}
                          className="cursor-pointer"
                          disabled={isUploading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Login Page Logo</Label>
                    <div className="flex items-center gap-4">
                      {settings?.logoUrlLarge && (
                        <img
                          src={settings.logoUrlLarge}
                          alt="Large Site Logo"
                          className="w-12 h-12 object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={(e) => handleLogoUpload(e, 'largeLogo')}
                          className="cursor-pointer"
                          disabled={isUploading}
                        />
                      </div>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </div>
                  )}

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
                </div>
              </TabsContent>

              <TabsContent value="visibility" className="mt-4">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base">Administrator View</Label>
                      <FormField
                        control={form.control}
                        name="adminShowRefreshInterval"
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <Label htmlFor="adminShowRefreshInterval" className="text-sm text-muted-foreground">Refresh Interval</Label>
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
                            <Label htmlFor="adminShowLastChecked" className="text-sm text-muted-foreground">Last Checked Time</Label>
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
                            <Label htmlFor="adminShowServiceUrl" className="text-sm text-muted-foreground">Service URL</Label>
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
                      <Label className="text-base">Regular User View</Label>
                      <FormField
                        control={form.control}
                        name="showRefreshInterval"
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <Label htmlFor="showRefreshInterval" className="text-sm text-muted-foreground">Refresh Interval</Label>
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
                            <Label htmlFor="showLastChecked" className="text-sm text-muted-foreground">Last Checked Time</Label>
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
                            <Label htmlFor="showServiceUrl" className="text-sm text-muted-foreground">Service URL</Label>
                            <Switch
                              id="showServiceUrl"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              type="submit"
              className="w-full"
              disabled={updateSettingsMutation.isPending || isUploading}
            >
              {updateSettingsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


interface EditUserSettingsDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserSettingsDialog({ user, open, onOpenChange }: EditUserSettingsDialogProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      id: user.id,
      username: user.username,
      role: user.role,
      approved: user.approved,
      canViewNSFW: user.canViewNSFW,
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: Parameters<typeof updateUserSchema.parse>[0]) => {
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User updated",
        description: "User settings have been updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Settings</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateUserMutation.mutate(data))} className="space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="approved"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Account Approved</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="canViewNSFW"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Can View NSFW Content</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                        <option value="pending">Pending</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={updateUserMutation.isPending}
            >
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}