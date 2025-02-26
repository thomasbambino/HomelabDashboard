import { StreamChat } from 'stream-chat';

const chatClient = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY);

export function initializeStreamChatClient(userId: string, userToken: string) {
  return chatClient.connectUser(
    {
      id: userId,
      name: userId,
    },
    userToken
  );
}

export { chatClient };
