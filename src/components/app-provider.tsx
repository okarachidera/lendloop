"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexJwtTemplate =
  process.env.NEXT_PUBLIC_CLERK_CONVEX_JWT_TEMPLATE || "convex";
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function AppProvider({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }
  if (!convex) return <ClerkProvider>{children}</ClerkProvider>;
  return (
    <ClerkProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
        {children}
      </ConvexProviderWithAuth>
    </ClerkProvider>
  );
}

function useConvexAuth() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  return {
    isLoading: !isLoaded,
    isAuthenticated: Boolean(isSignedIn),
    fetchAccessToken: async () => getToken({ template: convexJwtTemplate }),
  };
}
