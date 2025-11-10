"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import MuxUploader from "@mux/mux-uploader-react";
import { useAction } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type VideoUploaderProps = {
  onSuccess?: (videoId: Id<"videos">) => void;
  title?: string;
  description?: string;
};

export function VideoUploader({
  onSuccess,
  title = "Untitled Video",
  description,
}: VideoUploaderProps) {
  const createUpload = useAction(api.mux.actions.createDirectUpload);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<Id<"videos"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateUpload = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await createUpload({
        title,
        description,
      });

      setUploadUrl(result.uploadUrl);
      setVideoId(result.videoId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create upload";
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadSuccess = () => {
    if (videoId) {
      onSuccess?.(videoId);
    }
    // Reset state
    setUploadUrl(null);
    setVideoId(null);
  };

  const handleUploadError = () => {
    setError("Upload failed");
    setUploadUrl(null);
    setVideoId(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {uploadUrl ? (
        <div className="rounded-lg border bg-card p-4">
          <MuxUploader
            endpoint={uploadUrl}
            onSuccess={handleUploadSuccess}
            onError={handleUploadError}
          />
        </div>
      ) : (
        <Button
          onClick={handleGenerateUpload}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? "Preparing..." : "Upload Video"}
        </Button>
      )}
    </div>
  );
}
