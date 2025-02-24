import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatRoom } from "./chat-room";
import { useQuery } from "@tanstack/react-query";
import { Channel as StreamChannel } from 'stream-chat';
import { useChat } from "@/lib/chat-context";
import type { DefaultStreamChatGenerics } from 'stream-chat-react/dist/types/types';

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState("public");
  const { chatClient } = useChat();
  const [activeChannel, setActiveChannel] = useState<StreamChannel<DefaultStreamChatGenerics> | null>(null);

  // Query public channel
  useQuery({
    queryKey: ['chat-channels', 'public'],
    queryFn: async () => {
      if (!chatClient) return null;

      try {
        const channels = await chatClient.queryChannels(
          { type: 'team', id: 'public' },
          { last_message_at: -1 }
        );

        console.log('Found channels:', channels);

        if (channels.length > 0) {
          setActiveChannel(channels[0]);
          return channels[0];
        }
      } catch (error) {
        console.error('Error loading public channel:', error);
      }
      return null;
    },
    enabled: !!chatClient
  });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto">
        <TabsContent value="public" className="h-full m-0">
          {activeChannel && <ChatRoom channel={activeChannel} />}
        </TabsContent>
        <TabsContent value="private" className="h-full m-0">
          <div className="p-4 text-muted-foreground">Private chats coming soon</div>
        </TabsContent>
        <TabsContent value="groups" className="h-full m-0">
          <div className="p-4 text-muted-foreground">Group chats coming soon</div>
        </TabsContent>
      </div>
    </div>
  );
}