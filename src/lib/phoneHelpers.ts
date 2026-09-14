/**
 * Utility functions for phone number normalization and validation.
 */

export const TEST_PHONE_NUMBER = '0509611808';

/**
 * Normalizes an Israeli phone number to standard 10-digit format (e.g. 0509611808)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  
  // Format international +972 or 972 to standard 0 prefix
  if (digits.startsWith('972')) {
    return '0' + digits.slice(3);
  }
  
  return digits;
}

/**
 * Checks if the given phone number is the authorized test number.
 * The test number (0509611808) is allowed to be registered multiple times without uniqueness restriction.
 */
export function isTestPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return normalizePhone(phone) === TEST_PHONE_NUMBER;
}
