"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type VideoStatus =
  | "waiting_for_upload"
  | "uploading"
  | "processing"
  | "ready"
  | "error";

type VideoListProps = {
  status?: VideoStatus;
  onVideoSelect?: (videoId: Id<"videos">) => void;
};

const statusConfig = {
  waiting_for_upload: {
    label: "Waiting",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
  },
  uploading: {
    label: "Uploading",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  },
  processing: {
    label: "Processing",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  },
  ready: {
    label: "Ready",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  },
};

function formatDuration(seconds?: number): string {
  if (!seconds) {
    return "—";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoList({ status, onVideoSelect }: VideoListProps) {
  const videos = useQuery(api.mux.queries.listUserVideos, { status });
  const deleteVideo = useMutation(api.mux.mutations.deleteVideo);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Id<"videos"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (videoId: Id<"videos">) => {
    setVideoToDelete(videoId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!videoToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteVideo({ videoId: videoToDelete });
      setDeleteDialogOpen(false);
      setVideoToDelete(null);
    } catch (error) {
      console.error("Failed to delete video:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!videos) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading videos...</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No videos uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video: (typeof videos)[number]) => {
          const config = statusConfig[video.status as VideoStatus];

          return (
            <Card key={video._id} className="overflow-hidden">
              {/* Thumbnail */}
              <button
                type="button"
                className="relative aspect-video cursor-pointer bg-muted"
                onClick={() => onVideoSelect?.(video._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onVideoSelect?.(video._id);
                  }
                }}
              >
                {video.thumbnailUrl && video.status === "ready" ? (
                  <img
                    width={100}
                    height={100}
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      {config.label}
                    </span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute right-2 top-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${config.className}`}
                  >
                    {config.label}
                  </span>
                </div>
              </button>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-sm">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {video.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatDuration(video.duration)}</span>
                      {video.aspectRatio && <span>{video.aspectRatio}</span>}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteClick(video._id)}
                    className="shrink-0"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>

                {video.status === "error" && video.errorMessage && (
                  <p className="mt-2 text-xs text-destructive">
                    {video.errorMessage}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be
              undone and will remove the video from Mux.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
