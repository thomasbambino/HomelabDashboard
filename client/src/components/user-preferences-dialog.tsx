import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem } from "@/components/ui/form";
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

export function UserPreferencesDialog({ user }: { user: User }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      id: user.id,
      showRefreshInterval: user.showRefreshInterval,
      showLastChecked: user.showLastChecked,
      showServiceUrl: user.showServiceUrl,
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const res = await apiRequest("PATCH", `/api/users/${user.id}/preferences`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Preferences updated",
        description: "Your display preferences have been updated successfully",
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update preferences",
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
          Display Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Display Preferences</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updatePreferencesMutation.mutate(data))} className="space-y-4">
            <div className="space-y-4">
              <Label>Service Card Elements</Label>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="showRefreshInterval"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showRefreshInterval" className="cursor-pointer">Show Refresh Interval</Label>
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
                        <Label htmlFor="showLastChecked" className="cursor-pointer">Show Last Checked Time</Label>
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
                        <Label htmlFor="showServiceUrl" className="cursor-pointer">Show Service URL</Label>
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
            <Button
              type="submit"
              className="w-full"
              disabled={updatePreferencesMutation.isPending}
            >
              {updatePreferencesMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Preferences
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
