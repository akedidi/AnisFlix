import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Tv, Radio, Globe, Trophy, Star, Zap, Music, Gamepad2, Film, Newspaper, Users, Shield, Search, X } from "lucide-react";
import CommonLayout from "@/components/CommonLayout";
import SearchBar from "@/components/SearchBar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Hls from "hls.js";
import ShakaPlayer from "@/components/ShakaPlayer";
import { apiClient } from "@/lib/apiClient";
import { useLocation } from "wouter";

// Extension des types pour window.scrollTimeout
declare global {
  interface Window {
    scrollTimeout?: NodeJS.Timeout;
  }
}

// Fonction pour détecter si on est sur mobile
const isMobile = () => {
  const userAgent = navigator.userAgent;
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  console.log(`[MOBILE DETECTION] ===== DÉTECTION MOBILE =====`);
  console.log(`[MOBILE DETECTION] UserAgent: ${userAgent}`);
  console.log(`[MOBILE DETECTION] isMobileDevice: ${isMobileDevice}`);
  console.log(`[MOBILE DETECTION] window.innerWidth: ${window.innerWidth}`);
  console.log(`[MOBILE DETECTION] window.innerHeight: ${window.innerHeight}`);
  
  return isMobileDevice;
};

// Fonction pour scroll vers le haut optimisée - cible le bon conteneur
const scrollToTop = (setIsScrolling: (value: boolean) => void) => {
  console.log('📱 [SCROLL] Début du scroll vers le haut');
  console.log('📱 [SCROLL] Position window:', window.scrollY);
  console.log('📱 [SCROLL] Is mobile:', isMobile());
  
  setIsScrolling(true);
  
  // Nettoyer les timeouts précédents
  if (window.scrollTimeout) {
    clearTimeout(window.scrollTimeout);
  }
  
  // Trouver le conteneur de scroll principal (main-content)
  const mainContent = document.querySelector('.main-content') as HTMLElement;
  console.log('📱 [SCROLL] Conteneur main-content trouvé:', !!mainContent);
  
  if (mainContent) {
    console.log('📱 [SCROLL] Position main-content avant:', mainContent.scrollTop);
  }
  
  // Méthode principale : scroll hybride (smooth + instant)
  const forceScrollToTop = () => {
    // Méthode 1: Scroll immédiat sur window (garantit le scroll)
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Méthode 2: Scroll sur le conteneur principal (immédiat + smooth)
    if (mainContent) {
      // Scroll immédiat d'abord
      mainContent.scrollTop = 0;
      console.log('📱 [SCROLL] Scroll main-content vers le haut (immédiat)');
      
      // Puis scroll smooth pour l'effet visuel
      setTimeout(() => {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('📱 [SCROLL] Scroll main-content smooth appliqué');
      }, 10);
      
      // Méthode alternative avec scrollIntoView
      try {
        mainContent.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start', 
          inline: 'nearest' 
        });
        console.log('📱 [SCROLL] scrollIntoView smooth sur main-content');
      } catch (error) {
        console.log('📱 [SCROLL] scrollIntoView non supporté sur main-content');
      }
    }
    
    // Méthode 3: Scroll sur tous les éléments scrollables (immédiat)
    const scrollableElements = document.querySelectorAll('[data-scrollable], .scrollable-content, .scroll-container');
    scrollableElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        element.scrollTop = 0;
        console.log('📱 [SCROLL] Scroll élément scrollable:', element.className);
      }
    });
    
    // Méthode 4: Effet visuel doux (seulement si déjà en haut)
    if (window.scrollY === 0 && (!mainContent || mainContent.scrollTop === 0)) {
      // Scroll très léger vers le bas puis vers le haut pour créer un effet visible
      window.scrollTo(0, 3);
      if (mainContent) mainContent.scrollTop = 3;
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('📱 [SCROLL] Scroll avec effet visuel doux effectué');
      }, 100);
    } else {
      console.log('📱 [SCROLL] Scroll immédiat effectué');
    }
  };
  
  // Exécuter immédiatement
  forceScrollToTop();
  
  // Vérification et reset après un délai
  window.scrollTimeout = setTimeout(() => {
    const windowPosition = window.scrollY;
    const mainPosition = mainContent ? mainContent.scrollTop : 0;
    console.log('📱 [SCROLL] Position finale window:', windowPosition);
    console.log('📱 [SCROLL] Position finale main-content:', mainPosition);
    setIsScrolling(false);
    
    // Si on n'est toujours pas en haut, forcer une dernière fois (immédiat)
    if (windowPosition > 5 || mainPosition > 5) {
      console.log('📱 [SCROLL] Position > 5, tentative finale immédiate...');
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (mainContent) {
        mainContent.scrollTop = 0;
        mainContent.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }
  }, 200);
};

// Fonction pour détecter si on est sur mobile natif (Capacitor)
const isCapacitor = () => {
  if (typeof window === 'undefined') return false;
  
  // Vérifier si on est dans une app Capacitor native
  const hasCapacitor = (window as any).Capacitor !== undefined;
  const hasCapacitorPlugins = (window as any).Capacitor?.Plugins !== undefined;
  const isNativeApp = hasCapacitor && hasCapacitorPlugins;
  
  // Vérifier si on est sur un navigateur web (même avec Capacitor)
  const isWebBrowser = navigator.userAgent.includes('Chrome') || 
                       navigator.userAgent.includes('Safari') || 
                       navigator.userAgent.includes('Firefox') ||
                       navigator.userAgent.includes('Edge');
  
  // Si c'est un navigateur web, ce n'est pas une vraie app native
  const isRealNativeApp = isNativeApp && !isWebBrowser;
  
  return isRealNativeApp;
};

// Fonction pour convertir une URL en URL proxy pour mobile natif
const getProxyUrl = (originalUrl: string, type: 'hls_direct' | 'hls_segments' | 'mpd'): string => {
  console.log(`[PROXY URL] ===== DÉBUT getProxyUrl =====`);
  console.log(`[PROXY URL] originalUrl: ${originalUrl}`);
  console.log(`[PROXY URL] type: ${type}`);
  console.log(`[PROXY URL] isCapacitor(): ${isCapacitor()}`);
  
  // Utiliser l'API client pour obtenir la bonne URL de base
  const baseUrl = apiClient.getBaseUrl();
  console.log(`[PROXY URL] baseUrl (API client): ${baseUrl}`);
  
  // Pour hls_segments, TOUJOURS utiliser le proxy (même sur mobile web)
  if (type === 'hls_segments') {
    console.log(`[PROXY URL] Type hls_segments détecté - Utilisation du proxy`);
    // Pour les URLs fremtv.lol, extraire l'ID de chaîne
    const match = originalUrl.match(/\/live\/[^\/]+\/(\d+)\.m3u8/);
    console.log(`[PROXY URL] Regex match:`, match);
    if (match) {
      const channelId = match[1];
      const finalUrl = `${baseUrl}/api/tv?channelId=${channelId}`;
      console.log(`[PROXY URL] Channel ID extrait: ${channelId}`);
      console.log(`[PROXY URL] URL finale: ${finalUrl}`);
      return finalUrl;
    } else {
      console.error(`[PROXY URL] ERREUR: Impossible d'extraire le channel ID de: ${originalUrl}`);
    }
  }
  
  // Pour hls_direct, TOUJOURS utiliser le proxy (même sur web) pour éviter les blocages réseau
  if (type === 'hls_direct') {
    console.log(`[PROXY URL] Type hls_direct détecté - Utilisation du proxy pour éviter les blocages`);
    const encodedUrl = encodeURIComponent(originalUrl);
    const finalUrl = `${baseUrl}/api/tv?url=${encodedUrl}`;
    console.log(`[PROXY URL] URL encodée: ${encodedUrl}`);
    console.log(`[PROXY URL] URL finale: ${finalUrl}`);
    return finalUrl;
  }
  
  // Fallback pour les autres types
  console.log(`[PROXY URL] Type non géré: ${type} - URL directe: ${originalUrl}`);
  return originalUrl;
};

