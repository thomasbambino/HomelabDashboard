import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { ChatRoom, User } from "@shared/schema";
import { format } from "date-fns";
import { Plus, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { chatClient } from "@/lib/chat";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export function ChatGroupList() {
  const { user } = useAuth();
  const { data: groupRooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/group-rooms"],
  });

  useEffect(() => {
    if (user?.id) {
      chatClient.setUserId(user.id);
    }
  }, [user?.id]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button variant="outline" className="w-full" onClick={() => {
          // TODO: Implement new group chat dialog
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Group Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {groupRooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
              onClick={() => {
                // TODO: Implement room selection
              }}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatar.vercel.sh/${room.id}`} />
                <AvatarFallback><Users className="h-5 w-5" /></AvatarFallback>
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
                {/* TODO: Add last message preview and member count */}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}