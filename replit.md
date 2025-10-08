# StreamApp - Films, Séries & Animes

## Overview

StreamApp is a streaming media platform for discovering and watching movies, TV series, anime, and documentaries. The application provides a Netflix-like experience with features including content browsing, search functionality, favorites management, watch progress tracking, and download capabilities. Built with a modern tech stack featuring React frontend and Express backend, the platform integrates with The Movie Database (TMDB) API for content metadata and uses multiple video streaming providers.

**Recent Changes (October 8, 2025):**
- Complete i18n system with 6 languages (FR/EN/ES/DE/IT/PT) using LanguageContext and combo box selector
- All site labels translate dynamically based on selected language with TMDB API language sync
- Hero section height reduced to 35vh/50vh (mobile/desktop) for better content visibility
- Home page reorganized: "Par plateforme" section moved after "Continuer à regarder"
- Added platform-specific carousels: Netflix, Amazon Prime, Disney+, Apple TV+ with latest films/series
- Movix.site streaming API integration for enhanced video sources (FStream, TopStream, Wiflix)
- Movie detail pages now show 6 streaming sources (3 traditional + 3 movix.site APIs)
- Series detail pages include 5 streaming sources per episode with season/episode support

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing instead of React Router
- Design system based on shadcn/ui components with Radix UI primitives

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management and API caching
- Local state with React hooks for UI state
- Custom query client configuration with infinite stale time and disabled refetching

**Styling Approach**
- Tailwind CSS with custom design tokens following streaming platform aesthetics
- Dark mode primary theme with light mode support
- CSS custom properties for dynamic theming
- Netflix/Disney+ inspired color palette (deep charcoals, vibrant red accent at 350° 85% 55%)

**Component Structure**
- Atomic design pattern with reusable UI components
- Responsive design with mobile-first approach
- Bottom navigation for mobile, sidebar navigation for desktop
- Media cards, carousels, hero sections as primary content presentation components

### Backend Architecture

**Server Framework**
- Express.js server with TypeScript
- RESTful API design pattern (routes prefixed with `/api`)
- Session-based architecture ready (connect-pg-simple for session store)
- Development and production build separation using esbuild

**Data Layer**
- In-memory storage implementation (MemStorage class) as default
- Interface-based storage pattern (IStorage) for easy database swapping
- Drizzle ORM configured for PostgreSQL migration path
- Schema definitions in shared directory for type safety across client/server

**API Integration**
- TMDB (The Movie Database) API for movie/series metadata
- Multiple video streaming providers (VidSrc, VidSrc Pro, SuperEmbed)
- Movix.site streaming APIs (FStream, TopStream, Wiflix) for enhanced video sources
- Language support (6 languages: FR/EN/ES/DE/IT/PT) with localStorage persistence and TMDB sync

### Data Storage Solutions

**Current Implementation**
- In-memory storage with Map-based data structures
- User management with UUID-based identifiers
- Mock data for rapid prototyping and development

**Production-Ready Schema (Drizzle)**
- PostgreSQL database configuration ready
- Media types: movie, tv, anime, documentary
- Core entities: WatchProgress, Favorites, Downloads, AppSettings
- Neon Database serverless driver configured

**Key Data Models**
- WatchProgress: Track viewing position with percentage and timestamps
- Favorites: User's saved content with metadata
- Download: Offline content with status tracking (downloading/completed/paused/error)
- AppSettings: Configurable streaming hosts (primary/secondary/backup)

### Authentication & Authorization

**Current State**
- User schema defined with username-based lookup
- Session store configured (PostgreSQL-backed via connect-pg-simple)
- Authentication mechanism ready but not fully implemented
- User creation and retrieval methods in storage interface

**Design Pattern**
- Interface-based user management for flexibility
- UUID-based user identification
- Credential-based requests configured in query client

### External Dependencies

**Third-Party APIs**
- **TMDB API**: Content metadata, posters, backdrops, ratings, genres
  - API Key: Hardcoded in client (`f3d757824f08ea2cff45eb8f47ca3a1e`)
  - Base URL: `https://api.themoviedb.org/3`
  - Language support: fr-FR and en-US
  
**Video Streaming Providers**
- VidSrc (`https://vidsrc.to`)
- VidSrc Pro (`https://vidsrc.pro`)
- SuperEmbed (`https://multiembed.mov`)
- **Movix.site APIs** (integrated):
  - FStream: `https://api.movix.site/api/fstream`
  - TopStream: `https://api.movix.site/api/topstream` (direct MP4 with quality/subtitle/audio track selection)
  - Wiflix: `https://api.movix.site/api/wiflix`
- **Vidzy scraper** (backend API):
  - Endpoint: `/api/vidzy/extract` (POST)
  - Désobfuscation automatique du code JavaScript "packed"
  - Extraction de liens m3u8 pour lecteur vidéo
  - Utilisation: `extractVidzyM3u8(vidzyUrl)` depuis le frontend
- Configurable in app settings with primary/secondary/backup hierarchy

**UI Component Libraries**
- Radix UI: Headless accessible components (dialogs, dropdowns, tabs, etc.)
- Lucide React: Icon system
- class-variance-authority: Component variant management
- cmdk: Command palette functionality

**Development Tools**
- Replit-specific plugins for development environment
- Vite plugins for error overlay and cartographer
- Google Fonts: Inter font family

**Database & ORM**
- Drizzle ORM with PostgreSQL dialect
- Neon Database serverless driver
- Database URL from environment variables
- Migration system configured in `./migrations` directory