interface TVChannelLink {
  type: 'mpd' | 'hls_direct' | 'hls_segments';
  url: string;
}

interface TVChannel {
  id: string;
  name: string;
  logo?: string;
  category: string;
  section: string;
  links: TVChannelLink[];
}

interface TVSection {
  id: string;
  name: string;
  categories: string[];
}

// Mapping des noms de chaînes vers les noms dans l'API jaruba (basé sur le contenu réel de l'API)
const CHANNEL_NAME_MAPPING: Record<string, string> = {
  // Généraliste - correspondances exactes trouvées dans l'API
  "tf1": "tf1",
  "tf1-serie": "tf1", 
  "france2": "france 2",
  "france3": "france 3",
  "france4": "france 4", 
  "france5": "france 5",
  "m6": "m6",
  "arte": "arte.tv", // Exact match dans l'API
  "tfx": "tfx",
  "canal-plus": "canal+",
  "tmc": "tmc",
  "w9": "w9",
  "rmc-decouverte": "rmc découverte",
  "gulli": "gulli",
  
  // Info - correspondances exactes
  "bfmtv": "bfm tv",
  "bfm-business": "bfm business", 
  "bfm-paris": "bfm paris",
  "bfm-lyon": "bfm lyon",
  "bfm-litoral": "bfm grand littoral",
  "bfm-alsace": "bfm alsace",
  "bfm-grand-lille": "bfm grand lille",
  "rt-france": "rt france",
  
  // Sport - correspondances exactes
  "bein-sports-1": "bein sports 1",
  "bein-sports-2": "bein sports 2",
  "bein-sports-3": "bein sports 3", 
  "canal-plus-foot": "canal+ foot",
  "canal-plus-sport-360": "canal+ sport 360",
  "rmc-sport-1": "rmc sport 1",
  "rmc-sport-2": "rmc sport 2",
  "rmc-sport-3": "rmc sport 3",
  "lequipe-tv": "l'équipe tv",
  
  // Fiction & Série - correspondances exactes
  "syfy": "syfy", // Exact match dans l'API
  
  // Jeunesse - correspondances exactes
  "game-one": "game one",
  "mangas": "mangas",
  "boomerang": "boomerang", // Exact match dans l'API
  "cartoon-network": "cartoon network", // Exact match dans l'API
  
  // Découverte - correspondances exactes
  "natgeo": "national geographic", // Exact match dans l'API
  "natgeo-wild": "national geographic wild",
  
  // Cinéma
  "tcm-cinema": "tcm cinema",
  
  // Arabe - Sport
  "elkass-1": "elkass 1",
  "elkass-2": "elkass 2", 
  "elkass-3": "elkass 3",
  "elkass-4": "elkass 4",
  
  // Arabe - Tunisie
  "watania-1": "watania 1",
  "hiwar-tounsi": "hiwar tounsi",
  
  // Arabe - Info
  "eljazira": "al jazeera",
  "eljazira-english": "al jazeera english", 
  "rt-arabe": "rt arabic",
  "elarabiya": "al arabiya",
};

// Fonction pour obtenir l'URL du logo depuis l'API jaruba
const getChannelLogoUrl = async (channelId: string): Promise<string | null> => {
  try {
    const channelName = CHANNEL_NAME_MAPPING[channelId];
    console.log(`[LOGO API] Recherche logo pour ${channelId} -> ${channelName}`);
    
    if (!channelName) {
      console.log(`[LOGO API] Aucun mapping trouvé pour ${channelId}`);
      return null;
    }
    
    const response = await fetch('https://jaruba.github.io/channel-logos/logo_paths.json');
    const logos = await response.json();
    console.log(`[LOGO API] API chargée, ${Object.keys(logos).length} logos disponibles`);
    
    // Chercher le logo correspondant (insensible à la casse)
    const logoPath = logos[channelName.toLowerCase()];
    console.log(`[LOGO API] Recherche "${channelName.toLowerCase()}" -> ${logoPath ? 'TROUVÉ' : 'NON TROUVÉ'}`);
    
    if (logoPath) {
      const fullUrl = `https://jaruba.github.io/channel-logos/export/transparent-color${logoPath}`;
      console.log(`[LOGO API] URL complète: ${fullUrl}`);
      return fullUrl;
    }
    
    // Essayer des variations du nom
    const variations = [
      channelName.toLowerCase(),
      channelName.toLowerCase().replace(/\s+/g, ''),
      channelName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      channelName.toLowerCase().replace(/\s+/g, '-'),
    ];
    
    for (const variation of variations) {
      if (logos[variation]) {
        const fullUrl = `https://jaruba.github.io/channel-logos/export/transparent-color${logos[variation]}`;
        console.log(`[LOGO API] Trouvé avec variation "${variation}": ${fullUrl}`);
        return fullUrl;
      }
    }
    
    console.log(`[LOGO API] Aucun logo trouvé pour ${channelName} (essayé: ${variations.join(', ')})`);
    return null;
  } catch (error) {
    console.error(`[LOGO API] Erreur lors du chargement des logos:`, error);
    return null;
  }
};

const TV_SECTIONS: TVSection[] = [
  {
    id: "france",
    name: "France",
    categories: ["Généraliste", "Info", "Sport", "Fiction & Série", "Jeunesse", "Découverte", "Cinéma"]
  },
  {
    id: "arabe",
    name: "Arabe",
    categories: ["Sport", "Tunisie", "Info"]
  }
];

