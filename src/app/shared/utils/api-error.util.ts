export function getApiErrorMessage(error: any, fallbackMessage: string): string {
  if (!error) {
    return fallbackMessage;
  }

  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error;
  }

  if (error.error?.message && typeof error.error.message === 'string') {
    return error.error.message;
  }

  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  return fallbackMessage;
}
