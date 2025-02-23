import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GameServer, updateGameServerSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { Loader2 } from "lucide-react";

const SERVER_TYPES = ["minecraft", "satisfactory", "valheim", "terraria"];

interface EditGameServerDialogProps {
  server: GameServer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGameServerDialog({ server, open, onOpenChange }: EditGameServerDialogProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(updateGameServerSchema),
    defaultValues: {
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port,
      type: server.type,
      icon: server.icon ?? "",
      background: server.background ?? "",
      refreshInterval: server.refreshInterval,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: Parameters<typeof updateGameServerSchema.parse>[0]) => {
      const res = await apiRequest("PUT", `/api/game-servers/${server.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-servers"] });
      toast({
        title: "Server updated",
        description: "The game server has been updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        aria-labelledby="edit-server-title"
        aria-describedby="edit-server-description"
      >
        <DialogHeader>
          <DialogTitle id="edit-server-title">Edit Game Server</DialogTitle>
        </DialogHeader>
        <div id="edit-server-description" className="sr-only">
          Edit the settings and appearance of your game server
        </div>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))} 
            className="space-y-4"
            aria-label="Edit game server form"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel id="server-name-label">Server Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      aria-labelledby="server-name-label"
                      aria-required="true"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4" role="group" aria-label="Server connection details">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel id="server-host-label">Host</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="mc.example.com" 
                        {...field} 
                        aria-labelledby="server-host-label"
                        aria-required="true"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel id="server-port-label">Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        aria-labelledby="server-port-label"
                        aria-required="true"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel id="server-type-label">Server Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    aria-labelledby="server-type-label"
                  >
                    <FormControl>
                      <SelectTrigger aria-label="Select game type">
                        <SelectValue placeholder="Select a game type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SERVER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel id="server-icon-label">Icon Image</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      onClear={() => field.onChange("")}
                      aria-labelledby="server-icon-label"
                      aria-describedby="server-icon-description"
                      uploadType="service"
                    />
                  </FormControl>
                  <div id="server-icon-description" className="sr-only">
                    Upload or select an icon image for your game server
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="background"
              render={({ field }) => (
                <FormItem>
                  <FormLabel id="server-bg-label">Background Image</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      onClear={() => field.onChange("")}
                      aria-labelledby="server-bg-label"
                      aria-describedby="server-bg-description"
                      uploadType="service"
                    />
                  </FormControl>
                  <div id="server-bg-description" className="sr-only">
                    Upload or select a background image for your game server
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="refreshInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel id="refresh-interval-label">Refresh Interval (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="5"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || null)}
                      aria-labelledby="refresh-interval-label"
                      aria-describedby="refresh-interval-description"
                    />
                  </FormControl>
                  <div id="refresh-interval-description" className="sr-only">
                    Set how often the server status should be checked, minimum 5 seconds
                  </div>
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={mutation.isPending}
              aria-label={mutation.isPending ? "Saving changes..." : "Save changes"}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}