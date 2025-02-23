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
      showUptimeLog: user.showUptimeLog ?? false,
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
          UI Settings & Visibility
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>UI Settings & Visibility</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updatePreferencesMutation.mutate(data))} className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">Service Status Elements</h3>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="showUptimeLog"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showUptimeLog" className="text-sm cursor-pointer">Show Uptime Log</Label>
                          <Switch
                            id="showUptimeLog"
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