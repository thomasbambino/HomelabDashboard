import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GameServer, updateGameServerSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface EditGameServerDialogProps {
  server: GameServer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGameServerDialog({ server, open, onOpenChange }: EditGameServerDialogProps) {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm({
    resolver: zodResolver(updateGameServerSchema),
    defaultValues: {
      id: server.id,
      instanceId: server.instanceId,
      name: server.name,
      displayName: server.displayName || "",
      type: server.type,
      icon: server.icon || "",
      background: server.background || "",
      status: server.status,
      playerCount: server.playerCount,
      maxPlayers: server.maxPlayers,
      hidden: server.hidden,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Parameters<typeof updateGameServerSchema.parse>[0]) => {
      console.log("Submitting data:", data);
      const res = await apiRequest("PUT", `/api/game-servers/${server.id}`, data);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
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
      console.error("Update error:", error);
      toast({
        title: "Failed to update server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/game-servers/${server.id}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to delete server: ${errorText}`);
      }
      return true;
    },
    onSuccess: () => {
      setShowDeleteConfirm(false);
      onOpenChange(false);
      queryClient.removeQueries({ queryKey: [`/api/game-servers/${server.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/game-servers"] });
      toast({
        title: "Server deleted",
        description: "The game server has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete server",
        description: error.message,
        variant: "destructive",
      });
      setShowDeleteConfirm(false);
    },
  });

  const onSubmit = async (data: Parameters<typeof updateGameServerSchema.parse>[0]) => {
    try {
      console.log("Form data before submission:", data);
      const validatedData = updateGameServerSchema.parse(data);
      console.log("Validated data:", validatedData);
      await updateMutation.mutateAsync(validatedData);
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Validation Error",
        description: "Please check all required fields",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          aria-labelledby="edit-server-title"
          aria-describedby="edit-server-description"
          className="max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle id="edit-server-title">Edit Game Server</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              aria-label="Edit game server form"
            >
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder={server.name} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
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
                        uploadType="service"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="background"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Background Image</FormLabel>
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
              <div className="sticky bottom-0 pt-4 bg-background">
                <div className="flex justify-between gap-4">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteMutation.isPending}
                    aria-label="Delete server"
                  >
                    <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Delete Server
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={updateMutation.isPending}
                    aria-label={updateMutation.isPending ? "Saving changes..." : "Save changes"}
                  >
                    {updateMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this server?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the game server
              "{server.name}" and remove all of its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Server"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}