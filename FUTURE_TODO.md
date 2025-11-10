# FUTURE TODO: Next.js 16 + Convex Architecture Strategy

## ✅ Decision: Next.js 16 is the Right Choice

After deep analysis, **Next.js 16 with Cache Components is perfect** for EKVI's use case:

- ✅ SEO-critical coach profiles and blog posts
- ✅ Partial Prerendering (PPR) for instant page loads
- ✅ Real-time authenticated app with Convex
- ✅ Best of both worlds: Static SEO + Real-time reactivity

---

## 🏗️ Architecture Strategy

### Route Structure

```
app/
├── (marketing)/          # Static/cached routes with SEO
│   ├── page.tsx         # Landing page (static shell + dynamic CTA)
│   ├── blog/            # Blog posts (use cache + revalidateTag)
│   │   └── [slug]/
│   │       └── page.tsx
│   └── coaches/         # Coach profiles (PPR with Suspense)
│       └── [slug]/
│           └── page.tsx # Static bio + streaming reviews/availability
│
├── (auth)/              # Authenticated app (dynamic, client-heavy)
│   ├── dashboard/       # Full client components with Convex
│   ├── messages/        # Real-time messaging
│   ├── videos/          # Video sessions
│   └── settings/        # Current settings page
│
└── (public-api)/        # API routes for webhooks, etc.
```

---

## 📚 When to Use What

| Feature | Use Next.js SSR/PPR | Use Convex Reactivity |
|---------|-------------------|---------------------|
| **Coach profiles (public)** | ✅ `fetchQuery` + `preloadQuery` | ✅ Hydrate with `usePreloadedQuery` |
| **Blog posts** | ✅ `use cache` + `cacheLife` | ❌ Not needed (static) |
| **Landing page** | ✅ Static shell + Suspense | ✅ Dynamic CTA if needed |
| **Dashboard** | ❌ Full client component | ✅ `useQuery` + `useMutation` |
| **Messages** | ❌ Full client component | ✅ Real-time subscriptions |
| **Settings** | ❌ Full client component | ✅ Forms with mutations |
| **Video sessions** | ❌ Full client component | ✅ Real-time state |

---

## 🎯 Implementation Patterns

### 1. Coach Profile Page (SEO-Optimized with PPR)

**Goal**: Instant load, perfect SEO, progressive enhancement

```typescript
// app/(marketing)/coaches/[slug]/page.tsx
import { Suspense } from 'react';
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

// Generate static paths for popular coaches (pre-rendered at build)
export async function generateStaticParams() {
  const coaches = await fetchQuery(api.coaches.getPopularCoaches);
  return coaches.map(coach => ({ slug: coach.slug }));
}

// SEO metadata (fully static, crawlable)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const coach = await fetchQuery(api.coaches.getBySlug, { slug });

  return {
    title: `${coach.name} - Fitness Coach on EKVI`,
    description: coach.bio,
    openGraph: {
      images: [coach.profileImage],
    },
  };
}

export default async function CoachProfilePage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;

  // ✅ Fetch static coach data on server (for SEO)
  const coach = await fetchQuery(api.coaches.getBySlug, { slug });

  // ✅ Preload reviews for client hydration
  const preloadedReviews = await preloadQuery(api.reviews.getForCoach, {
    coachId: coach._id
  });

  return (
    <>
      {/* ✅ STATIC SHELL - Pre-rendered, instant load, SEO-friendly */}
      <CoachHeader coach={coach} />
      <CoachBio bio={coach.bio} />
      <CoachStats stats={coach.stats} />

      {/* ⚡ STREAMING CONTENT - Loads progressively with Suspense */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <CoachReviews preloadedReviews={preloadedReviews} />
      </Suspense>

      <Suspense fallback={<AvailabilitySkeleton />}>
        <CoachAvailability coachId={coach._id} />
      </Suspense>

      {/* 🎯 CLIENT INTERACTIVE - Real-time booking */}
      <Suspense fallback={<BookingButtonSkeleton />}>
        <BookingButton coachId={coach._id} />
      </Suspense>
    </>
  );
}

// Static header component (pre-rendered in HTML, crawlable by Google)
function CoachHeader({ coach }: { coach: Coach }) {
  return (
    <header>
      <Image src={coach.profileImage} alt={coach.name} width={200} height={200} />
      <h1>{coach.name}</h1>
      <p>{coach.specialties.join(', ')}</p>
    </header>
  );
}

function CoachBio({ bio }: { bio: string }) {
  return (
    <section>
      <h2>About</h2>
      <p>{bio}</p>
    </section>
  );
}

function CoachStats({ stats }: { stats: CoachStats }) {
  return (
    <div className="stats-grid">
      <StatCard label="Clients" value={stats.totalClients} />
      <StatCard label="Rating" value={stats.averageRating} />
      <StatCard label="Years Exp" value={stats.yearsExperience} />
    </div>
  );
}

// Client component for real-time reviews
'use client'
import { Preloaded, usePreloadedQuery } from "convex/react";

function CoachReviews({
  preloadedReviews
}: {
  preloadedReviews: Preloaded<typeof api.reviews.getForCoach>
}) {
  // ✅ Hydrates with server data, then subscribes for real-time updates
  const reviews = usePreloadedQuery(preloadedReviews);

  return (
    <section>
      <h2>Reviews</h2>
      {reviews.map(review => (
        <ReviewCard key={review._id} {...review} />
      ))}
    </section>
  );
}
```

