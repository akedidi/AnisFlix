import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import DesktopSidebar from "@/components/DesktopSidebar";

export default function NotFound() {
  return (
    <div className="min-h-screen fade-in-up">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="flex mb-4 gap-2">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <h1 className="text-2xl font-bold">404 Page Not Found</h1>
              </div>

              <p className="mt-4 text-sm text-muted-foreground mb-6">
                La page que vous recherchez n'existe pas ou a été déplacée.
              </p>
              
              <Button 
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Mobile Bottom Navigation */}
      </div>
    </div>
  );
}
