# Design Guidelines - Streaming App (Films & Séries)

## Design Approach: Reference-Based (Streaming Platforms)

**Primary References**: Netflix, Disney+, Prime Video
**Justification**: Streaming media app requiring visual-rich, immersive experience with content-first design. Users expect familiar streaming platform patterns for navigation, content discovery, and playback controls.

## Core Design Principles

1. **Content-First Philosophy**: Visual content (posters, thumbnails) drives the interface
2. **Cinematic Experience**: Dark-themed interface that puts focus on media
3. **Effortless Discovery**: Intuitive navigation with minimal friction
4. **Seamless Continuation**: Progress indicators and resume functionality prominently displayed

## Color Palette

### Dark Mode (Primary)
- **Background Primary**: 220 15% 8% (deep charcoal, almost black)
- **Background Secondary**: 220 15% 12% (cards, elevated surfaces)
- **Background Tertiary**: 220 12% 16% (hover states)
- **Text Primary**: 0 0% 95% (high contrast white)
- **Text Secondary**: 0 0% 70% (muted descriptions)
- **Brand Accent**: 350 85% 55% (vibrant red, Netflix-inspired)
- **Success**: 142 70% 45% (progress, downloads)
- **Warning**: 38 92% 50% (alerts, resume prompts)

### Light Mode (Secondary Support)
- **Background**: 0 0% 98%
- **Cards**: 0 0% 100%
- **Text Primary**: 220 15% 15%
- **Accent remains**: 350 85% 55%

## Typography

**Font Stack**: 
- Primary: 'Inter' (Google Fonts) - clean, modern sans-serif
- Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui

**Scale**:
- Hero Titles: text-4xl md:text-5xl lg:text-6xl font-bold
- Section Headers: text-2xl md:text-3xl font-semibold
- Card Titles: text-lg md:text-xl font-medium
- Body Text: text-sm md:text-base
- Metadata/Labels: text-xs md:text-sm text-secondary

## Layout System

**Spacing Units**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Consistent section padding: py-12 md:py-16 lg:py-20
- Card spacing: gap-4 md:gap-6
- Container margins: px-4 md:px-8 lg:px-12
- Max container width: max-w-[1920px] mx-auto

**Grid Patterns**:
- Mobile: Single column (grid-cols-2 for thumbnails)
- Tablet: 3-4 columns (grid-cols-3 md:grid-cols-4)
- Desktop: 5-6 columns (lg:grid-cols-5 xl:grid-cols-6)

## Component Library

### Navigation
- **Bottom Tab Bar** (Mobile): Fixed bottom navigation with 5 icons, active state with accent color glow
- **Sidebar** (Desktop): Persistent left sidebar, icons + labels, width: w-64
- **Search Bar**: Prominent in header, expandable on mobile, autocomplete dropdown with poster thumbnails

### Content Cards
- **Aspect Ratio**: 2:3 for posters (movie/series cards)
- **Hover Effect**: Scale 105%, subtle shadow elevation
- **Progress Bar**: Thin 2px bar at bottom of thumbnail (green), shows watch progress
- **Overlay Info**: Gradient overlay on hover revealing title, rating, year

### Hero Section (Home/Detail Pages)
- **Full-width backdrop**: Gradient overlay (left to right: black 40% → transparent)
- **Height**: 70vh on desktop, 50vh on mobile
- **Content**: Title (text-5xl), metadata row, description (max-w-2xl), CTA buttons (Play, Download, Favorite)
- **Buttons**: Primary (red bg), Secondary (white/10 bg with backdrop-blur)

### Detail Page Layout
- **Hero Backdrop**: Full-width with gradient overlay
- **Info Panel**: Grid layout - left: poster (w-64), right: title, metadata, description
- **Tabs Section**: Sources/Résolutions in tabs, rounded buttons for quality selection
- **Similar Content**: Horizontal scrollable carousel below

### Settings Interface
- **List Style**: Grouped sections with dividers
- **Options**: Toggle switches (accent color), input fields for URL modification
- **Downloads**: List with progress bars, thumbnail preview, cancel/delete actions
- **Clear Cache**: Destructive action with confirmation modal

## Interaction Patterns

**Content Discovery**:
- Horizontal scrolling carousels (with fade edges)
- Infinite scroll for main content grids
- Skeleton loaders matching card dimensions

**Search**:
- Real-time autocomplete with debounce (300ms)
- Results grouped by type (Films, Séries, Animes)
- Thumbnail + title in dropdown

**Playback Resume**:
- "Continue Watching" row on home (prominent)
- Progress bar visible on all incomplete content
- One-tap resume from home screen

## Images

**Required Images**:
1. **Hero Backdrop** (Home): Featured content backdrop, full-width, high-quality (1920x1080)
2. **Content Posters**: Movie/series posters (500x750 aspect), loaded from TMDB
3. **Backdrop Images**: Detail pages use TMDB backdrop images
4. **Placeholder**: Generic gradient or TMDB logo for loading states

**Image Treatment**:
- Lazy loading for all images
- Progressive enhancement (blur-up technique)
- Gradient overlays for text legibility (rgba(0,0,0,0.6))

## Responsive Breakpoints

- Mobile: < 768px (bottom nav, stacked layouts)
- Tablet: 768px - 1024px (4-col grids, sidebar appears)
- Desktop: > 1024px (6-col grids, full sidebar)

## Micro-Interactions (Minimal)

- Card hover: subtle scale + shadow (transform duration-200)
- Button press: scale-95 active state
- Tab switch: slide transition for content
- Progress bar: smooth width animation

**Critical**: Avoid flashy animations. Focus on smooth, purposeful transitions that enhance usability, not distract from content.