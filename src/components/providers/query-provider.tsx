"use client";

import * as React from "react";
import {
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Query } from "@tanstack/query-core";

const PERSIST_STORAGE_KEY = "learnloop-dashboard-queries-v2";

/** Only persist these list views — keeps storage small and avoids serializing the whole app cache. */
const PERSISTED_QUERY_ROOTS = new Set(["requests-feed", "my-sessions"]);

function shouldPersistQuery(query: Query) {
  const root = query.queryKey[0];
  return (
    typeof root === "string" &&
    PERSISTED_QUERY_ROOTS.has(root) &&
    defaultShouldDehydrateQuery(query)
  );
}

function makeClient() {
  const demo = typeof window !== "undefined" && process.env.NEXT_PUBLIC_LEARNLOOP_DEMO === "1";
  return new QueryClient({
    defaultOptions: {
      queries: {
        /** SPA-like feel: fewer surprise refetches; lists opt into their own poll intervals. */
        staleTime: demo ? 5 * 60_000 : 3 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        gcTime: 1000 * 60 * 60 * 12,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(makeClient);
  const persister = React.useMemo(
    () =>
      createSyncStoragePersister({
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        key: PERSIST_STORAGE_KEY,
        throttleTime: 2000,
      }),
    [],
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 12,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => shouldPersistQuery(query),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