const TV_CHANNELS: TVChannel[] = [
  // ===== SECTION FRANCE =====
  
  // Généraliste
  { id: "tf1", name: "TF1", category: "Généraliste", section: "france", links: [
    { type: "mpd", url: "https://viamotionhsi.netplus.ch/live/eds/tf1hd/browser-dash/tf1hd.mpd" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/87.m3u8" }
  ]},
  { id: "tf1-serie", name: "TF1 Serie", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/hd1.m3u8" }
  ]},
  { id: "france2", name: "France 2", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://simulcast-p.ftven.fr/ZXhwPTE3NjA3ODM0NjF+YWNsPSUyZip+aG1hYz0wMTMyZjkyODNmZTQ5OGM4M2MwMDY4OGFkYjg1ODA5OGNkMmE0OWYwZjZkMTlhZGNlNjZlNzU5ZWMzMmYyYzAx/simulcast/France_2/hls_fr2/France_2-avc1_2500000=5.m3u8" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/137.m3u8" }
  ]},
  { id: "france3", name: "France 3", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/france3hd/browser-HLS8/france3hd.m3u8" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/138.m3u8" }
  ]},
  { id: "france4", name: "France 4", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://raw.githubusercontent.com/ipstreet312/freeiptv/master/ressources/ftv/py/fr4.m3u8" }
  ]},
  { id: "france5", name: "France 5", category: "Généraliste", section: "france", links: [
    { type: "hls_segments", url: "https://simulcast-p.ftven.fr/ZXhwPTE3NjA3ODM0NjF+YWNsPSUyZip+aG1hYz0wMTMyZjkyODNmZTQ5OGM4M2MwMDY4OGFkYjg1ODA5OGNkMmE0OWYwZjZkMTlhZGNlNjZlNzU5ZWMzMmYyYzAx/simulcast/France_5/hls_fr5/France_5-avc1_2500000=5.m3u8" }
  ]},
  { id: "m6", name: "M6", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/m6hd/browser-HLS8/m6hd.m3u8" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/102.m3u8" }
  ]},
  { id: "arte", name: "Arte", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8" }
  ]},
  { id: "tfx", name: "TFX", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/nt1/browser-HLS8/nt1.m3u8" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/77.m3u8" }
  ]},
  { id: "canal-plus", name: "Canal+", category: "Généraliste", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/106.m3u8" }
  ]},
  { id: "tmc", name: "TMC", category: "Généraliste", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/78.m3u8" }
  ]},
  { id: "w9", name: "W9", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/w9/browser-HLS8/w9.m3u8" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/79.m3u8" }
  ]},
  { id: "rmc-decouverte", name: "RMC Découverte", category: "Généraliste", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/90.m3u8" }
  ]},
  { id: "gulli", name: "Gulli", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/gulli/browser-HLS8/gulli.m3u8" }
  ]},

  // Info
  { id: "bfmtv", name: "BFM TV", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/master.m3u8" }
  ]},
  { id: "bfm-business", name: "BFM Business", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_BUSINESS/index.m3u8?start=LIVE&end=END" }
  ]},
  { id: "bfm-paris", name: "BFM Paris", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://www.viously.com/video/hls/G86AvlqLgXj/index.m3u8" }
  ]},
  { id: "bfm-lyon", name: "BFM Lyon", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_LYON/index.m3u8?start=LIVE&end=END" }
  ]},
  { id: "bfm-litoral", name: "BFM Litoral", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFMGRANDLITTORAL/index.m3u8?start=LIVE&end=END" }
  ]},
  { id: "bfm-alsace", name: "BFM Alsace", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_ALSACE/index.m3u8?start=LIVE&end=END" }
  ]},
  { id: "bfm-grand-lille", name: "BFM Grand Lille", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFMGRANDLILLE/index.m3u8?start=LIVE&end=END" }
  ]},
  { id: "rt-france", name: "RT France", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://rt-fra.rttv.com/live/rtfrance/playlist.m3u8" }
  ]},

  // Sport
  { id: "bein-sports-1", name: "Bein Sports 1", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/44.m3u8" }
  ]},
  { id: "bein-sports-2", name: "Bein Sports 2", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/49.m3u8" }
  ]},
  { id: "bein-sports-3", name: "Bein Sports 3", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/50.m3u8" }
  ]},
  { id: "canal-plus-foot", name: "Canal+ Foot", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/88.m3u8" }
  ]},
  { id: "canal-plus-sport-360", name: "Canal+ Sport 360", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/58.m3u8" }
  ]},
  { id: "rmc-sport-1", name: "RMC Sport 1", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/33.m3u8" }
  ]},
  { id: "rmc-sport-2", name: "RMC Sport 2", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/40.m3u8" }
  ]},
  { id: "rmc-sport-3", name: "RMC Sport 3", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/42.m3u8" }
  ]},
  { id: "lequipe-tv", name: "L'Équipe TV", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://live2.eu-north-1b.cf.dmcdn.net/sec2(ermuWFoalFOnbKlK1xFl5N6-RFs8TR8ytC0BN_948kQeziLQ1-fkqkfWedz6vwq2pV6cqOmVPXuHrmkEOQaWFwzk0ey6_-rMEdaMlm0fB0xLwngtrfO1pgJlnMjnpi2h)/cloud/3/x2lefik/d/live-720.m3u8" }
  ]},

  // Fiction & Série
  { id: "syfy", name: "Syfy", category: "Fiction & Série", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/91.m3u8" }
  ]},

  // Jeunesse
  { id: "game-one", name: "Game One", category: "Jeunesse", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/104.m3u8" }
  ]},
  { id: "mangas", name: "Mangas", category: "Jeunesse", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/97.m3u8" }
  ]},
  { id: "boomerang", name: "Boomerang", category: "Jeunesse", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/180.m3u8" }
  ]},
  { id: "cartoon-network", name: "Cartoon Network", category: "Jeunesse", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/76.m3u8" }
  ]},

  // Découverte
  { id: "natgeo", name: "National Geographic Channel", category: "Découverte", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/81.m3u8" }
  ]},
  { id: "natgeo-wild", name: "National Geographic Wild", category: "Découverte", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/82.m3u8" }
  ]},

  // Cinéma
  { id: "tcm-cinema", name: "TCM Cinema", category: "Cinéma", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/95.m3u8" }
  ]},

  // ===== SECTION ARABE =====
  
  // Sport
  { id: "elkass-1", name: "ElKass 1", category: "Sport", section: "arabe", links: [
    { type: "hls_direct", url: "https://streamer3.qna.org.qa/148164621_live/148164621_296.sdp/playlist.m3u8" }
  ]},
  { id: "elkass-2", name: "ElKass 2", category: "Sport", section: "arabe", links: [
    { type: "hls_direct", url: "https://streamer3.qna.org.qa/148164528_live/148164528_296.sdp/playlist.m3u8" }
  ]},
  { id: "elkass-3", name: "ElKass 3", category: "Sport", section: "arabe", links: [
    { type: "hls_direct", url: "https://streamer2.qna.org.qa/148161470_live/148161470_296.sdp/playlist.m3u8" }
  ]},
  { id: "elkass-4", name: "ElKass 4", category: "Sport", section: "arabe", links: [
    { type: "hls_direct", url: "https://streamer3.qna.org.qa/148164621_live/148164621_296.sdp/playlist.m3u8" }
  ]},

  // Tunisie
  { id: "watania-1", name: "Watania 1", category: "Tunisie", section: "arabe", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/tunisienationale/browser-HLS8/tunisienationale.m3u8" }
  ]},
  { id: "hiwar-tounsi", name: "Hiwar Tounsi", category: "Tunisie", section: "arabe", links: [
    { type: "hls_direct", url: "https://live20.bozztv.com/akamaissh101/ssh101/venolie-hiwar/playlist.m3u8" }
  ]},

  // Info
  { id: "eljazira", name: "ElJazira", category: "Info", section: "arabe", links: [
    { type: "hls_direct", url: "https://live-hls-web-aja.getaj.net/AJA/04.m3u8" }
  ]},
  { id: "eljazira-english", name: "ElJazira English", category: "Info", section: "arabe", links: [
    { type: "hls_direct", url: "https://live-hls-web-aje.getaj.net/AJE/04.m3u8" }
  ]},
  { id: "rt-arabe", name: "RT Arabe", category: "Info", section: "arabe", links: [
    { type: "hls_direct", url: "https://rt-arb.rttv.com/live/rtarab/playlist.m3u8" }
  ]},
  { id: "elarabiya", name: "ElAarabiya", category: "Info", section: "arabe", links: [
    { type: "hls_direct", url: "https://shls-live-ak.akamaized.net/out/v1/f5f319206ed740f9a831f2097c2ead23/index_37.m3u8" }
  ]}
];

