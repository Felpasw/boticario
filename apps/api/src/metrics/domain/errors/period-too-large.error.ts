export class PeriodTooLargeError extends Error {
  constructor(maxDays: number) {
    super(`period window must be <= ${maxDays} days`);
    this.name = 'PeriodTooLargeError';
  }
}
