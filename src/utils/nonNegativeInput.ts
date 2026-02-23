interface KeyboardLikeEvent {
  key: string;
  preventDefault: () => void;
}

interface WheelLikeEvent {
  currentTarget: { blur: () => void };
}

export function sanitizeNonNegativeInputValue(value: string): string {
  if (!value) return "";

  const withoutMinus = value.replace(/-/g, "");
  if (!withoutMinus) return "";

  const parsed = Number.parseFloat(withoutMinus);
  if (Number.isNaN(parsed)) {
    return withoutMinus;
  }

  return parsed < 0 ? "0" : withoutMinus;
}

export function preventNegativeNumberInput(event: KeyboardLikeEvent): void {
  if (event.key === "-") {
    event.preventDefault();
  }
}

export function preventScrollNumberInputChange(event: WheelLikeEvent): void {
  event.currentTarget.blur();
}
