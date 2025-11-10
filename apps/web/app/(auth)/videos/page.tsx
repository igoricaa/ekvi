"use client";

import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";
import { VideoList } from "@/components/video/video-list";
import { VideoPlayer } from "@/components/video/video-player";
import { VideoUploader } from "@/components/video/video-uploader";

export default function VideosPage() {
  const [selectedVideoId, setSelectedVideoId] = useState<Id<"videos"> | null>(
    null
  );
  const [showUploader, setShowUploader] = useState(false);

  const handleUploadSuccess = (videoId: Id<"videos">) => {
    setShowUploader(false);
    setSelectedVideoId(videoId);
  };

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
          <p className="mt-2 text-muted-foreground">
            Upload and manage your video content
          </p>
        </div>

        {/* Upload Section */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Upload New Video</h2>
          {showUploader ? (
            <div className="space-y-4">
              <VideoUploader onSuccess={handleUploadSuccess} />
              <button
                type="button"
                onClick={() => setShowUploader(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start Upload
            </button>
          )}
        </div>

        {/* Player Section */}
        {selectedVideoId && (
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Now Playing</h2>
              <button
                type="button"
                onClick={() => setSelectedVideoId(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <VideoPlayer videoId={selectedVideoId} />
          </div>
        )}

        {/* Videos List */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Your Videos</h2>
          <VideoList onVideoSelect={setSelectedVideoId} />
        </div>
      </div>
    </div>
  );
}
