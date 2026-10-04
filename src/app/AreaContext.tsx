import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "../lib/supabase";

export type ServiceArea = { id: string; name: string; slug: string };

type AreaState = {
  areas: ServiceArea[];
  selectedAreaId: string;
  selectedArea: ServiceArea | null;
  setSelectedAreaId: (areaId: string) => void;
  loading: boolean;
  error: string | null;
};

const AreaContext = createContext<AreaState | null>(null);
const STORAGE_KEY = "localserve-area-id";

export function AreaProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [selectedAreaId, setSelectedAreaIdState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAreas() {
      const cityResult = await supabase
        .from("cities")
        .select("id")
        .eq("slug", "samundri")
        .eq("is_active", true)
        .maybeSingle();

      if (cityResult.error || !cityResult.data) {
        if (mounted) {
          setError("Samundri locations are currently unavailable.");
          setLoading(false);
        }
        return;
      }

      const areasResult = await supabase
        .from("areas")
        .select("id, name, slug")
        .eq("city_id", cityResult.data.id)
        .eq("is_active", true)
        .order("name");

      if (areasResult.error) {
        if (mounted) {
          setError(
            "Could not load Samundri locations. Please try again later.",
          );
          setLoading(false);
        }
        return;
      }

      if (mounted) {
        const availableAreas = areasResult.data ?? [];
        setAreas(availableAreas);
        const storedAreaId = window.localStorage.getItem(STORAGE_KEY);
        const initialArea = availableAreas.some(
          (area) => area.id === storedAreaId,
        )
          ? storedAreaId
          : (availableAreas[0]?.id ?? "");
        setSelectedAreaIdState(initialArea);
        setLoading(false);
      }
    }

    void loadAreas();
    return () => {
      mounted = false;
    };
  }, []);

  function setSelectedAreaId(areaId: string) {
    if (!areas.some((area) => area.id === areaId)) return;
    setSelectedAreaIdState(areaId);
    window.localStorage.setItem(STORAGE_KEY, areaId);
  }

  const selectedArea = useMemo(
    () => areas.find((area) => area.id === selectedAreaId) ?? null,
    [areas, selectedAreaId],
  );

  return (
    <AreaContext.Provider
      value={{
        areas,
        selectedAreaId,
        selectedArea,
        setSelectedAreaId,
        loading,
        error,
      }}
    >
      {children}
    </AreaContext.Provider>
  );
}

export function useAreas() {
  const context = useContext(AreaContext);
  if (!context) throw new Error("useAreas must be used within AreaProvider");
  return context;
}