**What happens:**
1. ✅ Google crawls fully rendered HTML with coach bio, name, image (perfect SEO)
2. ⚡ User sees instant static shell on page load (FCP < 1s)
3. 🔄 Reviews stream in progressively (no blocking, better UX)
4. 🎯 Client hydrates with real-time Convex for live updates

---

### 2. Blog Posts with Cache Components

**Goal**: Fully static, cache on-demand revalidation

```typescript
// app/(marketing)/blog/[slug]/page.tsx
import { cacheLife, cacheTag } from 'next/cache';
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function generateStaticParams() {
  const posts = await fetchQuery(api.blog.getAllSlugs);
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const post = await fetchQuery(api.blog.getBySlug, { slug });

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPost({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  'use cache'; // ✅ Cache this entire component
  cacheLife('days'); // Cache for 1 day
  cacheTag('blog-posts'); // Tag for revalidation

  const { slug } = await params;
  const post = await fetchQuery(api.blog.getBySlug, { slug });

  return (
    <article>
      <header>
        <h1>{post.title}</h1>
        <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
      </header>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

**Server action to revalidate when publishing:**

```typescript
// app/(marketing)/blog/actions.ts
'use server'

import { revalidateTag } from 'next/cache';
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function publishBlogPost(formData: FormData) {
  await fetchMutation(api.blog.create, {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    excerpt: formData.get('excerpt') as string,
  });

  // ✅ Invalidate cache for blog posts
  revalidateTag('blog-posts');
}
```

**Benefits:**
- ✅ Fully static HTML for perfect SEO
- ⚡ Instant page loads (served from cache)
- 🔄 On-demand revalidation when publishing new posts
- 📦 No client-side JavaScript needed for reading

---

### 3. Landing Page with Static Shell + Dynamic CTA

```typescript
// app/(marketing)/page.tsx
import { Suspense } from 'react';
import { cacheLife } from 'next/cache';

export default async function LandingPage() {
  'use cache';
  cacheLife('hours'); // Cache static parts for 1 hour

  return (
    <>
      {/* ✅ STATIC CONTENT - Pre-rendered */}
      <Hero />
      <Features />
      <HowItWorks />

      {/* ⚡ DYNAMIC - Featured coaches stream in */}
      <Suspense fallback={<FeaturedCoachesSkeleton />}>
        <FeaturedCoaches />
      </Suspense>

      {/* 🎯 PERSONALIZED - CTA based on auth state */}
      <Suspense fallback={<CTASkeleton />}>
        <PersonalizedCTA />
      </Suspense>
    </>
  );
}

function Hero() {
  return (
    <section className="hero">
      <h1>Find Your Perfect Fitness Coach</h1>
      <p>Connect with certified coaches worldwide</p>
    </section>
  );
}

