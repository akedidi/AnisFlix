import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Settings as SettingsIcon, Download } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import DownloadItem from "@/components/DownloadItem";
import CommonLayout from "@/components/CommonLayout";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useOffline } from "@/hooks/useOffline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTrakt } from "@/hooks/useTrakt";

export default function Settings() {
  const { t } = useLanguage();
  const { isNative } = useDeviceType();
  const { isOffline } = useOffline();
  const { isConnected, isLoading, connect, disconnect } = useTrakt();
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
    <CommonLayout showSearch={true} >
      <div className="container mx-auto -mt-16 md:mt-0 px-4 md:px-8 lg:px-12 py-8">
        {isOffline && (
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <p className="text-orange-500 text-sm">
              📱 {t("settings.offlineMode")}
            </p>
          </div>
        )}

        <Tabs defaultValue={isNative ? "downloads" : "general"} className="space-y-6">
          <TabsList className={`grid w-full max-w-md ${isNative ? 'grid-cols-4' : 'grid-cols-1'}`}>
            {isNative && (
              <TabsTrigger value="downloads" data-testid="tab-downloads">
                {t("settings.downloads")}
              </TabsTrigger>
            )}
            <TabsTrigger value="general" data-testid="tab-general">
              {t("settings.general")}
            </TabsTrigger>
            {isNative && (
              <TabsTrigger value="sources" data-testid="tab-sources">
                {t("settings.sources")}
              </TabsTrigger>
            )}
          </TabsList>

          {isNative && (
            <TabsContent value="downloads" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-5 h-5" />
                <h2 className="text-xl font-semibold">{t("settings.myDownloads")}</h2>
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
                  <p className="text-muted-foreground">{t("settings.noDownloads")}</p>
                </Card>
              )}
            </TabsContent>
          )}

          <TabsContent value="general" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <SettingsIcon className="w-5 h-5" />
                <h2 className="text-xl font-semibold">{t("settings.generalSettings")}</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{t("settings.theme")}</h3>
                    <p className="text-sm text-muted-foreground">{t("settings.themeDescription")}</p>
                  </div>
                  <ThemeToggle />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-medium">{t("settings.data")}</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClearCache} className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      {t("settings.clearCache")}
                    </Button>
                    <Button variant="outline" onClick={handleClearProgress} className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      {t("settings.clearHistory")}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <img src="/trakt-icon.png" alt="Trakt" className="w-6 h-6 rounded-lg" />
                    <h3 className="font-medium">Trakt</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isConnected ? "Connected to Trakt. Your watch progress is being synced." : "Connect to Trakt to automatically track your watch progress."}
                  </p>
                  <div className="flex gap-2">
                    {isConnected ? (
                      <Button
                        variant="outline"
                        onClick={disconnect}
                        className="flex items-center gap-2"
                      >
                        Disconnect from Trakt
                      </Button>
                    ) : (
                      <Button
                        onClick={connect}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                      >
                        {isLoading ? "Connecting..." : "Connect to Trakt"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {isNative && (
            <TabsContent value="sources" className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <SettingsIcon className="w-5 h-5" />
                  <h2 className="text-xl font-semibold">{t("settings.sourcesConfiguration")}</h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-host">{t("settings.primaryHost")}</Label>
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
                    <Label htmlFor="secondary-host">{t("settings.secondaryHost")}</Label>
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
                    <Label htmlFor="backup-host">{t("settings.backupHost")}</Label>
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
                    {t("settings.saveSources")}
                  </Button>
                </div>
              </Card>
            </TabsContent>
          )}

        </Tabs>
      </div>
    </CommonLayout>
  );
}
