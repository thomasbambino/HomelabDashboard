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
import 'stream-chat-react/dist/css/index.css';
import { StreamChat } from 'stream-chat';
import { useToast } from '@/hooks/use-toast';

export function ChatRoom() {
  const { chatClient, loading, error } = useChat();
  const [activeChannel, setActiveChannel] = useState<typeof Channel | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!chatClient) {
      console.log('Chat client not initialized');
      return;
    }

    // Get the first channel or create a default one
    const loadChannel = async () => {
      try {
        console.log('Loading channels...');
        const channels = await chatClient.queryChannels(
          { type: 'team' },
          { last_message_at: -1 },
          { limit: 1 }
        );

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
    <div className="h-[calc(100vh-4rem)]">
      <Chat client={chatClient} theme="str-chat__theme-light">
        <Channel channel={activeChannel}>
          <Window>
            <ChannelHeader />
            <MessageList />
            <MessageInput />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
}