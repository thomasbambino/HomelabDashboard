import { useEffect, useState } from 'react';
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window,
} from 'stream-chat-react';
import { useChat } from '@/lib/chat-context';
import { Channel as StreamChannel } from 'stream-chat';
import { useToast } from '@/hooks/use-toast';
import type { DefaultStreamChatGenerics } from 'stream-chat-react/dist/types/types';
import 'stream-chat-react/dist/css/v2/index.css';

export function ChatRoom() {
  const { chatClient, loading, error } = useChat();
  const [activeChannel, setActiveChannel] = useState<StreamChannel<DefaultStreamChatGenerics> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!chatClient) {
      console.log('Chat client not initialized');
      return;
    }

    const loadChannel = async () => {
      try {
        console.log('Loading channels...');
        const filter = { type: 'team' };
        const sort = [{ last_message_at: -1 }];

        const channels = await chatClient.queryChannels(filter, sort, {
          limit: 1,
          state: true,
          watch: true,
        });

        console.log('Found channels:', channels);
        if (channels.length > 0) {
          setActiveChannel(channels[0]);
        } else {
          console.log('No channels found');
        }
      } catch (error) {
        console.error('Error loading channels:', error);
        toast({
          title: 'Error loading chat',
          description: 'Failed to load chat channels. Please try again.',
          variant: 'destructive',
        });
      }
    };

    loadChannel();
  }, [chatClient, toast]);

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

  if (!chatClient || !activeChannel) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p>No active chat</p>
          <p className="text-sm">Select or create a chat room to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-background">
      <Chat client={chatClient} theme="str-chat__theme-light">
        <Channel channel={activeChannel}>
          <Window>
            <ChannelHeader />
            <MessageList />
            <MessageInput focus />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
}