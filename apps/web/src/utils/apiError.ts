import { isAxiosError } from 'axios';

interface ApiErrorEnvelope {
  error?: string;
  message?: string;
}

export function extractApiErrorMessage(error: unknown): string | null {
  if (!isAxiosError<ApiErrorEnvelope>(error)) return null;
  return error.response?.data?.message ?? null;
}
