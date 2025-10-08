import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
// @ts-ignore - mux.js n'a pas de types TypeScript officiels
import muxjs from "mux.js";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  type?: "m3u8" | "mp4" | "auto";
  title?: string;
  onClose?: () => void;
}

export default function VideoPlayer({ src, type = "auto", title = "Vidéo" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sourceType, setSourceType] = useState<"m3u8" | "mp4">("mp4");

  useEffect(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    
    // Détection automatique du type de source
    const detectedType = type === "auto" 
      ? (src.includes(".m3u8") || src.includes("m3u8") ? "m3u8" : "mp4")
      : type;
    
    setSourceType(detectedType);

    if (detectedType === "m3u8") {
      // Lecture HLS
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(err => console.warn("Autoplay failed:", err));
        });
        
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.error("HLS error:", data);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(err => console.warn("Autoplay failed:", err));
        });
      }
    } else {
      // Lecture MP4 directe
      video.src = src;
      video.load();
      video.play().catch(err => console.warn("Autoplay failed:", err));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, type]);

  const handleDownloadMP4 = async () => {
    if (!hlsRef.current || sourceType !== "m3u8") {
      alert("Le téléchargement MP4 n'est disponible que pour les flux HLS (m3u8)");
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const hls = hlsRef.current;
      
      // Attendre que le manifest soit chargé
      if (!hls.levels?.length) {
        await new Promise(resolve => hls.once(Hls.Events.MANIFEST_PARSED, resolve));
      }

      let details = hls.levels[hls.currentLevel]?.details;
      if (!details || !details.fragments?.length) {
        await new Promise(resolve => {
          hls.once(Hls.Events.LEVEL_LOADED, (_, data: any) => {
            if (data.details.fragments.length > 0) resolve(null);
          });
          hls.startLoad();
        });
        details = hls.levels[hls.currentLevel]?.details;
      }

      if (!details) throw new Error('Impossible de charger les détails du niveau HLS.');
      
      const frags = details.fragments;
      if (!frags?.length) throw new Error('Aucun segment TS trouvé.');

      const transmuxer = new muxjs.mp4.Transmuxer();
      let initSegment: Uint8Array | null = null;
      const mediaSegments: Uint8Array[] = [];
      
      transmuxer.on('data', (segment: any) => {
        if (segment.initSegment) {
          initSegment = segment.initSegment;
        }
        if (segment.data) {
          mediaSegments.push(segment.data);
        }
      });
      
      const transmuxerDone = new Promise(resolve => transmuxer.on('done', resolve));

      // Récupérer l'URL de base pour résoudre les URLs relatives
      const baseUrl = details.url ? new URL(details.url) : null;
      
      for (let i = 0; i < frags.length; i++) {
        let fragUrl: string;
        
        if (frags[i].url.startsWith('http://') || frags[i].url.startsWith('https://')) {
          // URL absolue
          fragUrl = frags[i].url;
        } else if (baseUrl) {
          // URL relative avec baseUrl disponible
          fragUrl = new URL(frags[i].url, baseUrl).toString();
        } else if (frags[i].baseurl) {
          // Utiliser baseurl du fragment si disponible
          fragUrl = new URL(frags[i].url, frags[i].baseurl).toString();
        } else {
          throw new Error(`Impossible de résoudre l'URL du fragment ${i}`);
        }
        
        const resp = await fetch(fragUrl);
        if (!resp.ok) {
          throw new Error(`Erreur lors du téléchargement du segment ${i}: ${resp.status}`);
        }
        
        const tsSegment = new Uint8Array(await resp.arrayBuffer());
        transmuxer.push(tsSegment);
        setDownloadProgress(Math.round(((i + 1) / frags.length) * 100));
      }
      
      transmuxer.flush();
      await transmuxerDone;

      if (!initSegment) throw new Error("Le segment d'initialisation MP4 n'a pas pu être créé.");

      const mp4Blob = new Blob([initSegment, ...mediaSegments], { type: 'video/mp4' });
      await saveBlob(mp4Blob, `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`);
      
      alert('Téléchargement MP4 terminé avec succès !');

    } catch (e: any) {
      console.error(e);
      alert('Échec du téléchargement MP4 : ' + e.message);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleImportMP4 = () => {
    if (!isDownloading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileUrl = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = fileUrl;
      videoRef.current.load();
      videoRef.current.play().catch(err => console.warn("Autoplay failed:", err));
    }
    // Réinitialiser l'input pour permettre de réimporter le même fichier
    e.target.value = '';
  };

  async function saveBlob(blob: Blob, name: string) {
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: name,
          types: [{
            description: 'MPEG-4 Video',
            accept: { 'video/mp4': ['.mp4'] }
          }]
        });
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
        return;
      } catch (e) {
        console.warn('File picker annulé ou échoué, fallback sur <a>');
      }
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  return (
    <div className="w-full bg-card rounded-lg overflow-hidden shadow-xl">
      <video
        ref={videoRef}
        className="w-full aspect-video bg-black"
        controls
        playsInline
        preload="auto"
        data-testid="video-player-main"
      />
      
      <div className="p-4 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {sourceType === "m3u8" && (
            <Button
              onClick={handleDownloadMP4}
              disabled={isDownloading}
              className="gap-2"
              data-testid="button-download-mp4"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? `Téléchargement... ${downloadProgress}%` : 'Télécharger en MP4'}
            </Button>
          )}
          
          <Button
            onClick={handleImportMP4}
            variant="secondary"
            className="gap-2"
            disabled={isDownloading}
            data-testid="button-import-mp4"
          >
            <Upload className="w-4 h-4" />
            Importer MP4
          </Button>
        </div>

        {isDownloading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Téléchargement & Conversion</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          • <strong>Téléchargement MP4 :</strong> Convertit le flux HLS (.ts) en fichier MP4 standard.
          <br />
          • <strong>Import MP4 :</strong> Lecture native de fichiers MP4 locaux.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,video/mp4"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
