# File Upload Patterns

Reusable patterns for file uploads across EKVI platform.

---

## Pattern 1: Profile Image Upload

**Use Case:** Single image upload with preview and confirmation

**Components:** Next.js Image, Dialog, File input, DropdownMenu

**Flow:** Select → Preview → Confirm → Upload → Update

**Implementation:** See `apps/web/app/(auth)/settings/page.tsx`

**Reusable For:**
- Coach intro photo
- Exercise thumbnails
- Program thumbnails
- Certificate uploads

---

## Pattern 2: Direct Convex Storage Upload

### Backend

**Generate upload URL:**
```typescript
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});
```

**Store metadata:**
```typescript
await ctx.db.insert("files", {
  storageId,
  fileName: "profile.jpg",
  fileType: "image",
  width: 1920,
  height: 1080,
  mimeType: "image/jpeg",
});
```

**Generate URL on-demand:**
```typescript
const url = await ctx.storage.getUrl(storageId);
```

### Frontend

**Upload flow:**
```typescript
// 1. Get upload URL
const uploadUrl = await generateUploadUrl();

// 2. Upload file
const result = await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": file.type },
  body: file,
});

// 3. Extract storageId
const { storageId } = await result.json();

// 4. Update record
await updateProfile({ profileImage: storageId });
```

**File Size Limits:** 5MB for images (configurable)

**Accepted Types:** image/jpeg, image/png, image/webp

---

## Best Practices

### 1. Always Preview Before Upload

- Show user what they selected
- Prevent accidental uploads
- Allow cancellation

**Why:** Better UX, prevents mistakes, standard modern app pattern

### 2. Never Store URLs Directly

- URLs expire
- Generate on-demand via `ctx.storage.getUrl()`
- Store only `storageId`

**Why:** Fresh URLs always, no stale data

### 3. Clean Up Old Files

- Delete old file when updating
- Use `ctx.storage.delete(storageId)`
- Prevents orphaned files

**Example:**
```typescript
if (profile.profileImage) {
  await ctx.storage.delete(profile.profileImage);
}
```

### 4. Validate on Both Sides

- Frontend: File type and size
- Backend: Re-validate before storing metadata

**Why:** Security, prevent bad uploads, better errors

### 5. Show Loading States

- Upload progress (if available)
- Disable buttons during upload
- Clear success/error feedback

**Why:** Better UX, prevents double uploads, clear communication

---
