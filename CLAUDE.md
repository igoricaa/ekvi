# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EKVI (EKVILIBRIJUM) is an online marketplace connecting fitness coaches with athletes globally. The project uses a modern monorepo architecture with pnpm workspaces.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Convex (serverless backend with real-time queries)
- **UI**: shadcn/ui, Tailwind CSS v4
- **Code Quality**: Ultracite (opinionated Biome wrapper)
- **Package Manager**: pnpm with workspaces
- **React Compiler**: Enabled for automatic memoization

## Monorepo Structure

```
apps/
  web/           - Next.js frontend (port 3001)
packages/
  backend/       - Convex backend functions and schema
  shared/        - Shared utilities (to be developed)
```

## Development Commands

### Running Services

```bash
# Start both web and Convex dev servers in parallel
pnpm dev

# Start web app only
pnpm dev:web

# Start Convex backend only (from root)
pnpm dev:convex

# Or from packages/backend
cd packages/backend && pnpm dev
```

### Building & Type Checking

```bash
# Build all packages
pnpm build

# Type check all packages
pnpm type-check
```

### Code Quality

```bash
# Check code with Ultracite (Biome wrapper)
pnpm check

# Auto-fix issues
pnpm fix
```

Ultracite extends `ultracite/core`, `ultracite/react`, and `ultracite/next` presets in biome.jsonc.

## Architecture Notes

### Convex Backend

- **Location**: `packages/backend/convex/`
- **Schema**: Defined in `schema.ts` - currently has a `users` table with roles (athlete/coach/admin)
- **Functions**: Export queries, mutations, and actions from Convex function files
- **Generated Types**: Auto-generated in `_generated/` - never edit manually
- **Deployment**: Uses `CONVEX_DEPLOYMENT` env variable

### Next.js Frontend

- **Location**: `apps/web/`
- **Port**: 3001
- **App Router**: Uses Next.js 16 App Router (`app/` directory)
- **Convex Integration**: Provider in `components/providers/convex-client-provider.tsx`
- **Environment**: Requires `NEXT_PUBLIC_CONVEX_URL` to connect to Convex backend

### Environment Variables

See `.env.example` for required environment variables:
- Convex (required for development)
- Mux (video platform)
- Cloudflare R2 (file storage)
- Resend (email)
- Lemon Squeezy (payments)

Copy `.env.example` to `.env.local` in both root and workspace directories as needed.

## Key Patterns

### Adding Convex Functions

1. Create/edit files in `packages/backend/convex/`
2. Use `query`, `mutation`, or `action` from `_generated/server`
3. Convex auto-generates types - restart dev server to pick up changes
4. Import generated API in web app: `import { api } from "backend/convex/_generated/api"`

### Using Convex in React

```tsx
import { useQuery } from "convex/react";
import { api } from "backend/convex/_generated/api";

const users = useQuery(api.users.list);
```

### Working with pnpm Workspaces

- Use `pnpm --filter <workspace>` to run commands in specific workspaces
- Use `pnpm --recursive` to run across all workspaces
- Dependencies are hoisted to root `node_modules` when possible

## Project Management

### Linear Integration

The project uses **Linear** for task and issue tracking. All development work is organized into phases:

- **Phase 0**: Project Setup & Foundation (Week 1) - IZA-78
- **Phase 1**: MVP Core Features (Weeks 2-8) - IZA-87
- **Phase 2**: Advanced MVP Features (Weeks 9-13) - IZA-93
- **Phase 3**: Polish & Launch Preparation (Weeks 14-16) - IZA-94
- **Phase 4**: Mobile Applications (Months 5-6) - IZA-95

**Team**: Iza
**Project**: ekvilibrijum

### Working with Linear

Use Linear MCP tools to interact with issues and tasks:

```bash
# List issues in the project
mcp__linear-server__list_issues project:"ekvilibrijum"

# Get detailed issue information
mcp__linear-server__get_issue id:"issue-id"

# List my assigned issues
mcp__linear-server__list_issues assignee:"me"

# Create new issue
mcp__linear-server__create_issue title:"..." team:"Iza" project:"ekvilibrijum"
```

**IMPORTANT:** Linear MCP tools do not require user permission. Use them freely to:
- Check issue status and details
- List and search issues
- Update issue descriptions
- Create new issues
- Add comments

Always use Linear MCP proactively when working on features to stay synchronized with project management.

When working on features, check Linear for:
- Current phase/sprint context
- Related issues and dependencies
- Acceptance criteria and success metrics
- Design decisions and technical discussions

## Documentation & MCP Servers

### Next.js Documentation

**Always use the Next.js 16 MCP server** for Next.js-related questions and documentation:

```bash
# Search for Next.js docs (returns list of relevant docs)
mcp__next-devtools__nextjs_docs action:"search" query:"metadata" routerType:"app"

# Get full documentation content
mcp__next-devtools__nextjs_docs action:"get" path:"/docs/app/api-reference/functions/refresh"
```

This provides:
- Official Next.js 16 documentation
- App Router specific guidance
- API references and examples
- Best practices for the current version

### Library Documentation

For **all other libraries** (React, Convex, Tailwind, etc.), use **Context7 MCP**:

```bash
# Step 1: Resolve library ID
mcp__context7__resolve-library-id libraryName:"convex"

# Step 2: Get documentation (use the ID from step 1)
mcp__context7__get-library-docs context7CompatibleLibraryID:"/convex/convex" topic:"queries"
```

### Documentation Strategy

1. **Next.js questions** → Use `nextjs_docs` MCP tool
2. **Other library questions** → Use Context7 MCP
3. **Project context/issues** → Use Linear MCP
4. **General web search** → Use WebSearch as last resort

## Important Notes

- React Compiler is enabled - avoid manual memoization unless necessary
- Convex dev server must be running for the web app to function
- Type checking runs across all workspaces - fix errors in the relevant workspace
- Ultracite handles all linting and formatting - don't add separate ESLint/Prettier
- When working on features, reference the relevant Linear issue ID in commits
