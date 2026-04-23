/**
 * Capitalizes only the very first character of a string.
 * The rest of the string is left exactly as the user typed it,
 * so the user can still use lowercase if they prefer.
 *
 * Usage in an onChange handler:
 *   onChange={(e) => setName(capFirst(e.target.value))}
 */
export function capFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Returns an onChange handler that automatically capitalizes the
 * first letter before calling the provided setter/callback.
 *
 * Usage:
 *   onChange={withCapFirst(setName)}
 *   onChange={withCapFirst((v) => setForm(p => ({ ...p, name: v })))}
 */
export function withCapFirst(
  setter: (value: string) => void
): React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> {
  return (e) => setter(capFirst(e.target.value));
}
