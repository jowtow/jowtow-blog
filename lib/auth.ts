import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user }),
  setIsAuthenticated: (value) => set({ isAuthenticated: value }),
  setIsLoading: (value) => set({ isLoading: value }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

let authInitialized = false;

// Initialize auth from localStorage (client-side only)
export const initializeAuth = () => {
  if (typeof window === "undefined") return;

  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const devBypassEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS !== "false";

  if (isLocalHost && devBypassEnabled) {
    useAuthStore.setState({
      user: {
        id: "local-dev-admin",
        email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "local-dev-admin@localhost",
      },
      isAuthenticated: true,
      isLoading: false,
    });
    return;
  }

  // Prevent duplicate listeners in React Strict Mode (dev).
  if (authInitialized) return;
  authInitialized = true;

  const configuredApiUrl = process.env.NEXT_PUBLIC_IDENTITY_URL;
  // In local dev, always target the local Netlify proxy to avoid redirecting to production.
  const apiUrl = isLocalHost
    ? `${window.location.origin}/.netlify/identity`
    : configuredApiUrl;
  let attempts = 0;
  const maxAttempts = 20;

  const attachAndInit = () => {
    const netlifyIdentity = (window as any).netlifyIdentity;

    if (!netlifyIdentity) {
      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(attachAndInit, 250);
        return;
      }

      useAuthStore.setState({ isLoading: false });
      return;
    }

    const initTimeout = window.setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        useAuthStore.setState({ isLoading: false });
      }
    }, 5000);

    netlifyIdentity.on("init", (user: User | null) => {
      window.clearTimeout(initTimeout);
      if (user) {
        useAuthStore.setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        useAuthStore.setState({ isLoading: false });
      }
    });

    netlifyIdentity.on("login", (user: User) => {
      useAuthStore.setState({
        user,
        isAuthenticated: true,
      });
      netlifyIdentity.close();
    });

    netlifyIdentity.on("logout", () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
      });
    });

    netlifyIdentity.init(apiUrl ? { APIUrl: apiUrl } : undefined);
  };

  attachAndInit();
};

export const loginWithNetlify = () => {
  const netlifyIdentity = (window as any).netlifyIdentity;
  if (netlifyIdentity) {
    netlifyIdentity.open();
  }
};

export const logoutFromNetlify = async () => {
  const netlifyIdentity = (window as any).netlifyIdentity;
  if (netlifyIdentity) {
    await netlifyIdentity.logout();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    });
  }
};

export const getCurrentUser = () => {
  const netlifyIdentity = (window as any).netlifyIdentity;
  if (netlifyIdentity) {
    return netlifyIdentity.currentUser();
  }
  return null;
};
