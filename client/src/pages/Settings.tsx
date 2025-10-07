import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Settings as SettingsIcon, Download } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import DownloadItem from "@/components/DownloadItem";

export default function Settings() {
  const [primaryHost, setPrimaryHost] = useState("https://vidsrc.to");
  const [secondaryHost, setSecondaryHost] = useState("https://vidsrc.me");
  const [backupHost, setBackupHost] = useState("https://vidsrc.xyz");

  // todo: remove mock functionality
  const mockDownloads = [
    {
      id: "1",
      title: "Inception",
      posterPath: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
      quality: "1080p",
      progress: 65,
      status: "downloading" as const,
      size: "1.2 GB",
    },
    {
      id: "2",
      title: "The Dark Knight",
      posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      quality: "720p",
      progress: 100,
      status: "completed" as const,
      size: "800 MB",
    },
  ];

  const handleClearCache = () => {
    console.log("Clearing cache...");
  };

  const handleClearProgress = () => {
    console.log("Clearing watch progress...");
  };

  const handleSaveHosts = () => {
    console.log("Saving hosts:", { primaryHost, secondaryHost, backupHost });
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Paramètres</h1>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        <Tabs defaultValue="downloads" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="downloads" data-testid="tab-downloads">
              Téléchargements
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="downloads" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Mes téléchargements</h2>
            </div>

            {mockDownloads.length > 0 ? (
              <div className="space-y-4">
                {mockDownloads.map((download) => (
                  <DownloadItem
                    key={download.id}
                    {...download}
                    onPause={() => console.log("Pause:", download.id)}
                    onResume={() => console.log("Resume:", download.id)}
                    onDelete={() => console.log("Delete:", download.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Download className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Aucun téléchargement en cours</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <SettingsIcon className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Configuration des sources</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-host">Host Principal</Label>
                  <Input
                    id="primary-host"
                    type="url"
                    value={primaryHost}
                    onChange={(e) => setPrimaryHost(e.target.value)}
                    placeholder="https://vidsrc.to"
                    data-testid="input-primary-host"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-host">Host Secondaire</Label>
                  <Input
                    id="secondary-host"
                    type="url"
                    value={secondaryHost}
                    onChange={(e) => setSecondaryHost(e.target.value)}
                    placeholder="https://vidsrc.me"
                    data-testid="input-secondary-host"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-host">Host de Secours</Label>
                  <Input
                    id="backup-host"
                    type="url"
                    value={backupHost}
                    onChange={(e) => setBackupHost(e.target.value)}
                    placeholder="https://vidsrc.xyz"
                    data-testid="input-backup-host"
                  />
                </div>

                <Button onClick={handleSaveHosts} className="w-full" data-testid="button-save-hosts">
                  Enregistrer les sources
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Gestion des données</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Effacer le cache</h3>
                    <p className="text-sm text-muted-foreground">
                      Supprime les données temporaires
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleClearCache}
                    data-testid="button-clear-cache"
                  >
                    Effacer
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Réinitialiser la progression</h3>
                    <p className="text-sm text-muted-foreground">
                      Supprime l'historique de visionnage
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleClearProgress}
                    data-testid="button-clear-progress"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
