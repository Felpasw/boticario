export class InvalidPeriodError extends Error {
  constructor(message = 'from must be <= to') {
    super(message);
    this.name = 'InvalidPeriodError';
  }
}
