import { create } from 'zustand';

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

// Initialize auth from localStorage (client-side only)
export const initializeAuth = () => {
  if (typeof window === 'undefined') return;

  const netlifyIdentity = (window as any).netlifyIdentity;
  if (!netlifyIdentity) return;

  netlifyIdentity.on('init', (user: User | null) => {
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

  netlifyIdentity.on('login', (user: User) => {
    useAuthStore.setState({
      user,
      isAuthenticated: true,
    });
    netlifyIdentity.close();
  });

  netlifyIdentity.on('logout', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    });
  });

  netlifyIdentity.init();
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
