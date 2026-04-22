const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/

export const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 8 characters long and include at least 1 uppercase letter, 1 lowercase letter, and 1 special character.'

export function isStrongPassword(value) {
  return STRONG_PASSWORD_REGEX.test(String(value || ''))
}
