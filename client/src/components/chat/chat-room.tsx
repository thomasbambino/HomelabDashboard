import { useEffect, useState } from 'react';
import { useChat } from '@/lib/chat-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function ChatRoom() {
  const { chatClient, loading, error } = useChat();
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!chatClient) {
      console.log('Chat client not initialized');
      return;
    }

    chatClient.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      chatClient.off('message');
    };
  }, [chatClient]);

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      await chatClient?.sendMessage(1, message);
      setMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <div className="text-center">
          <p className="font-semibold">Failed to connect to chat</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[70%] ${
                  msg.isMe
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}