import { beforeEach, describe, expect, it } from 'vitest';

import { useUserStore, userStoreActions } from './userStore';

const ADMIN = {
  id: '7f1c2d8b-5e46-4c6d-9c6e-3c3f9b7a1e2a',
  email: 'admin@boticario.local',
  name: 'Admin',
};

describe('userStore', () => {
  beforeEach(() => {
    userStoreActions.clear();
  });

  it('starts empty', () => {
    expect(useUserStore.getState().user).toBeNull();
  });

  it('stores the authenticated user', () => {
    userStoreActions.setUser(ADMIN);
    expect(useUserStore.getState().user).toEqual(ADMIN);
  });

  it('clears the stored user', () => {
    userStoreActions.setUser(ADMIN);
    userStoreActions.clear();
    expect(useUserStore.getState().user).toBeNull();
  });
});
