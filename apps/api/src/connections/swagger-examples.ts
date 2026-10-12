export const CONNECTION_EXAMPLE = {
  id: '2829aa58-73e7-4cdd-8a17-17fe80ae98bc',
  deviceId: 'c7006af8-cf05-4822-884b-816b2311554d',
  connectedAt: '2026-10-11T12:00:00.000Z',
  disconnectedAt: '2026-10-11T12:15:00.000Z',
  durationSeconds: 900,
};

export const REGISTER_CREATED_EXAMPLE = { created: true, connection: CONNECTION_EXAMPLE };

export const REGISTER_IDEMPOTENT_EXAMPLE = { created: false, connection: CONNECTION_EXAMPLE };

export const DISCONNECTED_BEFORE_CONNECTED_EXAMPLE = {
  statusCode: 422,
  error: 'DISCONNECTED_BEFORE_CONNECTED',
  message: 'disconnectedAt must be greater than or equal to connectedAt',
  timestamp: '2026-10-12T10:00:00.000Z',
  path: '/connections',
};

export const CONNECTIONS_LIST_EXAMPLE = {
  data: [
    CONNECTION_EXAMPLE,
    {
      id: 'eaf86090-a8f0-4634-89a7-24f72618e317',
      deviceId: 'aa08dda4-e401-4433-ab90-2b9414d63231',
      connectedAt: '2026-10-11T11:40:00.000Z',
      disconnectedAt: null,
      durationSeconds: null,
    },
  ],
  page: 1,
  perPage: 50,
  total: 234,
  totalPages: 5,
};
