import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StreamChat, Channel, ChannelSort } from 'stream-chat';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';

type ChatContextType = {
  chatClient: StreamChat | null;
  loading: boolean;
  error: Error | null;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const { data: chatToken } = useQuery({
    queryKey: ['/api/chat/token'],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || !chatToken) {
      console.log('Missing user or chat token:', { user: !!user, token: !!chatToken });
      return;
    }

    const apiKey = import.meta.env.VITE_STREAM_API_KEY;
    if (!apiKey) {
      console.error('Stream API key not found in environment variables');
      setError(new Error('Stream API key not configured'));
      setLoading(false);
      return;
    }

    console.log('Initializing Stream Chat client');
    const client = StreamChat.getInstance(apiKey);

    const connectUser = async () => {
      try {
        console.log('Connecting user to Stream Chat:', { userId: user.id, username: user.username });
        await client.connectUser(
          {
            id: user.id.toString(),
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
      } finally {
        setLoading(false);
      }
    };

    connectUser();

    return () => {
      console.log('Disconnecting Stream Chat client');
      client.disconnectUser();
      setChatClient(null);
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