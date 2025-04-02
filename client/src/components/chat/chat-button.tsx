import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="p-0 w-[400px]">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Chat</h2>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <p className="text-sm text-muted-foreground">
                Chat functionality has been disabled in this version.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}