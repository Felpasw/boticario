export class DisconnectedBeforeConnectedError extends Error {
  constructor() {
    super('disconnectedAt must be greater than or equal to connectedAt');
    this.name = 'DisconnectedBeforeConnectedError';
  }
}
