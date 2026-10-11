export class InvalidMacAddressError extends Error {
  constructor() {
    super('invalid IEEE 802 MAC address');
    this.name = 'InvalidMacAddressError';
  }
}
