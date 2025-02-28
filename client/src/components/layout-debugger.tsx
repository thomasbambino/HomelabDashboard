import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LayoutDebuggerProps {
  onPaddingChange: (value: number) => void;
  onWidthChange: (value: number) => void;
  onVerticalPaddingChange: (value: number) => void;
}

export function LayoutDebugger({ onPaddingChange, onWidthChange, onVerticalPaddingChange }: LayoutDebuggerProps) {
  const { toast } = useToast();
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const [horizontalValue, setHorizontalValue] = useState(settings?.layout_horizontal_padding ?? 32);
  const [verticalValue, setVerticalValue] = useState(settings?.layout_vertical_padding ?? 24);
  const [widthValue, setWidthValue] = useState(settings?.layout_max_width ?? 1400);

  useEffect(() => {
    if (settings) {
      setHorizontalValue(settings.layout_horizontal_padding);
      setVerticalValue(settings.layout_vertical_padding);
      setWidthValue(settings.layout_max_width);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { layout_horizontal_padding: number; layout_vertical_padding: number; layout_max_width: number }) => {
      const res = await apiRequest("PATCH", "/api/settings", { id: 1, ...data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save layout settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!settings?.show_layout_debugger) {
    return null;
  }

  const saveLayoutSettings = (horizontal: number, vertical: number, width: number) => {
    updateSettingsMutation.mutate({
      layout_horizontal_padding: horizontal,
      layout_vertical_padding: vertical,
      layout_max_width: width,
    });
  };

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
              defaultValue={[horizontalValue]}
              max={200}
              step={4}
              value={[horizontalValue]}
              onValueChange={([value]) => {
                setHorizontalValue(value);
                onPaddingChange(value);
                saveLayoutSettings(value, verticalValue, widthValue);
              }}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Vertical Padding</Label>
              <span className="text-sm text-muted-foreground">{verticalValue}px</span>
            </div>
            <Slider
              defaultValue={[verticalValue]}
              max={200}
              step={4}
              value={[verticalValue]}
              onValueChange={([value]) => {
                setVerticalValue(value);
                onVerticalPaddingChange(value);
                saveLayoutSettings(horizontalValue, value, widthValue);
              }}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Max Content Width</Label>
              <span className="text-sm text-muted-foreground">{widthValue}px</span>
            </div>
            <Slider
              defaultValue={[widthValue]}
              min={800}
              max={2000}
              step={50}
              value={[widthValue]}
              onValueChange={([value]) => {
                setWidthValue(value);
                onWidthChange(value);
                saveLayoutSettings(horizontalValue, verticalValue, value);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}