export default function TVChannels() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [selectedChannel, setSelectedChannel] = useState<TVChannel | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("france");
  const [selectedCategory, setSelectedCategory] = useState<string>("Généraliste");
  const [selectedLinkIndex, setSelectedLinkIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerType, setPlayerType] = useState<'hls' | 'shaka' | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [channelLogos, setChannelLogos] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Filtrer les chaînes par section et catégorie
  const filteredChannels = TV_CHANNELS.filter(
    channel => channel.section === selectedSection && channel.category === selectedCategory
  );

  // Fonction de recherche de chaînes
  const searchChannels = (query: string) => {
    console.log('🔍 [TV SEARCH] ===== DÉBUT RECHERCHE CHAÎNES =====');
    console.log('🔍 [TV SEARCH] Query reçue:', `"${query}"`);
    console.log('🔍 [TV SEARCH] Query trim:', `"${query.trim()}"`);
    console.log('🔍 [TV SEARCH] Query vide?', !query.trim());
    
    if (!query.trim()) {
      console.log('🔍 [TV SEARCH] Query vide - vidage des résultats');
      setSearchResults([]);
      return;
    }

    console.log('🔍 [TV SEARCH] Recherche dans', TV_CHANNELS.length, 'chaînes');
    
    const results = TV_CHANNELS.filter(channel => {
      const nameMatch = channel.name.toLowerCase().includes(query.toLowerCase());
      
      console.log(`🔍 [TV SEARCH] ${channel.name}:`, {
        nameMatch,
        query: query.toLowerCase(),
        channelName: channel.name.toLowerCase()
      });
      
      return nameMatch;
    });

    console.log('🔍 [TV SEARCH] Résultats trouvés:', results.length);
    console.log('🔍 [TV SEARCH] Noms des résultats:', results.map(r => r.name));

    // Convertir en format compatible avec SearchBar
    const searchSuggestions = results.map((channel, index) => ({
      id: index + 1, // Utiliser un ID numérique pour la compatibilité
      title: channel.name,
      mediaType: 'tv' as const,
      posterPath: channelLogos[channel.id] || '',
      year: '',
      section: channel.section,
      category: channel.category,
      channelId: channel.id // Garder l'ID original pour la sélection
    }));

    console.log('🔍 [TV SEARCH] Suggestions formatées:', searchSuggestions.length);
    console.log('🔍 [TV SEARCH] Suggestions:', searchSuggestions.map(s => ({ id: s.id, title: s.title, channelId: s.channelId })));
    setSearchResults(searchSuggestions);
    console.log('🔍 [TV SEARCH] ===== FIN RECHERCHE CHAÎNES =====');
  };

  // Effet pour la recherche
  useEffect(() => {
    console.log('🔍 [TV SEARCH EFFECT] ===== DÉCLENCHEMENT EFFECT =====');
    console.log('🔍 [TV SEARCH EFFECT] searchQuery:', `"${searchQuery}"`);
    console.log('🔍 [TV SEARCH EFFECT] channelLogos chargés:', Object.keys(channelLogos).length);
    
    // Ne déclencher la recherche que si la query a au moins 1 caractère
    if (searchQuery.length < 1) {
      console.log('🔍 [TV SEARCH EFFECT] Query vide - vidage des résultats');
      setSearchResults([]);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      console.log('🔍 [TV SEARCH EFFECT] Timeout déclenché - appel de searchChannels');
      searchChannels(searchQuery);
    }, 300);

    return () => {
      console.log('🔍 [TV SEARCH EFFECT] Cleanup - clearTimeout');
      clearTimeout(timeoutId);
    };
  }, [searchQuery, channelLogos]);

  // Fonction pour sélectionner une chaîne depuis la recherche
  const selectChannelFromSearch = (item: any) => {
    console.log('🔍 [TV SEARCH] Sélection de chaîne depuis la recherche:', item.title);
    console.log('🔍 [TV SEARCH] Item complet:', item);
    // Utiliser channelId au lieu de id pour trouver la chaîne
    const channel = TV_CHANNELS.find(c => c.id === item.channelId);
    console.log('🔍 [TV SEARCH] Chaîne trouvée:', channel?.name);
    if (channel) {
      setSelectedChannel(channel);
      setSearchQuery("");
      setSearchResults([]);
      
      // Mettre à jour la section et catégorie selon la chaîne sélectionnée
      setSelectedSection(channel.section);
      setSelectedCategory(channel.category);
      console.log('🔍 [TV SEARCH] Chaîne sélectionnée avec succès:', channel.name);
    } else {
      console.error('🔍 [TV SEARCH] Chaîne non trouvée pour channelId:', item.channelId);
    }
  };

  // Obtenir les catégories disponibles pour la section sélectionnée
  const availableCategories = TV_SECTIONS.find(section => section.id === selectedSection)?.categories || [];

  // Réinitialiser la catégorie quand on change de section
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [selectedSection, availableCategories, selectedCategory]);

  // Remonter le scroll quand on change de section ou de catégorie
  useEffect(() => {
    const channelsContainer = document.querySelector('.space-y-2.max-h-96.overflow-y-auto');
    if (channelsContainer) {
      channelsContainer.scrollTop = 0;
    }
  }, [selectedSection, selectedCategory]);

  // Réinitialiser l'index du lien quand on change de chaîne
  useEffect(() => {
    setSelectedLinkIndex(0);
  }, [selectedChannel]);

  // Charger les logos des chaînes au démarrage
  useEffect(() => {
    const loadChannelLogos = async () => {
      console.log('[LOGO LOADER] Début du chargement des logos...');
      const logos: Record<string, string> = {};
      
      for (const channel of TV_CHANNELS) {
        try {
          const logoUrl = await getChannelLogoUrl(channel.id);
          if (logoUrl) {
            logos[channel.id] = logoUrl;
            console.log(`[LOGO LOADER] Logo trouvé pour ${channel.name}: ${logoUrl}`);
          } else {
            console.log(`[LOGO LOADER] Aucun logo trouvé pour ${channel.name}`);
          }
        } catch (error) {
          console.error(`[LOGO LOADER] Erreur pour ${channel.name}:`, error);
        }
      }
      
      setChannelLogos(logos);
      console.log(`[LOGO LOADER] ${Object.keys(logos).length} logos chargés sur ${TV_CHANNELS.length} chaînes`);
    };
    
    loadChannelLogos();
  }, []);

  // Gestion de la navigation native (iOS swipe back / Android back button)
  // La navigation native est maintenant gérée globalement dans CommonLayout

  // Scroll automatique vers le haut quand on sélectionne une chaîne
  useEffect(() => {
    if (selectedChannel) {
      console.log('📱 [TV CHANNELS] ===== USEEFFECT SCROLL =====');
      console.log('📱 [TV CHANNELS] Chaîne sélectionnée:', selectedChannel.name);
      console.log('📱 [TV CHANNELS] Position actuelle:', window.scrollY);
      
      // Attendre que la page se positionne, puis scroll vers le haut
      console.log('📱 [TV CHANNELS] Attente de 200ms avant scroll...');
      setTimeout(() => {
        console.log('📱 [TV CHANNELS] Position après délai:', window.scrollY);
        console.log('📱 [TV CHANNELS] Lancement du scroll vers le haut...');
        scrollToTop(setIsScrolling);
      }, 200);
    }
  }, [selectedChannel]);

  // Fonction pour filtrer les liens selon la plateforme
  const getFilteredLinks = (channel: TVChannel): TVChannelLink[] => {
    const isMobileDevice = isMobile();
    const isNativeApp = isCapacitor();
    
    console.log(`[FILTER LINKS] ===== DÉBUT FILTRAGE =====`);
    console.log(`[FILTER LINKS] Channel: ${channel.name}`);
    console.log(`[FILTER LINKS] isMobileDevice: ${isMobileDevice}`);
    console.log(`[FILTER LINKS] isNativeApp: ${isNativeApp}`);
    console.log(`[FILTER LINKS] Original links count: ${channel.links.length}`);
    console.log(`[FILTER LINKS] Original links:`, channel.links.map((link, index) => `${index}: ${link.type}`));
    
    // Sur mobile web et natif, supprimer le Lien 1 (MPD), garder seulement Lien 2 (HLS)
    if (isMobileDevice || isNativeApp) {
      const filteredLinks = channel.links.filter(link => link.type !== 'mpd');
      console.log(`[FILTER LINKS] Mobile/Native - Suppression Lien 1 (MPD), garde Lien 2 (HLS)`);
      console.log(`[FILTER LINKS] Mobile/Native - Filtered links count: ${filteredLinks.length}`);
      console.log(`[FILTER LINKS] Mobile/Native - Filtered links:`, filteredLinks.map((link, index) => `${index}: ${link.type}`));
      return filteredLinks;
    }
    
    // Sur desktop, garder tous les liens (Lien 1 MPD + Lien 2 HLS)
    console.log(`[FILTER LINKS] Desktop - Garde Lien 1 (MPD) + Lien 2 (HLS)`);
    console.log(`[FILTER LINKS] Desktop - All links kept: ${channel.links.length}`);
    console.log(`[FILTER LINKS] Desktop - All links:`, channel.links.map((link, index) => `${index}: ${link.type}`));
    return channel.links;
  };

  // Fonction pour sélectionner un lien par index et déterminer le player
  const selectLinkByIndex = (channel: TVChannel, linkIndex: number): { url: string; playerType: 'hls' | 'shaka'; linkType: string } => {
    console.log(`[SELECT LINK] Channel: ${channel.name}, Link index: ${linkIndex}`);
    console.log(`[SELECT LINK] Is mobile: ${isMobile()}, Is Capacitor: ${isCapacitor()}`);
    
    // Obtenir les liens filtrés selon la plateforme
    const filteredLinks = getFilteredLinks(channel);
    console.log(`[SELECT LINK] Liens filtrés:`, filteredLinks);
    
    if (filteredLinks && filteredLinks.length > linkIndex) {
      const link = filteredLinks[linkIndex];
      console.log(`[SELECT LINK] Link sélectionné:`, link);
      
      // Utiliser le bon player selon le type de stream et la plateforme
      let playerType: 'hls' | 'shaka';
      
      if (link.type === 'mpd') {
        // Sur mobile web, Shaka Player ne fonctionne pas - utiliser un message d'erreur
        if (isMobile() && !isCapacitor()) {
          console.log(`[SELECT LINK] Mobile web détecté - Shaka Player non supporté`);
          // Retourner une URL vide pour déclencher l'affichage du message d'erreur
          return { url: '', playerType: 'hls', linkType: 'mpd_mobile_unsupported' };
        } else {
          playerType = 'shaka';
          console.log(`[SELECT LINK] Desktop/Capacitor - Utilisation Shaka pour MPD`);
        }
      } else {
        playerType = 'hls';
        console.log(`[SELECT LINK] Type HLS - Utilisation HLS`);
      }
      
      console.log(`[SELECT LINK] Player type final: ${playerType}`);
      
      // Logique conditionnelle : proxy seulement pour certains types de liens
      let finalUrl = link.url;
      
      if (isMobile() && !isCapacitor()) {
        // Mobile web : proxy pour hls_segments, direct pour hls_direct
        if (link.type === 'hls_segments') {
          console.log(`[SELECT LINK] Mode mobile web - hls_segments nécessite proxy`);
          finalUrl = getProxyUrl(link.url, link.type);
        } else {
          console.log(`[SELECT LINK] Mode mobile web - ${link.type} en URL directe: ${finalUrl}`);
        }
      } else if (isCapacitor()) {
        // App native : proxy pour hls_segments, direct pour hls_direct
        if (link.type === 'hls_segments') {
          console.log(`[SELECT LINK] Mode Capacitor - hls_segments nécessite proxy`);
          finalUrl = getProxyUrl(link.url, link.type);
        } else {
          console.log(`[SELECT LINK] Mode Capacitor - ${link.type} en URL directe: ${finalUrl}`);
        }
      } else {
        // Desktop : TOUJOURS utiliser le proxy pour éviter les blocages réseau
        console.log(`[SELECT LINK] Mode desktop - Utilisation du proxy pour éviter les blocages`);
        finalUrl = getProxyUrl(link.url, link.type);
      }
      
      console.log(`📺 Lien sélectionné pour ${channel.name}:`, { 
        type: link.type, 
        playerType, 
        originalUrl: link.url,
        finalUrl: finalUrl,
        isMobile: isMobile(),
        isCapacitor: isCapacitor()
      });
      
      return { url: finalUrl, playerType, linkType: link.type };
    }
    
    console.error(`[SELECT LINK] ERREUR: Pas de lien disponible pour l'index ${linkIndex}`);
    return { url: '', playerType: 'hls', linkType: 'hls_segments' };
  };

  // Fonction pour extraire l'ID de chaîne depuis l'URL M3U8
  const extractChannelId = (url: string): string | null => {
    // Pour les URLs comme https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/87.m3u8
    const match = url.match(/\/(\d+)\.m3u8$/);
    return match ? match[1] : null;
  };

  // Fonction pour initialiser le player HLS avec la logique de token/manifest
  const initHLSPlayer = async (streamUrl: string, linkType: string) => {
    console.log(`🎥 [HLS PLAYER] Début de l'initialisation HLS`);
    console.log(`🎥 [HLS PLAYER] URL originale: ${streamUrl}`);
    console.log(`🎥 [HLS PLAYER] Type de lien: ${linkType}`);
    console.log(`🎥 [HLS PLAYER] Is mobile: ${isMobile()}, Is Capacitor: ${isCapacitor()}`);
    
    if (!videoRef.current) {
      console.error(`🎥 [HLS PLAYER] Aucun élément video trouvé`);
      return;
    }

    const video = videoRef.current;
    console.log(`🎥 [HLS PLAYER] Élément video trouvé:`, video);
    
    // L'URL est déjà convertie en URL proxy par selectLinkByIndex si nécessaire
    const finalStreamUrl = streamUrl;
    console.log(`🎥 [HLS PLAYER] URL finale pour le player: ${finalStreamUrl}`);
    
    if (Hls.isSupported()) {
      console.log(`🎥 [HLS PLAYER] HLS.js est supporté`);
      if (hlsRef.current) {
        console.log(`🎥 [HLS PLAYER] Destruction de l'instance HLS précédente`);
        hlsRef.current.destroy();
      }

      console.log(`🎥 [HLS PLAYER] Création de la nouvelle instance HLS`);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1,
        capLevelToPlayerSize: true,
        liveBackBufferLength: 10,
        maxLiveSyncPlaybackRate: 1.05,
      });
      
      hlsRef.current = hls;
      
      // Hook pour intercepter et proxifier les requêtes HLS (segments vidéo)
      hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
        const originalUrl = data.frag.url;
        console.log(`🎥 [HLS FRAG] URL originale: ${originalUrl}`);
        
        // Si l'URL n'est pas déjà proxifiée et contient des segments audio
        if (!originalUrl.startsWith('http://localhost:3000/api/') && 
            !originalUrl.startsWith('https://anisflix.vercel.app/api/') &&
            (originalUrl.includes('hd1-mp4a_') || originalUrl.includes('fra=') || originalUrl.includes('.m3u8'))) {
          
          // Si c'est une URL relative, la résoudre par rapport au domaine de base
          let resolvedUrl = originalUrl;
          if (!originalUrl.startsWith('http')) {
            // URL relative - la résoudre par rapport au domaine de base du stream
            const baseUrl = 'https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/';
            resolvedUrl = new URL(originalUrl, baseUrl).href;
            console.log(`🎥 [HLS FRAG] URL relative résolue: ${resolvedUrl}`);
          }
          
          const encodedUrl = encodeURIComponent(resolvedUrl);
          const proxifiedUrl = `/api/tv?url=${encodedUrl}`;
          console.log(`🎥 [HLS FRAG] URL proxifiée: ${proxifiedUrl}`);
          
          // Modifier l'URL du fragment
          data.frag.url = proxifiedUrl;
        }
      });

      // Hook pour intercepter et proxifier les requêtes HLS (segments audio)
      hls.on(Hls.Events.AUDIO_TRACK_LOADING, (event, data) => {
        const originalUrl = data.url;
        console.log(`🎥 [HLS AUDIO] URL originale: ${originalUrl}`);
        
        // Si l'URL n'est pas déjà proxifiée et contient des segments audio
        if (!originalUrl.startsWith('http://localhost:3000/api/') && 
            !originalUrl.startsWith('https://anisflix.vercel.app/api/') &&
            (originalUrl.includes('hd1-mp4a_') || originalUrl.includes('fra=') || originalUrl.includes('.m3u8'))) {
          
          // Si c'est une URL relative, la résoudre par rapport au domaine de base
          let resolvedUrl = originalUrl;
          if (!originalUrl.startsWith('http')) {
            // URL relative - la résoudre par rapport au domaine de base du stream
            const baseUrl = 'https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/';
            resolvedUrl = new URL(originalUrl, baseUrl).href;
            console.log(`🎥 [HLS AUDIO] URL relative résolue: ${resolvedUrl}`);
          }
          
          const encodedUrl = encodeURIComponent(resolvedUrl);
          const proxifiedUrl = `/api/tv?url=${encodedUrl}`;
          console.log(`🎥 [HLS AUDIO] URL proxifiée: ${proxifiedUrl}`);
          
          // Modifier l'URL du segment audio
          data.url = proxifiedUrl;
        }
      });
      
      console.log(`🎥 [HLS PLAYER] Chargement de la source: ${finalStreamUrl}`);
      hls.loadSource(finalStreamUrl);
      console.log(`🎥 [HLS PLAYER] Attachement au média`);
      hls.attachMedia(video);
      
      // Ajouter des gestionnaires d'événements pour le fullscreen
      const handleFullscreenChange = () => {
        console.log('🎥 [FULLSCREEN] ===== CHANGEMENT FULLSCREEN =====');
        console.log('🎥 [FULLSCREEN] document.fullscreenElement:', document.fullscreenElement);
        console.log('🎥 [FULLSCREEN] webkitFullscreenElement:', (document as any).webkitFullscreenElement);
        console.log('🎥 [FULLSCREEN] mozFullScreenElement:', (document as any).mozFullScreenElement);
        console.log('🎥 [FULLSCREEN] msFullscreenElement:', (document as any).msFullscreenElement);
        
        const isFullscreen = document.fullscreenElement || 
                            (document as any).webkitFullscreenElement || 
                            (document as any).mozFullScreenElement || 
                            (document as any).msFullscreenElement;
        
        console.log('🎥 [FULLSCREEN] isFullscreen:', isFullscreen);
        console.log('🎥 [FULLSCREEN] video.paused:', video.paused);
        console.log('🎥 [FULLSCREEN] video.ended:', video.ended);
        
        if (!isFullscreen) {
          console.log('🎥 [FULLSCREEN] Sortie du fullscreen détectée - maintien de la lecture');
          // S'assurer que la lecture continue quand on sort du fullscreen
          setTimeout(() => {
            console.log('🎥 [FULLSCREEN] Vérification après délai - paused:', video.paused, 'ended:', video.ended);
            if (video.paused || video.ended) {
              console.log('🎥 [FULLSCREEN] Vidéo en pause/arrêtée - reprise de la lecture');
              video.play().then(() => {
                console.log('🎥 [FULLSCREEN] Lecture reprise avec succès');
              }).catch(err => {
                console.error('🎥 [FULLSCREEN] Erreur lors de la reprise:', err);
              });
            } else {
              console.log('🎥 [FULLSCREEN] Lecture déjà en cours - pas d\'action nécessaire');
            }
          }, 200); // Délai augmenté pour plus de stabilité
        } else {
          console.log('🎥 [FULLSCREEN] Entrée en fullscreen détectée');
        }
      };
      
      const handlePlay = () => {
        console.log('🎥 [VIDEO] Lecture démarrée');
        // Démuter automatiquement quand la lecture démarre
        if (video.muted) {
          console.log('🎥 [VIDEO] Démarrage de la lecture - démutage automatique');
          video.muted = false;
        }
      };
      
      const handlePause = () => {
        console.log('🎥 [VIDEO] Lecture en pause');
      };
      
      const handleEnded = () => {
        console.log('🎥 [VIDEO] Lecture terminée - redémarrage automatique');
        // Redémarrer automatiquement la lecture si elle se termine
        setTimeout(() => {
          video.play().catch(err => {
            console.error('🎥 [VIDEO] Erreur lors du redémarrage:', err);
          });
        }, 100);
      };
      
      // Ajouter les listeners
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);
      
      // Méthode alternative : vérification périodique de l'état
      let fullscreenCheckInterval: NodeJS.Timeout | null = null;
      const startFullscreenCheck = () => {
        if (fullscreenCheckInterval) return;
        console.log('🎥 [FULLSCREEN CHECK] Démarrage de la vérification périodique');
        fullscreenCheckInterval = setInterval(() => {
          const isFullscreen = document.fullscreenElement || 
                              (document as any).webkitFullscreenElement || 
                              (document as any).mozFullScreenElement || 
                              (document as any).msFullscreenElement;
          
          if (!isFullscreen && (video.paused || video.ended)) {
            console.log('🎥 [FULLSCREEN CHECK] Détection de pause en mode normal - reprise');
            video.play().catch(err => {
              console.error('🎥 [FULLSCREEN CHECK] Erreur reprise:', err);
            });
          }
        }, 1000); // Vérifier toutes les secondes
      };
      
      const stopFullscreenCheck = () => {
        if (fullscreenCheckInterval) {
          console.log('🎥 [FULLSCREEN CHECK] Arrêt de la vérification périodique');
          clearInterval(fullscreenCheckInterval);
          fullscreenCheckInterval = null;
        }
      };
      
      // Démarrer la vérification
      startFullscreenCheck();
      
      // Nettoyer les listeners lors de la destruction
      const cleanup = () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
        stopFullscreenCheck();
      };
      
      // Stocker la fonction de nettoyage pour l'utiliser plus tard
      (video as any)._fullscreenCleanup = cleanup;
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log(`🎥 [HLS PLAYER] Manifest parsé avec succès`);
        setIsLoading(false);
        
        // Démarrer la lecture automatiquement mais en mode inline (pas fullscreen)
        console.log(`🎥 [HLS PLAYER] Démarrage de la lecture automatique`);
        video.play().catch(err => {
          console.error("🎥 [HLS PLAYER] Erreur de lecture:", err);
          setError("Impossible de lire le flux");
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data: any) => {
        console.error("🎥 [HLS PLAYER] Erreur HLS:", data);
        console.error("🎥 [HLS PLAYER] Détails erreur:", {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          url: data.url,
          isMobile: isMobile(),
          isCapacitor: isCapacitor()
        });
        
        setIsLoading(false);
        if (data.fatal) {
          console.error(`🎥 [HLS PLAYER] Erreur fatale: ${data.type}`);
          
          // Messages d'erreur spécifiques selon le type
          let errorMessage = "Erreur fatale lors du chargement du flux";
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            errorMessage = "Erreur réseau - Vérifiez votre connexion";
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            errorMessage = "Erreur média - Format non supporté";
          } else if (data.details === "manifestLoadError") {
            if (isMobile() && !isCapacitor()) {
              errorMessage = "Format MPD non supporté sur mobile web - Essayez un autre lien";
            } else {
              errorMessage = "Impossible de charger le manifest - Problème CORS possible";
            }
          }
          
          setError(errorMessage);
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log(`🎥 [HLS PLAYER] Tentative de récupération réseau dans 2s`);
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }, 2000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log(`🎥 [HLS PLAYER] Tentative de récupération média dans 1s`);
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.recoverMediaError();
                }
              }, 1000);
              break;
            default:
              console.log(`🎥 [HLS PLAYER] Destruction de l'instance HLS`);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = finalStreamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(err => {
          console.error("Erreur de lecture:", err);
          setError("Impossible de lire le flux");
        });
      });
    } else {
      setError("Votre navigateur ne supporte pas HLS");
      setIsLoading(false);
    }
  };

  // Premier useEffect : Détermine le type de player et l'URL
  useEffect(() => {
    if (!selectedChannel) {
      setPlayerType(null);
      setStreamUrl(null);
      return;
    }

    console.log(`🎬 [TV CHANNELS] Début de la sélection du lien`);
    console.log(`🎬 [TV CHANNELS] Chaîne sélectionnée: ${selectedChannel?.name}`);
    console.log(`🎬 [TV CHANNELS] Index du lien: ${selectedLinkIndex}`);
    
    setIsLoading(true);
    setError(null);
    
    // Sélectionner le lien par index pour cette chaîne
    const { url: streamUrl, playerType: detectedPlayerType, linkType } = selectLinkByIndex(selectedChannel, selectedLinkIndex);
    
    console.log(`🎬 [TV CHANNELS] Résultat de selectLinkByIndex:`, { streamUrl, detectedPlayerType, linkType });
    
    if (!streamUrl) {
      console.error(`🎬 [TV CHANNELS] Aucun lien de streaming disponible`);
      
      // Message spécifique pour les chaînes MPD sur mobile web
      if (linkType === 'mpd_mobile_unsupported') {
        setError("Cette chaîne utilise un format non supporté sur mobile web. Utilisez l'application native ou un navigateur desktop.");
      } else {
        setError("Aucun lien de streaming disponible pour cette chaîne");
      }
      
      setIsLoading(false);
      return;
    }
    
    setStreamUrl(streamUrl);
    setPlayerType(detectedPlayerType);
    
    console.log(`🎬 [TV CHANNELS] Type de player et URL définis: ${detectedPlayerType}`);
    
    if (detectedPlayerType === 'shaka') {
      console.log(`🎬 [TV CHANNELS] Shaka Player - arrêt du loading`);
      setIsLoading(false);
    }
  }, [selectedChannel, selectedLinkIndex]);

  // Deuxième useEffect : Initialise le player HLS APRÈS que l'élément video soit rendu
  useEffect(() => {
    if (playerType === 'hls' && streamUrl && videoRef.current) {
      console.log(`🎬 [TV CHANNELS] Initialisation du player HLS - élément video trouvé`);
      
      const initializeHLS = async () => {
        try {
          // Récupérer les informations complètes du lien sélectionné
          const { url: finalStreamUrl, linkType } = selectLinkByIndex(selectedChannel!, selectedLinkIndex);
          console.log(`🎬 [TV CHANNELS] Initialisation HLS avec URL: ${finalStreamUrl} et type: ${linkType}`);
          
          await initHLSPlayer(finalStreamUrl, linkType);
          console.log(`🎬 [TV CHANNELS] Player HLS initialisé avec succès`);
        } catch (error) {
          console.error(`🎬 [TV CHANNELS] Erreur lors de l'initialisation du player HLS:`, error);
          setError(`Erreur lors de l'initialisation du player: ${error instanceof Error ? error.message : String(error)}`);
          setIsLoading(false);
        }
      };

      initializeHLS();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      // Nettoyer les listeners de fullscreen
      if (videoRef.current && (videoRef.current as any)._fullscreenCleanup) {
        (videoRef.current as any)._fullscreenCleanup();
      }
    };
  }, [playerType, streamUrl, selectedChannel, selectedLinkIndex]);


  return (
    <CommonLayout 
      title="" 
      icon={null}
      showSearch={true}
      enablePullToRefresh={false}
      customSearchQuery={searchQuery || ""} // Toujours utiliser la recherche personnalisée
      customSearchResults={searchResults}
      onCustomSearch={setSearchQuery}
      onCustomSearchSelect={selectChannelFromSearch}
    >
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="grid lg:grid-cols-[1fr_350px] gap-8">
          <div className="space-y-6">
            {selectedChannel ? (
              <div className="space-y-4">
                {/* Sélecteur de liens */}
                {(() => {
                  const filteredLinks = getFilteredLinks(selectedChannel);
                  console.log(`[UI LINKS] ===== AFFICHAGE UI =====`);
                  console.log(`[UI LINKS] Channel: ${selectedChannel.name}`);
                  console.log(`[UI LINKS] Filtered links count: ${filteredLinks.length}`);
                  console.log(`[UI LINKS] Filtered links:`, filteredLinks.map((link, index) => `${index}: ${link.type}`));
                  console.log(`[UI LINKS] Show selector: ${filteredLinks && filteredLinks.length > 1}`);
                  
                  return filteredLinks && filteredLinks.length > 1 ? (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3">Choisir le lien de streaming :</h4>
                      <div className="flex flex-wrap gap-2">
                        {filteredLinks.map((link, index) => (
                          <Button
                            key={index}
                            variant={selectedLinkIndex === index ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedLinkIndex(index)}
                            className="text-xs"
                          >
                            Lien {index + 1}
                          </Button>
                        ))}
                      </div>
                    </Card>
                  ) : null;
                })()}

                <Card className="overflow-hidden">
                  <div className="aspect-video bg-black relative">
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white text-xl">Chargement du flux...</div>
                      </div>
                    )}
                    {error && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-red-500 text-xl">{error}</div>
                      </div>
                    )}
                    
                    {/* Affichage conditionnel du player selon le type détecté */}
                    {playerType === 'hls' && streamUrl ? (
                      <video
                        ref={videoRef}
                        className="w-full h-full"
                        controls
                        autoPlay // Activer autoPlay pour démarrer automatiquement
                        playsInline // Forcer la lecture inline (pas fullscreen automatique)
                        muted // Muter par défaut pour permettre l'autoPlay sur mobile
                        data-testid="video-player-hls"
                      />
                    ) : playerType === 'shaka' && streamUrl ? (
                      <ShakaPlayer
                        url={streamUrl}
                        title={selectedChannel.name}
                        onClose={() => setSelectedChannel(null)}
                        embedded={true}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white">
                        <div className="text-center">
                          <Tv className="w-12 h-12 mx-auto mb-2" />
                          <p>Initialisation du player...</p>
                        </div>
                      </div>
                    )}
                  </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{selectedChannel.name}</h2>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{selectedChannel.category}</Badge>
                        <Badge variant="outline">{TV_SECTIONS.find(s => s.id === selectedChannel.section)?.name}</Badge>
                        {playerType && (
                          <Badge variant="outline" className="text-xs">
                            {playerType === 'hls' ? 'HLS Player' : 'Shaka Player'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              </div>
            ) : (
              <div className="text-center py-20">
                <Tv className="w-20 h-20 mx-auto mb-6 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Sélectionnez une chaîne</h2>
                <p className="text-muted-foreground">
                  Choisissez une section, puis une catégorie et une chaîne pour commencer à regarder
                </p>
              </div>
            )}
          </div>

          {/* Navigation par sections et catégories */}
          <div className="space-y-6">
            {/* Sélection de section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Sections</h3>
              <div className="grid grid-cols-1 gap-2">
                {TV_SECTIONS.map(section => (
                  <Button
                    key={section.id}
                    variant={selectedSection === section.id ? "default" : "outline"}
                    onClick={() => setSelectedSection(section.id)}
                    className={`justify-start ${
                      selectedSection === section.id 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "border-blue-200 text-blue-600 hover:bg-blue-50"
                    }`}
                    data-testid={`section-${section.id}`}
                  >
                    {section.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sélection de catégorie */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Catégories</h3>
              <div className="grid grid-cols-2 gap-2">
                {availableCategories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                    className={`text-sm ${
                      selectedCategory === category 
                        ? "bg-green-600 hover:bg-green-700 text-white" 
                        : "border-green-200 text-green-600 hover:bg-green-50"
                    }`}
                    data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            {/* Liste des chaînes */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Chaînes {TV_SECTIONS.find(s => s.id === selectedSection)?.name} - {selectedCategory}
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {filteredChannels.length > 0 ? (
                  filteredChannels.map(channel => (
                    <Card
                      key={channel.id}
                      className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedChannel?.id === channel.id 
                          ? 'ring-2 ring-primary border-primary shadow-lg' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        // Éviter les clics multiples pendant le scroll
                        if (isScrolling) {
                          console.log('📱 [TV CHANNELS] Scroll en cours, clic ignoré');
                          return;
                        }
                        
                        console.log('📱 [TV CHANNELS] ===== CLIC SUR CHAÎNE =====');
                        console.log('📱 [TV CHANNELS] Chaîne sélectionnée:', channel.name);
                        console.log('📱 [TV CHANNELS] Position avant scroll:', window.scrollY);
                        
                        // Sélectionner la chaîne
                        setSelectedChannel(channel);
                        
                        console.log('📱 [TV CHANNELS] ===== FIN CLIC SUR CHAÎNE =====');
                      }}
                      data-testid={`channel-${channel.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {channelLogos[channel.id] ? (
                            // Logo officiel avec fond blanc pour gérer la transparence
                            <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center p-0.5 shadow-sm border">
                              <img 
                                src={channelLogos[channel.id]} 
                                alt={`Logo ${channel.name}`}
                                className="w-full h-full object-contain scale-110"
                                onError={(e) => {
                                  console.log(`[LOGO ERROR] Failed to load logo for ${channel.name}:`, channelLogos[channel.id]);
                                  // Fallback vers l'icône TV avec cadre si le logo ne charge pas
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'block';
                                }}
                                onLoad={() => {
                                  console.log(`[LOGO SUCCESS] Loaded logo for ${channel.name}`);
                                }}
                              />
                            </div>
                          ) : null}
                          {/* Fallback avec cadre seulement si pas de logo */}
                          <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center p-1 shadow-sm border ${channelLogos[channel.id] ? 'hidden' : ''}`}>
                            <Tv className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{channel.name}</h4>
                          </div>
                        </div>
                        <Play className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tv className="w-12 h-12 mx-auto mb-2" />
                    <p>Aucune chaîne disponible</p>
                    <p className="text-sm">pour cette section et catégorie</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CommonLayout>
  );
}
