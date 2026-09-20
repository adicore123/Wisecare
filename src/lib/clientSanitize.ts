/**
 * Credential fields never leave the server in API responses.
 * Patients receive their credentials directly via WhatsApp (sent server-side);
 * therapists only ever see the boolean "a password is set".
 */
const CLIENT_SECRET_FIELDS = ['password', 'initialPassword', 'resetOtp', 'pin'] as const;

export function sanitizeClient<T extends Record<string, any>>(client: T | null | undefined): T | Record<string, any> {
  if (!client) return client as T | undefined as unknown as Record<string, any>;
  const safe: Record<string, any> = { ...client };
  for (const field of CLIENT_SECRET_FIELDS) {
    delete safe[field];
  }
  return safe;
}

export function sanitizeClients<T extends Record<string, any>>(clients: T[]): Record<string, any>[] {
  return (clients || []).map(c => sanitizeClient(c));
}
