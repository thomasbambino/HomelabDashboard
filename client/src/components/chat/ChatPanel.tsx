import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPublicRoom } from "./ChatPublicRoom";
import { ChatPrivateList } from "./ChatPrivateList";
import { ChatGroupList } from "./ChatGroupList";

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState("public");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto">
        <TabsContent value="public" className="h-full m-0">
          <ChatPublicRoom />
        </TabsContent>
        <TabsContent value="private" className="h-full m-0">
          <ChatPrivateList />
        </TabsContent>
        <TabsContent value="groups" className="h-full m-0">
          <ChatGroupList />
        </TabsContent>
      </div>
    </div>
  );
}