async function FeaturedCoaches() {
  const coaches = await fetchQuery(api.coaches.getFeatured, { limit: 6 });

  return (
    <section>
      <h2>Featured Coaches</h2>
      <div className="coaches-grid">
        {coaches.map(coach => (
          <CoachCard key={coach._id} {...coach} />
        ))}
      </div>
    </section>
  );
}

async function PersonalizedCTA() {
  const { userId } = await auth();

  if (userId) {
    return <Link href="/dashboard">Go to Dashboard</Link>;
  }

  return <Link href="/sign-up">Get Started</Link>;
}
```

---

### 4. Dashboard (Client-Heavy Real-time)

**Goal**: Full reactivity, no SEO needed

```typescript
// app/(auth)/dashboard/page.tsx
'use client'

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export default function DashboardPage() {
  // ✅ Real-time reactive queries - perfect for authenticated app
  const user = useQuery(api.users.getCurrentUser);
  const stats = useQuery(api.stats.getForUser);
  const recentMessages = useQuery(api.messages.getRecent, { limit: 5 });
  const upcomingSessions = useQuery(api.sessions.getUpcoming);

  if (!user) return <DashboardSkeleton />;

  return (
    <div className="dashboard">
      <WelcomeHeader user={user} />
      <StatsGrid stats={stats} />
      <RecentMessages messages={recentMessages} />
      <UpcomingSessions sessions={upcomingSessions} />
    </div>
  );
}
```

**No PPR needed** - This is authenticated, client-heavy, real-time. Perfect for Convex's reactive model.

---

## ⚙️ Configuration Changes

### 1. Enable Cache Components (PPR)

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true, // ✅ Enable PPR + use cache directive

  experimental: {
    reactCompiler: true, // Already enabled
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-convex-storage.convex.cloud',
      },
    ],
  },
};

export default nextConfig;
```

### 2. Add Convex Functions for Public Routes

```typescript
// packages/backend/convex/coaches.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// For coach profile pages (SSR)
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const coach = await ctx.db
      .query("coaches")
      .filter(q => q.eq(q.field("slug"), args.slug))
      .first();

    if (!coach) return null;

    return {
      ...coach,
      profileImage: await ctx.storage.getUrl(coach.profileImageId),
    };
  },
});

// For generateStaticParams
export const getPopularCoaches = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("coaches")
      .filter(q => q.eq(q.field("isPopular"), true))
      .collect();
  },
});

export const getFeatured = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coaches")
      .filter(q => q.eq(q.field("isFeatured"), true))
      .order("desc")
      .take(args.limit);
  },
});
```

```typescript
// packages/backend/convex/blog.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAllSlugs = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query("blogPosts").collect();
    return posts.map(p => ({ slug: p.slug }));
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blogPosts")
      .filter(q => q.eq(q.field("slug"), args.slug))
      .first();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    excerpt: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = args.title.toLowerCase().replace(/\s+/g, '-');

    return await ctx.db.insert("blogPosts", {
      ...args,
      slug,
      publishedAt: Date.now(),
    });
  },
});
```

---

## 🚀 Implementation Roadmap

### Phase 1: Enable PPR (Week 1)

1. ✅ Add `cacheComponents: true` to `next.config.ts`
2. ✅ Test existing pages to ensure no breaking changes
3. ✅ Add Convex functions for public data fetching

### Phase 2: Coach Profiles (Week 2-3)

1. ✅ Create `(marketing)` route group
2. ✅ Implement `/coaches/[slug]` page with PPR pattern
3. ✅ Add `generateStaticParams` for popular coaches
4. ✅ Implement Suspense boundaries for reviews/availability
5. ✅ Add metadata for SEO
6. ✅ Test preloading + hydration flow

### Phase 3: Blog (Week 4)

1. ✅ Create `/blog/[slug]` route
2. ✅ Implement `use cache` + `cacheLife('days')`
3. ✅ Add `cacheTag` for revalidation
4. ✅ Create admin interface for publishing (with `revalidateTag`)
5. ✅ Test cache behavior and revalidation

### Phase 4: Landing Page Optimization (Week 5)

