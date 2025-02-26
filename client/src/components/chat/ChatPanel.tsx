import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPublicRoom } from "./ChatPublicRoom";
import { ChatPrivateList } from "./ChatPrivateList";
import { ChatGroupList } from "./ChatGroupList";
import { ChatRoom as ChatRoomType } from "@shared/schema";
import { ChatProvider } from "./ChatProvider";
import { ChatRoom } from "./ChatRoom";

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState("public");
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomType | null>(null);

  const handleRoomSelect = (room: ChatRoomType) => {
    setSelectedRoom(room);
  };

  const handleBack = () => {
    setSelectedRoom(null);
  };

  return (
    <ChatProvider>
      <div className="flex h-full flex-col">
        {selectedRoom ? (
          <ChatRoom room={selectedRoom} onBack={handleBack} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <div className="border-b px-4 py-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="public">Public</TabsTrigger>
                <TabsTrigger value="private">Private</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-auto">
              <TabsContent value="public" className="h-full m-0">
                <ChatPublicRoom onSelectRoom={handleRoomSelect} />
              </TabsContent>
              <TabsContent value="private" className="h-full m-0">
                <ChatPrivateList onSelectRoom={handleRoomSelect} />
              </TabsContent>
              <TabsContent value="groups" className="h-full m-0">
                <ChatGroupList onSelectRoom={handleRoomSelect} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </ChatProvider>
  );
}