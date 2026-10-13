import { useState } from 'react';

/**
 * The value, or while it is null the last non-null value it held. Lets a
 * panel or dialog keep showing its content while it animates closed after the
 * state behind it has been cleared.
 */
export function useRetained<T>(value: T | null): T | null {
  const [retained, setRetained] = useState(value);
  if (value !== null && value !== retained) setRetained(value);
  return value ?? retained;
}
