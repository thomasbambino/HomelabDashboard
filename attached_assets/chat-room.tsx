import { useEffect, useState, useRef } from 'react';
import { useChat } from '@/lib/chat-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Image, Trash2 } from "lucide-react";
import { Channel as StreamChannel, Message } from 'stream-chat';
import type { DefaultStreamChatGenerics } from 'stream-chat';

export function ChatRoom() {
  const { chatClient, loading, error } = useChat();
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [channel, setChannel] = useState<StreamChannel<DefaultStreamChatGenerics> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!chatClient) {
      console.log('Chat client not initialized');
      return;
    }

    const loadChannel = async () => {
      try {
        console.log('Querying channels for public chat');
        const channels = await chatClient.queryChannels(
          { type: 'messaging', id: 'public' },
          { last_message_at: -1 },
          { limit: 1 }
        );

        console.log('Found channels:', channels);

        if (channels.length > 0) {
          const activeChannel = channels[0];
          setChannel(activeChannel);

          const messages = await activeChannel.watch();
          console.log('Loaded messages:', messages);
          setMessages(messages.messages || []);

          activeChannel.on('message.new', (event) => {
            setMessages((prev) => [...prev, event.message]);
          });

          activeChannel.on('message.deleted', (event) => {
            setMessages((prev) => prev.filter((msg) => msg.id !== event.message.id));
          });
        } else {
          console.log('No public channel found');
        }
      } catch (error) {
        console.error('Error loading channel:', error);
        toast({
          title: 'Error loading chat',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    };

    loadChannel();

    return () => {
      if (channel) {
        channel.stopWatching();
      }
    };
  }, [chatClient, toast]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatClient) return;

    try {
      await chatClient.deleteMessage(messageId);

      toast({
        title: 'Message deleted',
        description: 'Your message has been removed',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error deleting message',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

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

  const handleSend = async () => {
    if (!message.trim() || !channel) return;

    try {
      await channel.sendMessage({
        text: message.trim(),
      });
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
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.user?.id === chatClient?.user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex flex-col max-w-[70%] ${
                msg.user?.id === chatClient?.user?.id ? 'items-end' : 'items-start'
              }`}>
                <div
                  className={`relative group rounded-lg px-4 py-2 ${
                    msg.user?.id === chatClient?.user?.id
                      ? 'bg-primary text-primary-foreground mr-12'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {msg.user?.id === chatClient?.user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[120%] opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteMessage(msg.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
                    <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                  )}
                </div>
                <span className="text-xs text-foreground opacity-70 mt-1 px-1">
                  {msg.user?.name || 'Unknown User'}
                </span>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
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