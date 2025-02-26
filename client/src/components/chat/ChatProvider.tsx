import { ReactNode } from 'react';
import { Chat, StreamChat } from 'stream-chat-react';
import { chatClient } from '@/lib/stream-chat';
import '@stream-io/stream-chat-css/dist/css/index.css';

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  return (
    <Chat client={chatClient}>
      {children}
    </Chat>
  );
}
