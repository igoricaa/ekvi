# Mux Video Integration - Implementation Guide

**Project:** EKVI (EKVILIBRIJUM)
**Task:** IZA-91 - Integrate Mux for Video Upload and Streaming
**Status:** In Progress
**Last Updated:** 2025-11-07

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Status](#implementation-status)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Backend Implementation](#backend-implementation)
6. [Webhook Integration](#webhook-integration)
7. [Frontend Integration](#frontend-integration)
8. [Testing Guide](#testing-guide)
9. [Deployment](#deployment)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting](#troubleshooting)
12. [Future Enhancements](#future-enhancements)

---

## Overview

This document describes the complete Mux video integration for the EKVI platform. Mux provides video hosting, encoding, streaming, and analytics infrastructure.

### Key Features

- **Direct Upload**: Videos upload directly from browser to Mux (no server transit)
- **Adaptive Streaming**: Automatic quality adjustment based on viewer's bandwidth
- **Webhook-Driven**: Real-time status updates via Mux webhooks
- **Resumable Uploads**: Network interruptions don't lose progress
- **Thumbnail Generation**: Automatic thumbnail creation for previews

### Use Cases

- Coach intro videos (coachProfiles.introVideoId)
- Program preview videos (programs.previewVideoId)
- Workout instruction videos (workouts.videoId)
- Exercise demonstrations (exercises.videoId)

---

## Implementation Status

### Phase 1: Backend Infrastructure ✅ COMPLETE

**Completed:** 2025-11-07

**Achievements:**
- [x] Database schema with `videos` table and 4 indexes
- [x] Modular backend structure (6 files in `convex/mux/` directory)
- [x] Direct upload URL generation (`createDirectUpload` action)
- [x] Webhook signature verification (solved Node.js crypto module issue)
- [x] Video lifecycle event handlers (upload → processing → ready/error)
- [x] Query functions (`getVideoById`, `listUserVideos`)
- [x] Mutation functions (`insertVideo`, `deleteVideo`, `updateVideoMetadata`)
- [x] Mux asset cleanup on video deletion
- [x] Enhanced error handling with categorization

**Technical Achievement:**
Solved critical **Convex runtime separation issue**. Mux SDK requires Node.js crypto module, but Convex HTTP handlers run in V8 isolate. Implemented novel two-tier architecture where HTTP handler (V8) delegates signature verification to Node.js action, preventing bundling errors.

**Files Implemented:**
```
packages/backend/convex/mux/
├── types.ts        # Shared type definitions (video status validator)
├── actions.ts      # Mux API calls - "use node" runtime
├── queries.ts      # Read operations - V8 runtime
├── mutations.ts    # Write operations - V8 runtime
├── webhooks.ts     # Event handlers - V8 runtime
└── webhook.ts      # HTTP handler - V8 runtime

packages/backend/convex/
├── http.ts         # Route registration
└── schema.ts       # Videos table definition
```

### Phase 2: Frontend UI 🚧 NEXT

**Target:** Week of Nov 11-15, 2025

**Planned Features:**
- [ ] Video upload component with drag-and-drop
- [ ] Mux Uploader React integration
- [ ] Video player with Mux Player React
- [ ] Video management dashboard
- [ ] Real-time progress tracking
- [ ] Error handling UI
- [ ] Thumbnail display
- [ ] Video metadata editing

**Dependencies:** All met ✅
- Mux packages installed (`@mux/mux-uploader-react`, `@mux/mux-player-react`)
- Backend APIs ready
- Convex React integration working

### Phase 3: Advanced Features 📅 FUTURE

**Planned:**
- Signed playback URLs (private videos)
- Video analytics (Mux Data integration)
- Subtitles & captions
- Thumbnail customization
- Batch operations
- Performance optimization

---

## Architecture

### Upload Flow

```
┌─────────────┐
│   Browser   │
│   (User)    │
└──────┬──────┘
       │
       │ 1. Request Upload URL
       ▼
┌─────────────────┐
│  Convex Action  │
│  createUpload() │
└────────┬────────┘
         │
         │ 2. Create Upload
         ▼
┌─────────────────┐      3. Return Upload URL
│   Mux API       │◄─────────────┐
└────────┬────────┘              │
         │                        │
         │ 4. Store Upload ID    │
         ▼                        │
┌─────────────────┐              │
│  Convex DB      │              │
│  videos table   │              │
└─────────────────┘              │
                                  │
         ┌────────────────────────┘
         │
         │ 5. Upload Video File
         ▼
┌─────────────────┐
│   Mux CDN       │
└────────┬────────┘
         │
         │ 6. Send Webhooks
         ▼
┌─────────────────┐
│ Convex Webhook  │
│    Handler      │
└────────┬────────┘
         │
         │ 7. Update Status
         ▼
┌─────────────────┐
│  Convex DB      │
│  videos table   │
└─────────────────┘
```

### Video Lifecycle States

1. **`waiting_for_upload`** - Upload URL created, awaiting file
2. **`uploading`** - File transfer in progress (client-side only)
3. **`processing`** - Mux is encoding the video
4. **`ready`** - Video ready for playback
5. **`error`** - Upload or processing failed

### Database Schema

The `videos` table (defined in `packages/backend/convex/schema.ts`) stores:

```typescript
videos: {
  uploadedBy: v.id("userProfiles"),        // Owner

  // Mux identifiers
  muxAssetId: v.string(),                  // From webhook
  muxUploadId: v.optional(v.string()),     // From upload creation
  muxPlaybackId: v.optional(v.string()),   // From asset.ready webhook

  // Status tracking
  status: 'waiting_for_upload' | 'uploading' | 'processing' | 'ready' | 'error',

  // Metadata
  title: v.string(),
  description: v.optional(v.string()),

  // Video properties (from webhooks)
  duration: v.optional(v.number()),         // Seconds
  aspectRatio: v.optional(v.string()),      // e.g., "16:9"
  thumbnailUrl: v.optional(v.string()),     // Auto-generated by Mux

  // Error handling
  errorMessage: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
}
```

**Indexes:**
- `by_uploadedBy` - Find user's videos
- `by_status` - Filter by processing status
- `by_muxAssetId` - Webhook lookups
- `by_muxUploadId` - Upload status checks

---

## Prerequisites

### Mux Account Setup

1. **Create Account**: https://dashboard.mux.com/signup
2. **Get API Credentials**:
   - Navigate to Settings → Access Tokens
   - Create token with "Mux Video" permissions
   - Save `Token ID` and `Token Secret`
3. **Generate Webhook Secret**:
   - Navigate to Settings → Webhooks
   - Create webhook signing secret
   - Save the secret key

### Environment Variables

**Backend Variables** (Convex functions need these):

Add to **Convex Dashboard** (Settings → Environment Variables):
- `MUX_TOKEN_ID` - Your Mux API token ID
- `MUX_TOKEN_SECRET` - Your Mux API token secret
- `MUX_WEBHOOK_SIGNING_SECRET` - Your webhook signing secret

**OR** for local development, add to `packages/backend/.env.local`:
```bash
MUX_TOKEN_ID=your-token-id
MUX_TOKEN_SECRET=your-token-secret
MUX_WEBHOOK_SIGNING_SECRET=your-webhook-secret
```

**Frontend Variables** (Phase 3 - Analytics only):

Add to `apps/web/.env.local`:
```bash
# Only needed if using Mux Data (analytics)
NEXT_PUBLIC_MUX_ENV_KEY=your-env-key
```

**Note:** Root `.env.local` is NOT needed for Mux integration.

---

## Backend Implementation

### Modular Structure

Backend implementation is split across 6 files in `packages/backend/convex/mux/`:

- **`types.ts`** - Shared type definitions
- **`actions.ts`** - Mux API calls (Node.js runtime with "use node")
- **`queries.ts`** - Read operations (V8 runtime)
- **`mutations.ts`** - Write operations (V8 runtime)
- **`webhooks.ts`** - Event handlers (V8 runtime)
- **`webhook.ts`** - HTTP handler (V8 runtime)

**Why modular?** Convex has runtime constraints - HTTP handlers run in V8 isolate (no Node.js APIs), but Mux SDK requires Node.js crypto module. Separating concerns allows us to use "use node" only where needed (actions.ts) while keeping other functions in the faster V8 runtime.

### Key Implementations

#### 1. Create Direct Upload Action

File: [`packages/backend/convex/mux/actions.ts`](../packages/backend/convex/mux/actions.ts)

Creates upload URL and stores initial video record. Uses Node.js runtime to call Mux API.

**Key steps:**
1. Authenticate user and get profile
2. Call Mux API to create direct upload
3. Store video record in database (status: "waiting_for_upload")
4. Return upload URL to client

#### 2. Query Functions

File: [`packages/backend/convex/mux/queries.ts`](../packages/backend/convex/mux/queries.ts)

- `getVideoById` - Fetch single video by ID
- `listUserVideos` - List user's videos with optional status filter

#### 3. Mutation Functions

File: [`packages/backend/convex/mux/mutations.ts`](../packages/backend/convex/mux/mutations.ts)

- `insertVideo` (internal) - Create video record
- `updateVideoMetadata` - Update title/description
- `deleteVideo` - Delete video (with Mux cleanup)

#### 4. Webhook Event Handlers

File: [`packages/backend/convex/mux/webhooks.ts`](../packages/backend/convex/mux/webhooks.ts)

- `handleUploadAssetCreated` - Links Mux asset to video record
- `handleAssetReady` - Updates video with playback ID, thumbnail, duration
- `handleAssetErrored` - Marks video as failed with error message

---

## Webhook Integration

### HTTP Handler Registration

File: [`packages/backend/convex/http.ts`](../packages/backend/convex/http.ts)

Registers the webhook route in the HTTP router:

```typescript
import { httpRouter } from "convex/server";
import { muxWebhookHandler } from "./mux/webhook";

const http = httpRouter();

// Existing auth routes
authComponent.registerRoutes(http, createAuth);

// Mux webhook
http.route({
  path: "/mux/webhook",
  method: "POST",
  handler: muxWebhookHandler,
});

export default http;
```

### Webhook Handler Implementation

File: [`packages/backend/convex/mux/webhook.ts`](../packages/backend/convex/mux/webhook.ts)

Two-tier architecture:
1. **HTTP handler** (V8 runtime) - Receives webhook, extracts body and headers
2. **Verification action** (Node.js runtime) - Verifies signature using Mux SDK

**Why two tiers?** HTTP handlers run in V8 isolate (no Node.js APIs), but Mux SDK's `unwrap()` method requires Node.js crypto module. The HTTP handler delegates signature verification to a Node.js action.

**Key features:**
- Single source of truth for signature validation (`mux.webhooks.unwrap()`)
- Routes events to appropriate handlers (`handleUploadAssetCreated`, `handleAssetReady`, `handleAssetErrored`)
- Enhanced error categorization (server config errors vs client request errors)
- Returns 200 OK even on errors (prevents unnecessary Mux retries)

---

## Frontend Integration

### Installation

```bash
cd apps/web
pnpm add @mux/mux-uploader-react
```

### Basic Uploader Component

**File:** `apps/web/components/video/video-uploader.tsx`

```tsx
"use client";

import { useMutation } from "convex/react";
import { api } from "backend/convex/_generated/api";
import MuxUploader from "@mux/mux-uploader-react";
import { useState } from "react";

interface VideoUploaderProps {
  onSuccess?: (videoId: string) => void;
  onError?: (error: string) => void;
}

export function VideoUploader({ onSuccess, onError }: VideoUploaderProps) {
  const createUpload = useMutation(api.mux.createDirectUpload);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateUpload = async () => {
    setIsGenerating(true);
    try {
      const result = await createUpload({
        title: "Untitled Video",
        description: "",
      });

      setUploadUrl(result.uploadUrl);
    } catch (error) {
      onError?.(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {!uploadUrl ? (
        <button
          onClick={handleGenerateUpload}
          disabled={isGenerating}
          className="btn-primary"
        >
          {isGenerating ? "Preparing..." : "Start Upload"}
        </button>
      ) : (
        <MuxUploader
          endpoint={uploadUrl}
          onSuccess={() => {
            onSuccess?.("video-uploaded");
            setUploadUrl(null);
          }}
          onError={(event) => {
            onError?.(event.detail);
          }}
        />
      )}
    </div>
  );
}
```

### Video Player Component

**File:** `apps/web/components/video/video-player.tsx`

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "backend/convex/_generated/api";
import { Id } from "backend/convex/_generated/dataModel";
import MuxPlayer from "@mux/mux-player-react";

interface VideoPlayerProps {
  videoId: Id<"videos">;
}

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  const video = useQuery(api.mux.getVideoById, { videoId });

  if (!video) {
    return <div>Loading...</div>;
  }

  if (video.status === "processing") {
    return <div>Processing video...</div>;
  }

  if (video.status === "error") {
    return <div>Error: {video.errorMessage}</div>;
  }

  if (video.status !== "ready" || !video.muxPlaybackId) {
    return <div>Video not ready</div>;
  }

  return (
    <MuxPlayer
      playbackId={video.muxPlaybackId}
      metadata={{
        video_id: videoId,
        video_title: video.title,
      }}
      accentColor="#000000"
    />
  );
}
```

---

## Testing Guide

### Manual Testing Checklist

#### Backend Tests

- [ ] **Create Upload URL**
  ```bash
  # Call createDirectUpload via Convex dashboard
  # Verify: Returns uploadUrl, videoId, muxUploadId
  # Verify: DB record created with status='waiting_for_upload'
  ```

- [ ] **Upload Video**
  ```bash
  # Use curl or Mux dashboard to upload test video
  curl -X PUT "UPLOAD_URL" \
    -H "Content-Type: video/mp4" \
    --data-binary "@test-video.mp4"
  ```

- [ ] **Webhook: asset_created**
  ```bash
  # Verify: DB record updated with muxAssetId
  # Verify: Status changed to 'processing'
  ```

- [ ] **Webhook: asset_ready**
  ```bash
  # Verify: DB record updated with muxPlaybackId
  # Verify: Status changed to 'ready'
  # Verify: Duration, aspectRatio, thumbnailUrl populated
  ```

- [ ] **Delete Video**
  ```bash
  # Call deleteVideo mutation
  # Verify: DB record deleted
  # Verify: Mux asset deleted (check Mux dashboard)
  ```

#### Frontend Tests

- [ ] **Upload Component**
  - Renders correctly
  - Generates upload URL on mount
  - Shows upload progress
  - Calls onSuccess when complete
  - Handles errors gracefully

- [ ] **Player Component**
  - Loads video by ID
  - Shows loading state
  - Plays video with Mux Player
  - Handles error states

### Webhook Testing

Use Mux Dashboard webhook testing tool:

1. Go to Settings → Webhooks
2. Select your webhook endpoint
3. Click "Send Test Event"
4. Choose event type (asset_created, asset_ready, etc.)
5. Verify webhook received and processed

### Edge Case Testing

- [ ] **Abandoned Upload**
  - Create upload URL but never upload
  - Verify: Status remains 'waiting_for_upload'
  - Verify: No errors in logs

- [ ] **Duplicate Webhooks**
  - Send same webhook twice
  - Verify: Idempotent (no duplicate updates)

- [ ] **Invalid Signature**
  - Send webhook with wrong signature
  - Verify: Rejected with 400 error

- [ ] **Missing Upload Record**
  - Send webhook for non-existent upload
  - Verify: Logged as warning, doesn't crash

---

## Deployment

### 1. Configure Mux Dashboard

1. **Create Webhook Endpoint**:
   - URL: `https://YOUR_DEPLOYMENT.convex.site/mux/webhook`
   - Events: Select all `video.*` events
   - Save webhook signing secret

2. **Configure CORS** (if needed):
   - Add your domain to allowed origins
   - Or use wildcard `*` for development

### 2. Deploy to Convex

```bash
# From project root
pnpm --filter backend deploy

# Verify deployment
pnpm --filter backend convex deploy --dry-run
```

### 3. Add Environment Variables

Add to **Convex Dashboard** (Settings → Environment Variables):
- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_WEBHOOK_SIGNING_SECRET`

### 4. Test Webhook Endpoint

```bash
# Test webhook is publicly accessible
curl -X POST https://YOUR_DEPLOYMENT.convex.site/mux/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return 400 (missing signature) - this is expected
```

### 5. Verify Integration

1. Upload test video via frontend
2. Check Mux dashboard for asset creation
3. Verify webhook delivery in Mux dashboard
4. Confirm DB updates in Convex dashboard

---

## Security Considerations

### Webhook Security

✅ **Signature Verification**
- Always verify webhook signatures
- Use `mux.webhooks.unwrap()` method
- Never trust unverified webhooks

✅ **Idempotency**
- Handle duplicate webhook delivery
- Use unique IDs (muxUploadId, muxAssetId) as keys

✅ **Error Handling**
- Return 200 OK even on errors (prevent retries)
- Log errors for debugging
- Don't expose internal errors in response

### User Authorization

✅ **Ownership Validation**
- Verify user owns video before delete
- Check `uploadedBy` matches current user's profileId

✅ **Rate Limiting** (Future)
- Limit upload URL generation per user
- Implement upload quotas per tier

✅ **Input Validation**
- Validate title, description length
- Sanitize user inputs

### API Security

✅ **Credential Management**
- Store Mux credentials in environment variables
- Never commit credentials to git
- Use separate credentials for dev/prod

✅ **CORS Configuration**
- Use specific origins in production
- Avoid wildcard `*` in production

---

## Troubleshooting

### Common Issues

#### Upload URL Generation Fails

**Symptoms:** `createDirectUpload` throws error

**Causes:**
- Missing Mux credentials
- Invalid API token
- Network issues

**Solutions:**
```bash
# Verify credentials are set
echo $MUX_TOKEN_ID
echo $MUX_TOKEN_SECRET

# Test Mux API directly
curl https://api.mux.com/video/v1/uploads \
  -u "YOUR_TOKEN_ID:YOUR_TOKEN_SECRET"
```

#### Webhook Not Received

**Symptoms:** Video stuck in 'waiting_for_upload' or 'processing'

**Causes:**
- Webhook URL not configured in Mux
- Webhook endpoint not publicly accessible
- Signature verification failing

**Solutions:**
1. Check Mux dashboard webhook delivery logs
2. Verify webhook URL is correct
3. Test endpoint manually with curl
4. Check Convex logs for errors

#### Video Stays in Processing

**Symptoms:** Status never changes to 'ready'

**Causes:**
- Webhook not delivered
- Asset encoding failed
- Database update failed

**Solutions:**
1. Check Mux dashboard for asset status
2. Check webhook delivery logs
3. Manually trigger webhook from Mux dashboard
4. Check Convex logs for errors

#### Signature Verification Fails

**Symptoms:** Webhook returns 400 or signature error

**Causes:**
- Wrong webhook signing secret
- Body parsing issues
- Header formatting issues

**Solutions:**
1. Verify `MUX_WEBHOOK_SIGNING_SECRET` matches Mux dashboard
2. Ensure raw body is passed to `unwrap()`
3. Check webhook headers in Convex logs

### Debug Mode

Enable detailed logging:

```typescript
// In mux.ts
console.log("Upload created:", { uploadId, assetId });

// In http.ts webhook handler
console.log("Webhook received:", event.type, event.data);
```

---

## Future Enhancements

### Phase 2: UI Components (Next)

- Video upload interface with drag-and-drop
- Video management dashboard
- Progress tracking with real-time updates
- Thumbnail customization
- Video metadata editing

### Phase 3: Advanced Features

**Signed Playback URLs**
- Private videos with JWT authentication
- Time-limited access
- Domain restriction

**Subtitles & Captions**
- Upload subtitle files
- Multi-language support
- Auto-generated captions (Mux feature)

**Video Analytics**
- Integration with Mux Data
- View count tracking
- Quality of Experience metrics
- Engagement analytics

**Performance Optimization**
- Resolution tier limits (cost control)
- Custom transcoding presets
- CDN configuration
- Lazy loading strategies

### Phase 4: Advanced Workflows

**Batch Operations**
- Bulk video upload
- Batch metadata editing
- Mass delete functionality

**Video Processing**
- Thumbnail customization (time offset)
- Video clipping/trimming
- Chapter markers
- Multi-audio tracks

**Content Protection**
- DRM integration
- Watermarking
- Geographic restrictions

**Notification System**
- Email on video ready
- Push notifications
- Processing status updates
- Error alerts

---

## References

### Official Documentation

- Mux Direct Uploads: https://docs.mux.com/guides/direct-upload
- Mux Webhooks: https://docs.mux.com/webhook-reference
- Mux Node SDK: https://github.com/muxinc/mux-node-sdk
- Mux Player React: https://github.com/muxinc/elements
- Convex HTTP Actions: https://docs.convex.dev/functions/http-actions

### Internal Documentation

- Database Schema: `/packages/backend/convex/schema.ts`
- Auth Implementation: `/docs/AUTH_IMPLEMENTATION.md`
- Project Structure: `/CLAUDE.md`

### Support Resources

- Mux Support: https://mux.com/support
- Mux Community Slack: https://mux.com/slack
- Convex Discord: https://convex.dev/community

---

## Changelog

### 2025-11-07 - Initial Implementation
- Created backend actions (createDirectUpload, getVideoById, listUserVideos, deleteVideo)
- Implemented webhook handler for video lifecycle events
- Added video database schema and indexes
- Documentation created

### Future Updates
- Track implementation progress
- Document issues and resolutions
- Update best practices
