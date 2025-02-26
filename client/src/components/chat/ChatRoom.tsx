import { Channel, MessageInput, MessageList, Window } from 'stream-chat-react';
import { chatClient } from '@/lib/stream-chat';
import { useEffect, useState } from 'react';
import { ChatRoom } from '@shared/schema';

interface ChatRoomProps {
  room: ChatRoom;
}

export function ChatRoom({ room }: ChatRoomProps) {
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    const channelId = `room-${room.id}`;
    const channel = chatClient.channel('messaging', channelId, {
      name: room.name,
      members: [chatClient.userID!],
    });

    channel.watch().then(() => {
      setChannel(channel);
    });

    return () => {
      channel.stopWatching();
    };
  }, [room]);

  if (!channel) {
    return <div>Loading chat...</div>;
  }

  return (
    <Channel channel={channel}>
      <Window>
        <MessageList />
        <MessageInput />
      </Window>
    </Channel>
  );
}
