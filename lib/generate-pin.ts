/**
 * Generates a random 6-digit access PIN for school authentication
 * @returns A 6-digit string PIN
 */
export function generateAccessPin(): string {
  // Generate a random 6-digit number (100000 to 999999)
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  return pin;
}

/**
 * Validates if a PIN matches the expected format
 * @param pin - The PIN to validate
 * @returns boolean indicating if PIN is valid
 */
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
