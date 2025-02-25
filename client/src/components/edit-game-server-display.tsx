import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GameServer, updateGameServerSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import * as z from 'zod';

interface EditGameServerDisplayProps {
  server: GameServer;
  isAdmin: boolean;
}

export function EditGameServerDisplay({ server, isAdmin }: EditGameServerDisplayProps) {
  const { toast } = useToast();

  // Only render for admins
  if (!isAdmin) return null;

  const form = useForm<z.infer<typeof updateGameServerSchema>>({
    resolver: zodResolver(updateGameServerSchema),
    defaultValues: {
      id: server.id,
      customDisplayName: server.customDisplayName || "",
      customGameType: server.customGameType || "",
      customIconUrl: server.customIconUrl || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof updateGameServerSchema>) => {
      const res = await apiRequest("PUT", `/api/game-servers/${server.id}`, values);
      if (!res.ok) {
        throw new Error('Failed to update server display settings');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-servers"] });
      toast({
        title: "Display settings updated",
        description: "The game server display has been customized successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update display",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 p-0"
          aria-label="Edit display settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize Server Display</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="customDisplayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={server.name} 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customGameType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game Type</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={server.type} 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customIconUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Server Icon</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      onClear={() => field.onChange("")}
                      uploadType="service"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}