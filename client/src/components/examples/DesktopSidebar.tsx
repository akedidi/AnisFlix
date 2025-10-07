import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import DesktopSidebar from "../DesktopSidebar";

export default function DesktopSidebarExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen">
        <DesktopSidebar />
      </div>
    </QueryClientProvider>
  );
}
