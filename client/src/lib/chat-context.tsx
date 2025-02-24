import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StreamChat } from 'stream-chat';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import type { DefaultStreamChatGenerics } from 'stream-chat';

type ChatContextType = {
  chatClient: StreamChat<DefaultStreamChatGenerics> | null;
  loading: boolean;
  error: Error | null;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatClient, setChatClient] = useState<StreamChat<DefaultStreamChatGenerics> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const { data: chatToken } = useQuery({
    queryKey: ['/api/chat/token'],
    enabled: !!user,
  });

  useEffect(() => {
    let client: StreamChat<DefaultStreamChatGenerics> | null = null;

    const initChat = async () => {
      if (!user) {
        console.log('No user logged in');
        setLoading(false);
        return;
      }

      if (!chatToken) {
        console.log('Waiting for chat token...');
        return;
      }

      const apiKey = import.meta.env.VITE_STREAM_API_KEY;
      if (!apiKey) {
        console.error('Stream API key not found');
        setError(new Error('Stream API key not configured'));
        setLoading(false);
        return;
      }

      try {
        console.log('Initializing Stream Chat client');
        client = StreamChat.getInstance<DefaultStreamChatGenerics>(apiKey);

        const userId = user.id.toString();
        console.log('Connecting user to Stream Chat:', {
          userId,
          username: user.username,
          token: chatToken.token
        });

        await client.connectUser(
          {
            id: userId,
            name: user.username,
          },
          chatToken.token
        );

        console.log('Successfully connected to Stream Chat');
        setChatClient(client);
        setError(null);
      } catch (error) {
        console.error('Error connecting to Stream Chat:', error);
        setError(error instanceof Error ? error : new Error('Failed to connect to chat'));
        if (client) {
          client.disconnectUser();
        }
      } finally {
        setLoading(false);
      }
    };

    initChat();

    return () => {
      if (client) {
        console.log('Cleaning up Stream Chat client');
        client.disconnectUser().then(() => {
          setChatClient(null);
        });
      }
    };
  }, [user, chatToken]);

  return (
    <ChatContext.Provider value={{ chatClient, loading, error }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}