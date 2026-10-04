import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import type { AdminData } from "../../lib/admin";
import { AdminErrorState, AdminLoadingState } from "./AdminPageState";

export function AdminDataBoundary({
  query,
  children,
}: {
  query: UseQueryResult<AdminData, Error>;
  children: (data: AdminData) => ReactNode;
}) {
  if (query.isPending) return <AdminLoadingState />;
  if (query.isError) {
    return (
      <AdminErrorState
        message={query.error.message || "Unable to load admin records. Please try again."}
      />
    );
  }
  return <>{children(query.data)}</>;
}
