import { useEffect, useState, useRef } from 'react';
import { useChat } from '@/lib/chat-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Image, Check } from "lucide-react";
import { Channel as StreamChannel } from 'stream-chat';
import type { DefaultStreamChatGenerics } from 'stream-chat-react/dist/types/types';

interface ChatRoomProps {
  channel: StreamChannel<DefaultStreamChatGenerics>;
}

export function ChatRoom({ channel }: ChatRoomProps) {
  const { chatClient } = useChat();
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!channel) return;

    const loadMessages = async () => {
      try {
        // Load existing messages
        const response = await channel.watch();
        setMessages(response.messages || []);

        // Mark channel as read when opened
        await channel.markRead();
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          title: 'Error loading messages',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    };

    loadMessages();

    // Listen for new messages
    channel.on('message.new', (event) => {
      setMessages((prev) => [...prev, event.message]);
      // Mark new messages as read
      channel.markRead();
      // Scroll to bottom when new message arrives
      setTimeout(() => {
        scrollAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    });

    // Listen for typing events
    channel.on('typing.start', (event) => {
      if (event.user?.id !== chatClient?.user?.id) {
        setTypingUsers(prev => [...new Set([...prev, event.user?.name || 'Someone'])]);
      }
    });

    channel.on('typing.stop', (event) => {
      if (event.user?.id !== chatClient?.user?.id) {
        setTypingUsers(prev => prev.filter(name => name !== event.user?.name));
      }
    });

    return () => {
      channel.stopWatching();
    };
  }, [channel, chatClient?.user?.id, toast]);

  const handleImageUpload = async (file: File) => {
    if (!channel) return;

    try {
      const response = await channel.sendImage(file);
      const url = response.file;

      await channel.sendMessage({
        text: '',
        attachments: [
          {
            type: 'image',
            image_url: url,
            fallback: file.name,
          },
        ],
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error uploading image',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleTyping = () => {
    if (!channel) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing.start event
    channel.keystroke();

    // Set timeout to stop typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      channel.stopTyping();
    }, 2000);
  };

  const handleSend = async () => {
    if (!message.trim() || !channel) return;

    try {
      await channel.sendMessage({
        text: message.trim(),
      });
      setMessage("");
      // Stop typing indicator when message is sent
      channel.stopTyping();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4" ref={scrollAreaRef}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.user?.id === chatClient?.user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[70%] ${
                  msg.user?.id === chatClient?.user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {msg.attachments?.length > 0 ? (
                  msg.attachments.map((attachment: any, i: number) => (
                    <img
                      key={i}
                      src={attachment.image_url}
                      alt={attachment.fallback}
                      className="max-w-full rounded-md my-2"
                    />
                  ))
                ) : (
                  <div>
                    {msg.text}
                    {msg.readBy && (
                      <span className="ml-2 text-xs flex items-center">
                        <Check className="h-3 w-3" />
                        {msg.readBy.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-muted-foreground">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      <div className="p-4 border-t bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImageUpload(file);
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="h-4 w-4" />
          </Button>
          <Input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
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