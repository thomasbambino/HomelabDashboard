import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings as SettingsIcon, Loader2, Image as ImageIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, updateSettingsSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

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
      // User visibility settings
      showRefreshInterval: true,
      showLastChecked: true,
      showServiceUrl: true,
      // Admin visibility settings
      adminShowRefreshInterval: true,
      adminShowLastChecked: true,
      adminShowServiceUrl: true,
    }
  });

  // Update form when settings are loaded
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
      setOpen(false); // Close the dialog after successful update
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();

      // Refresh settings to get the new logo URL
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
            <div className="space-y-6">
              {/* Admin View Settings */}
              <div className="space-y-4">
                <Label className="text-base">Administrator View Settings</Label>
                <p className="text-sm text-muted-foreground">
                  Control which elements are visible to administrators in the service cards.
                </p>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="adminShowRefreshInterval"
                    render={({ field }) => (
                      <div className="flex items-center justify-between">
                        <Label htmlFor="adminShowRefreshInterval" className="cursor-pointer">Show Refresh Interval</Label>
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
                        <Label htmlFor="adminShowLastChecked" className="cursor-pointer">Show Last Checked Time</Label>
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
                        <Label htmlFor="adminShowServiceUrl" className="cursor-pointer">Show Service URL</Label>
                        <Switch
                          id="adminShowServiceUrl"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Regular User View Settings */}
              <div className="space-y-4">
                <Label className="text-base">Regular User View Settings</Label>
                <p className="text-sm text-muted-foreground">
                  Control which elements are visible to regular users in the service cards.
                </p>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="showRefreshInterval"
                    render={({ field }) => (
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showRefreshInterval" className="cursor-pointer">Show Refresh Interval</Label>
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
                        <Label htmlFor="showLastChecked" className="cursor-pointer">Show Last Checked Time</Label>
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
                        <Label htmlFor="showServiceUrl" className="cursor-pointer">Show Service URL</Label>
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
            <div className="space-y-2">
              <Label>Logo</Label>
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
                    onChange={handleLogoUpload}
                    className="cursor-pointer"
                    disabled={isUploading}
                  />
                </div>
              </div>
              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              )}
            </div>
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