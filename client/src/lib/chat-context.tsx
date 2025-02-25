import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StreamChat } from 'stream-chat';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import type { DefaultStreamChatGenerics } from 'stream-chat-react/dist/types/types';

type ChatContextType = {
  chatClient: StreamChat<DefaultStreamChatGenerics> | null;
  loading: boolean;
  error: Error | null;
};

const ChatContext = createContext<ChatContextType>({
  chatClient: null,
  loading: true,
  error: null
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatClient, setChatClient] = useState<StreamChat<DefaultStreamChatGenerics> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  // Only fetch token if user is logged in
  const { data: chatToken } = useQuery({
    queryKey: ['/api/chat/token', user?.id],
    enabled: !!user,
  });

  useEffect(() => {
    let client: StreamChat<DefaultStreamChatGenerics> | null = null;

    const initChat = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (!chatToken) {
        return;
      }

      const apiKey = import.meta.env.VITE_STREAM_API_KEY;
      if (!apiKey) {
        setError(new Error('Stream API key not configured'));
        setLoading(false);
        return;
      }

      try {
        if (chatClient) {
          await chatClient.disconnectUser();
          setChatClient(null);
        }

        client = StreamChat.getInstance<DefaultStreamChatGenerics>(apiKey);
        const streamRole = user.role === 'admin' ? 'admin' : 'user';

        const userData = {
          id: user.id.toString(),
          name: user.username,
          role: streamRole
        };

        await client.connectUser(userData, chatToken.token);
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