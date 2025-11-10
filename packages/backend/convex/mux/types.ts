import { v } from "convex/values";

/**
 * Mux Integration - Shared Types
 *
 * Shared type definitions and constants used across mux modules.
 * This file has no runtime dependencies (V8 isolate).
 */

/**
 * Video Status Type
 *
 * Represents the lifecycle of a video upload and processing.
 */
export const videoStatusValidator = v.union(
  v.literal("waiting_for_upload"),
  v.literal("uploading"),
  v.literal("processing"),
  v.literal("ready"),
  v.literal("error")
);

export type VideoStatus =
  | "waiting_for_upload"
  | "uploading"
  | "processing"
  | "ready"
  | "error";
