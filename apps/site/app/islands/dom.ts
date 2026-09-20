export const inputValue = (event: Event): string =>
  (event.target as { value?: string } | null)?.value ?? '';

export const numberValue = (event: Event): number => Number(inputValue(event));
