import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function NetflixMoviesTest() {
  const [test, setTest] = useState("Netflix Movies Test Page");

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-2xl font-semibold">Test Netflix Movies</h1>
        </div>
        
        <div className="text-center py-12">
          <p className="text-lg mb-4">{test}</p>
          <Button onClick={() => setTest("Page fonctionne ! " + new Date().toLocaleTimeString())}>
            Tester
          </Button>
        </div>
      </div>
    </div>
  );
}
