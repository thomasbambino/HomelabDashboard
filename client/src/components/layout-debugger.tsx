import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
            <Label>Horizontal Padding (px)</Label>
            <Slider
              defaultValue={[32]}
              max={200}
              step={4}
              onValueChange={([value]) => onPaddingChange(value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Vertical Padding (px)</Label>
            <Slider
              defaultValue={[24]}
              max={200}
              step={4}
              onValueChange={([value]) => onVerticalPaddingChange(value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Content Width (px)</Label>
            <Slider
              defaultValue={[1400]}
              min={800}
              max={2000}
              step={50}
              onValueChange={([value]) => onWidthChange(value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}