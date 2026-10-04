import { supabase } from "./supabase";

export const SAMUNDRI_CITY_QUERY_KEY = [
  "catalog",
  "samundri-city-uuid",
] as const;

export type PublicProviderProfile = {
  id: string;
  display_name: string;
  bio: string | null;
  is_verified: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export async function fetchSamundriCityId(): Promise<string> {
  const { data, error } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", "samundri")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data || !isUuid(data.id)) {
    throw new Error("Samundri is not available right now.");
  }

  return data.id;
}

export async function fetchPublicProviderProfiles(options: {
  providerIds: string[] | null;
  cityId: string | null;
  areaId: string | null;
  nameQuery?: string | null;
}): Promise<PublicProviderProfile[]> {
  const { data, error } = await supabase.rpc("get_public_provider_profiles", {
    p_provider_ids: options.providerIds,
    p_city_id: options.cityId,
    p_area_id: options.areaId,
    p_name_query: options.nameQuery ?? null,
  });

  if (error) throw error;
  return (data ?? []) as PublicProviderProfile[];
}
