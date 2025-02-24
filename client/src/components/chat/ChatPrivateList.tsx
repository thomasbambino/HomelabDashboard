import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { ChatRoom, User } from "@shared/schema";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ChatPrivateList() {
  const { data: privateRooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/private-rooms"],
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button variant="outline" className="w-full" onClick={() => {
          // TODO: Implement new private chat dialog
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Private Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {privateRooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
              onClick={() => {
                // TODO: Implement room selection
              }}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatar.vercel.sh/${room.id}`} />
                <AvatarFallback>CH</AvatarFallback>
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
                {/* TODO: Add last message preview */}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
