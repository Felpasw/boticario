export const USER_EXAMPLE = {
  id: '085bb29b-9af1-4d7b-9499-c40106ee9691',
  email: 'admin@boticario.local',
  name: 'Admin',
};

export const LOGIN_SUCCESS_EXAMPLE = { user: USER_EXAMPLE };

export const INVALID_CREDENTIALS_EXAMPLE = {
  statusCode: 401,
  error: 'INVALID_CREDENTIALS',
  message: 'email ou senha inválidos',
  timestamp: '2026-10-12T10:00:00.000Z',
  path: '/auth/login',
};
