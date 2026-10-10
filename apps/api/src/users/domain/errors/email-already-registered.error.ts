export class EmailAlreadyRegisteredError extends Error {
  constructor(public readonly email: string) {
    super(`Email already registered: ${email}`);
    this.name = 'EmailAlreadyRegisteredError';
  }
}
