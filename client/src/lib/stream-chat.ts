import { StreamChat } from 'stream-chat';

if (!import.meta.env.VITE_STREAM_API_KEY) {
  throw new Error('VITE_STREAM_API_KEY is not defined');
}

// Create a singleton instance of the Stream Chat client
const chatClient = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY);

export async function initializeStreamChatClient(userId: string) {
  try {
    // Disconnect any existing user first
    chatClient.disconnectUser();

    const response = await fetch('/api/chat/token');
    if (!response.ok) {
      throw new Error('Failed to get chat token');
    }
    const { token } = await response.json();

    // Connect the user to Stream Chat
    await chatClient.connectUser(
      {
        id: userId,
        name: userId,
      },
      token
    );

    return chatClient;
  } catch (error) {
    console.error('Error initializing Stream Chat:', error);
    throw error;
  }
}

export { chatClient };