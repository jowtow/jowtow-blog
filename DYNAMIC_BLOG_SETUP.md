# Dynamic Blog Post Creation System Setup Guide

## Overview

I've set up a complete system for creating blog posts through your admin UI with data persistence using Netlify Blobs. This moves your blog from a static file-based system to a dynamic content management system.

## What Was Created

### 1. **API Routes** (`/app/api/`)
- **`/api/posts/route.ts`** - Handles POST requests to create new posts and GET requests to fetch them
- **`/api/upload/route.ts`** - Handles image uploads and stores them in Netlify Blobs
- **`/api/images/[filename]/route.ts`** - Serves uploaded images with caching

### 2. **Post Editor Component** (`/components/PostEditor/`)
- **`PostEditor.tsx`** - React component with:
  - Markdown textarea editor
  - Live preview toggle
  - Image upload with preview
  - Auto-generated slug from title
  - Form validation
  - Error/success notifications

### 3. **Updated Admin Dashboard** (`/app/admin/page.tsx`)
- Tab-based navigation between "Dashboard" and "Create Post"
- Integrated PostEditor component
- User information display

### 4. **Enhanced Post Library** (`/lib/posts.ts`)
- New `getDynamicPosts()` function to fetch posts from Netlify Blobs
- Updated `getPosts()` to combine static and dynamic posts
- New `getStaticPosts()` for just static posts
- Automatic sorting by date (newest first)

## Installation & Setup

### Step 1: Install Dependencies

```bash
npm install
```

This installs the `@netlify/blobs` package added to your `package.json`.

### Step 2: Configure Netlify

1. **Enable Netlify Blobs**:
   - Go to your Netlify site settings
   - Navigate to "Functions" → "Blobs"
   - Enable Netlify Blobs for your site

2. **Ensure Netlify Identity is configured**:
   - You already have this set up with your current auth system
   - Posts can only be created by authenticated users

### Step 3: Deploy

```bash
npm run build
npm start
# or deploy to Netlify
```

## Usage

### Creating Posts

1. Go to `/admin` and log in with Netlify Identity
2. Click the "Create Post" tab
3. Fill in the form:
   - **Title**: Post title (auto-generates slug)
   - **Slug**: URL-friendly identifier (customizable)
   - **Cover Image**: Optional featured image (max 5MB)
   - **Content**: Write in Markdown format
4. Click "Create Post"

### Writing Markdown

Your markdown editor supports GitHub Flavored Markdown:
- **Headers**: `# H1`, `## H2`, etc.
- **Bold/Italic**: `**bold**`, `*italic*`
- **Lists**: `- item` or `1. numbered`
- **Code blocks**: Use backticks or ```
- **Tables**: 
  ```
  | Header 1 | Header 2 |
  |----------|----------|
  | Cell 1   | Cell 2   |
  ```
- **Links**: `[text](url)`

### Image Uploads

- Images are stored in Netlify Blobs storage (not in git)
- Maximum file size: 5MB
- Supported formats: JPEG, PNG, GIF, WebP, etc.
- Images are cached for 1 year once uploaded
- URLs follow the pattern: `/api/images/[timestamp]-[filename]`

## Data Storage

### Netlify Blobs Structure

Your posts will be stored in two Blobs stores:

1. **`posts` store**: Contains post metadata and markdown as JSON
   - Files: `[slug].json`
   - Content: `{ title, slug, markdown, image, author, date, createdAt }`

2. **`images` store**: Contains uploaded images
   - Files: `[timestamp]-[filename]`
   - Metadata: Original filename, MIME type, upload timestamp

## Authentication

### How It Works

1. Users authenticate via Netlify Identity on your login page
2. Netlify Identity widget provides JWT access token
3. PostEditor component retrieves token and includes it in API requests
4. API routes verify the token (development mode bypasses verification for testing)
5. Only authenticated users can create posts or upload images

### Environment Variables (Optional)

For production, you might want to strengthen authentication:
- `NETLIFY_JWT_SECRET` - Used for JWT verification in production
- `NODE_ENV` - Set to 'production' for stricter auth

## Migration Path: Static to Dynamic

Currently, your system serves posts from both sources:

1. **Static posts**: Read from `/posts/*.md` (existing markdown files)
2. **Dynamic posts**: Fetched from Netlify Blobs

To gradually migrate:

1. New posts are automatically created in Blobs only
2. Existing static posts continue to work
3. When you're ready, you can manually migrate old posts:
   - Copy content from static markdown files
   - Re-create them using the admin UI
   - Or write a migration script

## Development Mode

For local development:

```bash
npm run dev
```

The system uses a simplified auth check in development mode. In production on Netlify, it validates the actual JWT token from Netlify Identity.

## Troubleshooting

### "Cannot find module '@netlify/blobs'"
- Run `npm install` to install dependencies
- Make sure you're running the latest code

### Images not uploading
- Check browser console for errors
- Verify file size is under 5MB
- Ensure Netlify Blobs is enabled on your site

### Posts not appearing
- Check that you're logged in
- Verify Netlify Blobs is enabled
- Check browser console and server logs for errors

### Authentication errors
- Try refreshing the page
- Check that Netlify Identity is properly configured
- Verify your user is authenticated in Netlify Identity

## Next Steps

### Features You Can Add

1. **Post Listing in Admin**:
   - Edit existing posts
   - Delete posts
   - Publish/unpublish

2. **Rich Text Editor**:
   - Replace textarea with TipTap or Slate
   - Support for embedded media
   - More formatting options

3. **Categories/Tags**:
   - Add categorization to posts
   - Filter posts by category

4. **Scheduled Publishing**:
   - Set publish dates
   - Draft/published states

5. **Comments**:
   - Add comment support using Netlify Forms or a service like Disqus

## File Structure

```
/app/
  /api/
    /posts/route.ts          # POST/GET posts
    /upload/route.ts         # Upload images
    /images/[filename]/route.ts  # Serve images
  /admin/
    page.tsx                 # Updated admin dashboard

/components/
  /PostEditor/
    PostEditor.tsx           # Post creation form

/lib/
  posts.ts                   # Updated with dynamic posts support
```

## Important Notes

1. **Backward Compatible**: Your existing static posts continue to work
2. **No Git Tracking**: Images and dynamic posts aren't in your repo (they're in Netlify Blobs)
3. **Search/SEO**: Dynamic posts are rendered as regular pages, so they're fully SEO-friendly
4. **Performance**: Blobs are edge-cached by Netlify for fast access globally

---

**Need help?** Check the inline code comments for more details, or review the specific files for implementation details.
