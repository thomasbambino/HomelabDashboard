import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatRoom } from "./chat-room";
import { useChat } from "@/lib/chat-context";
import { Channel as StreamChannel } from 'stream-chat';
import type { DefaultStreamChatGenerics } from 'stream-chat-react/dist/types/types';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState("public");
  const { chatClient } = useChat();
  const [channels, setChannels] = useState<StreamChannel<DefaultStreamChatGenerics>[]>([]);
  const [activeChannel, setActiveChannel] = useState<StreamChannel<DefaultStreamChatGenerics> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!chatClient) return;

    const loadChannels = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query channels based on active tab
        const filter = activeTab === "public" 
          ? { type: 'team', id: 'public' }
          : activeTab === "groups" 
            ? { type: 'team', id: { $ne: 'public' } }
            : { type: 'messaging' };

        const sort = { last_message_at: -1 };

        const response = await chatClient.queryChannels(filter, sort, {
          limit: 10,
          state: true,
          watch: true,
        });

        console.log('Loaded channels:', response);
        setChannels(response);

        // Set first channel as active if none selected
        if (!activeChannel && response.length > 0) {
          setActiveChannel(response[0]);
        }
      } catch (error) {
        console.error('Error loading channels:', error);
        setError(error instanceof Error ? error : new Error('Failed to load channels'));
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, [chatClient, activeTab]);

  return (
    <div className="flex h-full">
      {/* Channels List */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4 border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="public">Public</TabsTrigger>
              <TabsTrigger value="private">Private</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">
              Failed to load channels: {error.message}
            </div>
          ) : channels.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No channels available
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors ${
                    activeChannel?.id === channel.id ? 'bg-accent' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Users className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">
                      {channel.data?.name || 'Unnamed Channel'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        {activeChannel ? (
          <ChatRoom channel={activeChannel} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a channel to start chatting
          </div>
        )}
      </div>
    </div>
  );
}