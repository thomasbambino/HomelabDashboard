import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema";

interface LayoutDebuggerProps {
  onPaddingChange: (value: number) => void;
  onWidthChange: (value: number) => void;
  onVerticalPaddingChange: (value: number) => void;
}

export function LayoutDebugger({ onPaddingChange, onWidthChange, onVerticalPaddingChange }: LayoutDebuggerProps) {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const [horizontalValue, setHorizontalValue] = useState(32);
  const [verticalValue, setVerticalValue] = useState(24);
  const [widthValue, setWidthValue] = useState(1400);

  if (!settings?.show_layout_debugger) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Layout Debugger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Horizontal Padding</Label>
              <span className="text-sm text-muted-foreground">{horizontalValue}px</span>
            </div>
            <Slider
              defaultValue={[32]}
              max={200}
              step={4}
              value={[horizontalValue]}
              onValueChange={([value]) => {
                setHorizontalValue(value);
                onPaddingChange(value);
              }}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Vertical Padding</Label>
              <span className="text-sm text-muted-foreground">{verticalValue}px</span>
            </div>
            <Slider
              defaultValue={[24]}
              max={200}
              step={4}
              value={[verticalValue]}
              onValueChange={([value]) => {
                setVerticalValue(value);
                onVerticalPaddingChange(value);
              }}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Max Content Width</Label>
              <span className="text-sm text-muted-foreground">{widthValue}px</span>
            </div>
            <Slider
              defaultValue={[1400]}
              min={800}
              max={2000}
              step={50}
              value={[widthValue]}
              onValueChange={([value]) => {
                setWidthValue(value);
                onWidthChange(value);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}