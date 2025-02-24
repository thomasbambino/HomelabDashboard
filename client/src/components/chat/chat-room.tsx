import { useQuery, useMutation } from "@tanstack/react-query";
import { ChatRoom as ChatRoomType, ChatMessage, User } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { Plus, Send } from "lucide-react";
import { chatClient } from "@/lib/chat";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function ChatRoom() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rooms = [] } = useQuery<ChatRoomType[]>({
    queryKey: ["/api/chat/rooms"],
  });

  const { data: messages = [] } = useQuery<(ChatMessage & { sender: User })[]>({
    queryKey: ["/api/chat/messages", selectedRoom?.id],
    enabled: !!selectedRoom,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedRoom) return;
      return apiRequest("POST", `/api/chat/messages/${selectedRoom.id}`, { content });
    },
  });

  useEffect(() => {
    chatClient.on("message", (message) => {
      // Handle new message
    });

    return () => {
      chatClient.off("message", () => {});
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedRoom) return;
    
    try {
      await sendMessageMutation.mutateAsync(message);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="flex h-full">
      {/* Room List */}
      <div className="w-64 border-r">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            <Button variant="outline" className="w-full" onClick={() => {}}>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            {rooms.map((room) => (
              <Button
                key={room.id}
                variant={selectedRoom?.id === room.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedRoom(room)}
              >
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
