import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Radio } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function TVChannels() {
  // todo: remove mock functionality
  const mockChannels = [
    { id: 1, name: "TF1", category: "Généraliste", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/TF1_logo_2013.svg/200px-TF1_logo_2013.svg.png", isLive: true },
    { id: 2, name: "France 2", category: "Généraliste", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/France_2_logo_2018.svg/200px-France_2_logo_2018.svg.png", isLive: true },
    { id: 3, name: "M6", category: "Généraliste", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/M6_logo_2009.svg/200px-M6_logo_2009.svg.png", isLive: true },
    { id: 4, name: "Canal+", category: "Cinéma", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/200px-Canal%2B.svg.png", isLive: true },
    { id: 5, name: "Arte", category: "Culture", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Arte_Logo_2017.svg/200px-Arte_Logo_2017.svg.png", isLive: false },
    { id: 6, name: "France 3", category: "Généraliste", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/France_3_logo_2018.svg/200px-France_3_logo_2018.svg.png", isLive: true },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Chaînes TV</h1>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {mockChannels.map((channel) => (
            <Card
              key={channel.id}
              className="p-6 hover-elevate active-elevate-2 cursor-pointer"
              onClick={() => console.log("Play channel:", channel.name)}
              data-testid={`card-channel-${channel.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <Radio className="w-16 h-16 text-muted-foreground" />
                  </div>
                  {channel.isLive && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2">
                      LIVE
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2 w-full">
                  <h3 className="font-semibold text-lg">{channel.name}</h3>
                  <Badge variant="secondary">{channel.category}</Badge>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Play:", channel.name);
                  }}
                  data-testid={`button-play-${channel.name.toLowerCase()}`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  Regarder
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
