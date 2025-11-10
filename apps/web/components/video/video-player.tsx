"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import MuxPlayer from "@mux/mux-player-react";
import { useQuery } from "convex/react";

type VideoPlayerProps = {
  videoId: Id<"videos">;
};

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  const video = useQuery(api.mux.queries.getVideoById, { videoId });

  if (!video) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">Loading video...</p>
      </div>
    );
  }

  if (video.status === "waiting_for_upload") {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">
          Waiting for video upload...
        </p>
      </div>
    );
  }

  if (video.status === "processing") {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted">
        <div className="text-center">
          <p className="text-sm font-medium">Processing video...</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This may take a few minutes
          </p>
        </div>
      </div>
    );
  }

  if (video.status === "error") {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10">
        <div className="text-center">
          <p className="text-sm font-medium text-destructive">Upload failed</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {video.errorMessage || "An error occurred during processing"}
          </p>
        </div>
      </div>
    );
  }

  if (video.status !== "ready" || !video.muxPlaybackId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">Video not ready</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg">
      <MuxPlayer
        playbackId={video.muxPlaybackId}
        metadata={{
          video_id: videoId,
          video_title: video.title,
        }}
        streamType="on-demand"
        accentColor="#000000"
      />
    </div>
  );
}
