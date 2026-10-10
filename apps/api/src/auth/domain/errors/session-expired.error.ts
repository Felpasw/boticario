export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired or invalid');
    this.name = 'SessionExpiredError';
  }
}
