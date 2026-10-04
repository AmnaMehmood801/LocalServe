import { useQuery } from "@tanstack/react-query";

import { fetchAdminData } from "../../lib/admin";

export function useAdminData() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: fetchAdminData,
  });
}