1. ✅ Refactor landing page with static shell
2. ✅ Add Suspense for dynamic sections
3. ✅ Implement personalized CTAs
4. ✅ Measure performance improvements

### Phase 5: Monitoring & Optimization (Ongoing)

1. ✅ Monitor Core Web Vitals
2. ✅ Optimize cache hit rates
3. ✅ Fine-tune `cacheLife` durations
4. ✅ Add more Suspense boundaries where beneficial

---

## 📊 Expected Performance Improvements

### Before (Current)
- First Contentful Paint: ~2-3s (all client-rendered)
- Largest Contentful Paint: ~3-4s
- SEO: Limited (client-rendered content)
- Time to Interactive: ~4-5s

### After (With PPR)
- First Contentful Paint: **<1s** (static shell)
- Largest Contentful Paint: **<2s** (streaming)
- SEO: **Perfect** (fully rendered HTML)
- Time to Interactive: **<2s** (progressive hydration)

---

## 🔍 Key Principles

### ✅ DO Use PPR/SSR For:
- Public coach profiles (SEO critical)
- Blog posts (SEO + static content)
- Landing pages (first impression)
- Marketing pages (SEO + conversion)

### ❌ DON'T Use PPR/SSR For:
- Authenticated dashboards (client-heavy)
- Real-time messaging (live updates)
- Settings pages (form state)
- Video sessions (WebRTC)

### 🎯 Hybrid Pattern:
- **Server fetch** initial data with `fetchQuery`/`preloadQuery`
- **Client hydrate** with `usePreloadedQuery`
- **Subscribe** to real-time updates with Convex
- Best of both: SEO + Reactivity

---

## 🧪 Testing Strategy

### Manual Testing
1. Disable JavaScript and test coach profiles (should show full content)
2. Check Google Search Console for indexing
3. Test cache revalidation after blog post publish
4. Measure LCP/FCP with Lighthouse

### Automated Testing
1. Add E2E tests for coach profile pages
2. Test SSR rendering with Playwright
3. Verify metadata generation
4. Test Suspense fallbacks

---

## 📚 Resources

