export interface LoginWithPasswordInput {
  email: string;
  password: string;
}

export interface LoginWithPasswordResult {
  user: { id: string; email: string; name: string };
  sessionId: string;
  expiresAt: Date;
}
