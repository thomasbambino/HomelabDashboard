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

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatClient, setChatClient] = useState<StreamChat<DefaultStreamChatGenerics> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  // Only fetch token if user is logged in
  const { data: chatToken, error: tokenError } = useQuery({
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

      console.log('Chat token response:', chatToken);

      if (tokenError) {
        console.error('Error fetching chat token:', tokenError);
        setError(new Error('Failed to get chat token'));
        setLoading(false);
        return;
      }

      if (!chatToken) {
        console.log('Waiting for chat token...');
        return;
      }

      const apiKey = import.meta.env.VITE_STREAM_API_KEY;
      console.log('Environment variables:', {
        VITE_STREAM_API_KEY: apiKey,
        hasKey: !!apiKey,
        user: {
          id: user.id,
          id_type: typeof user.id,
          id_string: user.id.toString()
        },
        token: chatToken.token
      });

      if (!apiKey) {
        console.error('Stream API key not found');
        setError(new Error('Stream API key not configured'));
        setLoading(false);
        return;
      }

      try {
        console.log('Initializing Stream Chat client with API key:', apiKey);
        client = StreamChat.getInstance<DefaultStreamChatGenerics>(apiKey);

        // Map application roles to Stream Chat roles
        const streamRole = user.role === 'admin' ? 'admin' : 'user';

        const userData = {
          id: user.id.toString(), // Ensure ID is always a string
          name: user.username,
          role: streamRole // Use the mapped role
        };

        console.log('Connecting user:', { 
          userId: userData.id,
          username: userData.name,
          role: userData.role
        });

        // Clear any existing client connection first
        if (chatClient) {
          await chatClient.disconnectUser();
          setChatClient(null);
        }

        await client.connectUser(userData, chatToken.token);

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
  }, [user, chatToken, tokenError]);

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