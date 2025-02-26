import { ReactNode, useEffect, useState } from 'react';
import { Chat } from 'stream-chat-react';
import { chatClient } from '@/lib/stream-chat';
import { useAuth } from '@/hooks/use-auth';
import { initializeStreamChatClient } from '@/lib/stream-chat';
import 'stream-chat-react/dist/css/v2/index.css';

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (user && !isInitialized) {
      initializeStreamChatClient(user.id.toString())
        .then(() => {
          setIsInitialized(true);
        })
        .catch((error) => {
          console.error('Failed to initialize Stream Chat:', error);
        });
    }
  }, [user, isInitialized]);

  if (!user || !isInitialized) {
    return <div>Loading chat...</div>;
  }

  return (
    <Chat client={chatClient}>
      {children}
    </Chat>
  );
}