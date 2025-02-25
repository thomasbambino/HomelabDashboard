import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GameServer } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { Switch } from "@/components/ui/switch";
import * as z from 'zod';

const customizeServerSchema = z.object({
  icon: z.string().optional(),
  show_player_count: z.boolean(),
  show_status_badge: z.boolean(),
});

type CustomizeServerForm = z.infer<typeof customizeServerSchema>;

interface CustomizeServerDialogProps {
  server: GameServer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomizeServerDialog({ server, open, onOpenChange }: CustomizeServerDialogProps) {
  const { toast } = useToast();

  const form = useForm<CustomizeServerForm>({
    resolver: zodResolver(customizeServerSchema),
    defaultValues: {
      icon: server.icon ?? "",
      show_player_count: server.show_player_count ?? true,
      show_status_badge: server.show_status_badge ?? true,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomizeServerForm) => {
      const res = await apiRequest("PATCH", `/api/game-servers/${server.instanceId}/appearance`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-servers"] });
      toast({
        title: "Appearance updated",
        description: "The server card appearance has been updated",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update appearance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize Server Appearance</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Server Icon</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      onClear={() => field.onChange("")}
                      uploadType="server"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="show_player_count"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Show Player Count</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="show_status_badge"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Show Status Badge</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