- [Next.js 16 Cache Components Docs](https://nextjs.org/docs/app/getting-started/cache-components)
- [Convex Server Rendering Guide](https://docs.convex.dev/client/nextjs/app-router/server-rendering)
- [React Suspense Docs](https://react.dev/reference/react/Suspense)
- [PPR Explanation Video](https://www.youtube.com/watch?v=MTcPrTIBkpA)

---

## ✅ Conclusion

**Next.js 16 + Convex is the perfect stack for EKVI:**

1. **SEO-critical public routes** → PPR + Suspense + Cache Components
2. **Real-time authenticated app** → Client Components + Convex reactivity
3. **Best performance** → Static shell + progressive enhancement
4. **Developer experience** → Clear patterns, no confusion

The friction you experienced with the settings page is expected - it's an **authenticated, form-heavy, client-interactive page** that **should be** a Client Component. PPR is for public SEO routes, not authenticated app pages.

**Keep Next.js. Implement PPR for public routes. Keep client components for the app. You'll get the best of both worlds.**

---

## 🎥 Mux Video: Non-Standard Input Handling

### Unhandled Webhook Event: `video.asset.non_standard_input_detected`

**Status**: Future Enhancement (Phase 2B or 3)
**Priority**: Medium
**Effort**: Low (1-2 hours for basic implementation)
**Impact**: High (affects ~5-15% of uploads)

### What It Is

Mux fires this webhook when a video requires non-standard transcoding, which significantly increases processing time:
- **Standard video**: 1-3 minutes processing
- **Non-standard video**: 10-30+ minutes processing

Users currently see "Processing video..." for extended periods without understanding why, leading to confusion and support tickets.

### Webhook Payload

```json
{
  "type": "video.asset.non_standard_input_detected",
  "data": {
    "id": "asset-id",
    "non_standard_input_reasons": [
      { "property_id": "video_codec", "actual_value": "mpeg2video" },
      { "property_id": "gop_size", "actual_value": "open" },
      { "property_id": "frame_rate", "actual_value": "29.97" }
    ]
  }
}
```

### Implementation Options

#### Option A: Basic User Notification (Recommended for Phase 2B)
**Effort**: 1-2 hours
**Impact**: High UX improvement

1. **Backend**: Add webhook handler in [packages/backend/convex/mux/webhooks.ts](packages/backend/convex/mux/webhooks.ts)
   ```typescript
   export const handleNonStandardInput = internalMutation({
     args: {
       assetId: v.string(),
       reasons: v.array(v.any()),
     },
     handler: async (ctx, args) => {
       const video = await ctx.db
         .query("videos")
         .withIndex("by_muxAssetId", (q) => q.eq("muxAssetId", args.assetId))
         .first();

       if (!video) return;

       await ctx.db.patch(video._id, {
         isNonStandard: true,
         nonStandardReasons: args.reasons,
         estimatedProcessingTime: "10-30 minutes",
         updatedAt: Date.now(),
       });
     },
   });
   ```

2. **Database Schema**: Add fields to videos table in [packages/backend/convex/schema.ts](packages/backend/convex/schema.ts)
   ```typescript
   isNonStandard: v.optional(v.boolean()),
   nonStandardReasons: v.optional(v.array(v.any())),
   estimatedProcessingTime: v.optional(v.string()),
   ```

3. **HTTP Handler**: Add case in [packages/backend/convex/mux/httpActions.ts](packages/backend/convex/mux/httpActions.ts):62
   ```typescript
   case "video.asset.non_standard_input_detected": {
     const data = event.data as any;
     await ctx.runMutation(internal.mux.webhooks.handleNonStandardInput, {
       assetId: data.id,
       reasons: data.non_standard_input_reasons || [],
     });
     break;
   }
   ```

4. **Frontend**: Update [apps/web/components/video/video-player.tsx](apps/web/components/video/video-player.tsx) processing state
   ```typescript
   if (video.status === "processing") {
     return (
       <div className="flex h-64 items-center justify-center rounded-lg border bg-muted">
         <div className="text-center">
           <p className="text-sm font-medium">Processing video...</p>
           {video.isNonStandard ? (
             <p className="mt-1 text-xs text-muted-foreground">
               This video requires extended processing ({video.estimatedProcessingTime})
             </p>
           ) : (
             <p className="mt-1 text-xs text-muted-foreground">
               This may take a few minutes
             </p>
           )}
         </div>
       </div>
     );
   }
   ```

**User Experience**:
- Standard video: "Processing video... This may take a few minutes"
- Non-standard video: "Processing video... This video requires extended processing (10-30 minutes)"

#### Option B: Proactive Upload Guidance (Phase 3)
**Effort**: 4-6 hours
**Impact**: Medium (prevents issue before upload)

1. Add client-side video file analysis before upload
2. Detect codec/frame rate/GOP size issues
3. Show warning and recommendations:
   - "Your video may take longer to process due to [reason]"
   - "Consider re-encoding to H.264 for faster processing"
4. Allow user to proceed or cancel

**Benefits**:
- Users know upfront about potential delays
- Can choose to re-encode before uploading
- Reduces unexpected long waits

**Complexity**:
- Requires browser-based video analysis (ffmpeg.wasm or similar)
- Increases bundle size
- May slow down upload start

#### Option C: Analytics Tracking (Phase 4)
**Effort**: 2-3 hours
**Impact**: Low (internal insights only)

1. Track non-standard input patterns in Convex
2. Store reasons in database for analysis
3. Build admin dashboard showing:
   - % of uploads with non-standard input
   - Most common reasons
   - Average processing time difference

**Benefits**:
- Data-driven optimization decisions
- Identify if certain user segments upload problematic formats
- Can proactively reach out to users with encoding tips

### Recommendation

**Start with Option A** (Basic Notification) in Phase 2B or early Phase 3:
- Minimal effort (1-2 hours)
- Immediate UX improvement
- Reduces user confusion and support tickets
- Can enhance later with Options B and C

**Later additions**:
- Phase 3: Add Option B if non-standard uploads become frequent (>15%)
- Phase 4: Add Option C for analytics and optimization insights
