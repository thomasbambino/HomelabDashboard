import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, X } from "lucide-react";
import { useState } from "react";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onClear: () => void;
  className?: string;
}

export function ImageUpload({ value, onChange, onClear, className }: ImageUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG or PNG image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      onChange(data.url);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      {value ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
          <img
            src={value}
            alt="Uploaded image"
            className="h-full w-full object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex aspect-video w-full cursor-pointer items-center justify-center rounded-lg border border-dashed">
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {uploading ? "Uploading..." : "Click to upload"}
            </span>
          </div>
          <Input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
