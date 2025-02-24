import { useQuery, useMutation } from "@tanstack/react-query";
import { ChatRoom as ChatRoomType, ChatMessage, User } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { Plus, Send, Users as UsersIcon, Image as ImageIcon } from "lucide-react";
import { chatClient } from "@/lib/chat";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ChatRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomType | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rooms = [] } = useQuery<ChatRoomType[]>({
    queryKey: ["/api/chat/rooms"],
  });

  const { data: messages = [] } = useQuery<(ChatMessage & { sender: User })[]>({
    queryKey: ["/api/chat/messages", selectedRoom?.id],
    enabled: !!selectedRoom,
  });

  const createRoomMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/chat/rooms", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setIsCreatingRoom(false);
      setNewRoomName("");
      toast({
        title: "Chat room created",
        description: "Your new chat room has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create chat room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedRoom) return;
      return apiRequest("POST", `/api/chat/messages/${selectedRoom.id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedRoom?.id] });
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    chatClient.on("message", (message) => {
      // Handle new message
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedRoom?.id] });
    });

    return () => {
      chatClient.off("message", () => {});
    };
  }, [selectedRoom?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    await createRoomMutation.mutateAsync(newRoomName);
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedRoom) return;
    await sendMessageMutation.mutateAsync(message);
  };

  return (
    <div className="flex h-full">
      {/* Room List */}
      <div className="w-64 border-r">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            <Dialog open={isCreatingRoom} onOpenChange={setIsCreatingRoom}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Chat Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="room-name">Room Name</Label>
                    <Input
                      id="room-name"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Enter room name..."
                    />
                  </div>
                  <Button
                    onClick={handleCreateRoom}
                    disabled={!newRoomName.trim() || createRoomMutation.isPending}
                    className="w-full"
                  >
                    Create Room
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {rooms.map((room) => (
              <Button
                key={room.id}
                variant={selectedRoom?.id === room.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedRoom(room)}
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                {room.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.senderId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="text-sm font-medium">
                    {msg.sender.username}
                  </div>
                  <div className="mt-1">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="shrink-0">
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button onClick={handleSend} disabled={!selectedRoom || !message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}