import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChatRoom, User } from "@shared/schema";
import { format } from "date-fns";
import { Plus, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ChatPrivateListProps {
  onSelectRoom?: (room: ChatRoom) => void;
}

export function ChatPrivateList({ onSelectRoom }: ChatPrivateListProps) {
  const { toast } = useToast();
  const [isUserListOpen, setIsUserListOpen] = useState(false);

  const { data: privateRooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/private-rooms"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createPrivateChatMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", "/api/chat/private-rooms", { userId });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create private chat");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/private-rooms"] });
      setIsUserListOpen(false);
      toast({
        title: "Private chat created",
        description: "You can now start messaging",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create private chat",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Dialog open={isUserListOpen} onOpenChange={setIsUserListOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Private Chat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Private Chat</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {users.map((user) => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => createPrivateChatMutation.mutate(user.id)}
                  >
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={`https://avatar.vercel.sh/${user.username}`} />
                      <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.isOnline ? "Online" : user.lastSeen && `Last seen ${format(new Date(user.lastSeen), "PP")}`}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {privateRooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
              onClick={() => onSelectRoom?.(room)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatar.vercel.sh/${room.name}`} />
                <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{room.name}</p>
                  {room.lastMessageAt && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(room.lastMessageAt), "HH:mm")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}