import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AreaProvider } from "./app/AreaContext";
import { AppRouter } from "./app/router";
import { AuthProvider } from "./app/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export default function App() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const updateScreenSize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AreaProvider>
          <AppRouter />
          <Toaster
            position={isMobile ? "bottom-center" : "bottom-right"}
            visibleToasts={3}
            closeButton
            duration={3500}
          />
        </AreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
