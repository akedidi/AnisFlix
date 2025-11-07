import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useAppNavigation } from "@/lib/useAppNavigation";
import { navPaths } from "@/lib/nativeNavigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  const { navigate } = useAppNavigation();
  
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
                <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
              </div>

              <p className="mt-4 text-sm text-muted-foreground mb-6">
                {t("notFound.description")}
              </p>
              
              <Button 
                onClick={() => navigate(navPaths.home())}
                className="w-full"
                data-testid="button-back-home"
              >
                <Home className="w-4 h-4 mr-2" />
                {t("notFound.backToHome")}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Mobile Bottom Navigation */}
      </div>
    </div>
  );
}
