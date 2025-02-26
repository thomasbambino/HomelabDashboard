import { StreamChat } from 'stream-chat';

if (!import.meta.env.VITE_STREAM_API_KEY) {
  throw new Error('VITE_STREAM_API_KEY is not defined');
}

const chatClient = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY);

export async function initializeStreamChatClient(userId: string) {
  try {
    const response = await fetch('/api/chat/token');
    if (!response.ok) {
      throw new Error('Failed to get chat token');
    }
    const { token } = await response.json();

    return chatClient.connectUser(
      {
        id: userId,
        name: userId,
      },
      token
    );
  } catch (error) {
    console.error('Error initializing Stream Chat:', error);
    throw error;
  }
}

export { chatClient };