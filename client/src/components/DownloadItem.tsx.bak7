import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pause, Play, Trash2 } from "lucide-react";

interface DownloadItemProps {
  id: string;
  title: string;
  posterPath: string | null;
  quality: string;
  progress: number;
  status: "downloading" | "completed" | "paused" | "error";
  size: string;
  onPause?: () => void;
  onResume?: () => void;
  onDelete?: () => void;
}

export default function DownloadItem({
  title,
  posterPath,
  quality,
  progress,
  status,
  size,
  onPause,
  onResume,
  onDelete,
}: DownloadItemProps) {
  const imageUrl = posterPath
    ? `https://image.tmdb.org/t/p/w92${posterPath}`
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='92' height='138'%3E%3Crect fill='%23334155' width='92' height='138'/%3E%3C/svg%3E";

  const statusColor = {
    downloading: "chart-2",
    completed: "chart-2",
    paused: "chart-3",
    error: "destructive",
  };

  const statusLabel = {
    downloading: "Téléchargement...",
    completed: "Terminé",
    paused: "En pause",
    error: "Erreur",
  };

  return (
    <Card className="p-4" data-testid={`download-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex gap-4">
        <img
          src={imageUrl}
          alt={title}
          className="w-20 h-30 object-cover rounded"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold truncate">{title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{quality}</Badge>
                <span className="text-xs text-muted-foreground">{size}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {status === "downloading" && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onPause}
                  data-testid="button-pause-download"
                >
                  <Pause className="w-4 h-4" />
                </Button>
              )}
              {status === "paused" && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onResume}
                  data-testid="button-resume-download"
                >
                  <Play className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                data-testid="button-delete-download"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={`text-${statusColor[status]}`}>
                {statusLabel[status]}
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>
    </Card>
  );
}
