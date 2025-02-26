import { Channel, MessageInput, MessageList, Window } from 'stream-chat-react';
import { useEffect, useState } from 'react';
import { ChatRoom as ChatRoomType } from '@shared/schema';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { chatClient } from '@/lib/stream-chat';

interface ChatRoomProps {
  room: ChatRoomType;
  onBack?: () => void;
}

export function ChatRoom({ room, onBack }: ChatRoomProps) {
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
    return <div className="flex items-center justify-center h-full">Loading chat...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-2 flex items-center">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <span className="font-medium">{room.name}</span>
      </div>
      <div className="flex-1">
        <Channel channel={channel}>
          <Window>
            <MessageList />
            <MessageInput />
          </Window>
        </Channel>
      </div>
    </div>
  );
}