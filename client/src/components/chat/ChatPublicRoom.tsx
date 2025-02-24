import { useEffect, useRef, useState } from "react";
import { chatClient } from "@/lib/chat";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChatMessage, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Image as ImageIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

export function ChatPublicRoom() {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { data: publicRoom } = useQuery({
    queryKey: ["/api/chat/public-room"],
  });

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages", publicRoom?.id],
    enabled: !!publicRoom?.id,
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!publicRoom) return;
      await apiRequest("POST", `/api/chat/${publicRoom.id}/messages`, { content });
      chatClient.sendMessage(publicRoom.id, content);
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", publicRoom?.id] });
    },
  });

  useEffect(() => {
    const handleNewMessage = (message: ChatMessage) => {
      if (message.roomId === publicRoom?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", publicRoom.id] });
      }
    };

    chatClient.on("message", handleNewMessage);
    return () => chatClient.off("message", handleNewMessage);
  }, [publicRoom?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTyping = () => {
    if (!isTyping && publicRoom) {
      setIsTyping(true);
      chatClient.sendTypingIndicator(publicRoom.id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    if (message.trim() && !sendMessage.isPending) {
      sendMessage.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.senderId === currentUser?.id ? "flex-row-reverse" : ""
              }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://avatar.vercel.sh/${msg.senderId}`} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] ${
                  msg.senderId === currentUser?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {format(new Date(msg.createdAt), "HH:mm")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="min-h-10 max-h-40"
            rows={1}
          />
          <div className="flex flex-col gap-2">
            <Button
              size="icon"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                // TODO: Implement file upload
              }}
            >
              <ImageIcon className="h-5 w-5" />
              <span className="sr-only">Attach image</span>
            </Button>
            <Button
              size="icon"
              className="shrink-0"
              disabled={!message.trim() || sendMessage.isPending}
              onClick={handleSend}
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
