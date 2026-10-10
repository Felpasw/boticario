import type { AuthUser } from 'shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  user: AuthUser | null;
}

const INITIAL_STATE: UserState = {
  user: null,
};

export const useUserStore = create<UserState>()(
  persist(() => INITIAL_STATE, {
    name: 'boticario:user-store',
  }),
);

export const userStoreActions = {
  setUser: (user: AuthUser) => useUserStore.setState({ user }),
  clear: () => useUserStore.setState({ user: null }),
} as const;

export type { AuthUser };
