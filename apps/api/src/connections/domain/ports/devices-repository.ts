export const DEVICES_REPOSITORY = Symbol('DEVICES_REPOSITORY');

export interface UpsertDeviceInput {
  userId: string;
  macHash: string;
  seenAt: Date;
}

export interface DeviceRow {
  id: string;
  userId: string;
  macHash: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface DevicesRepository {
  upsertByUserAndMacHash(input: UpsertDeviceInput): Promise<DeviceRow>;
}
