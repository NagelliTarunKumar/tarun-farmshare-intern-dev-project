import { describe, expect, it, vi } from "vitest";
import {
  preventNegativeNumberInput,
  sanitizeNonNegativeInputValue,
} from "./nonNegativeInput";

describe("nonNegativeInput helpers - new", () => {
  it("sanitizes negative numeric strings - new", () => {
    expect(sanitizeNonNegativeInputValue("-42")).toBe("42");
    expect(sanitizeNonNegativeInputValue("1-2-3")).toBe("123");
    expect(sanitizeNonNegativeInputValue("-0.5")).toBe("0.5");
  });

  it("keeps non-negative and non-numeric text stable - new", () => {
    expect(sanitizeNonNegativeInputValue("0")).toBe("0");
    expect(sanitizeNonNegativeInputValue("25.5")).toBe("25.5");
    expect(sanitizeNonNegativeInputValue("abc")).toBe("abc");
    expect(sanitizeNonNegativeInputValue("")).toBe("");
  });

  it("prevents minus key and allows others - new", () => {
    const preventDefault = vi.fn();
    preventNegativeNumberInput({ key: "-", preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);

    const preventDefaultForDigit = vi.fn();
    preventNegativeNumberInput({ key: "1", preventDefault: preventDefaultForDigit });
    expect(preventDefaultForDigit).not.toHaveBeenCalled();
  });
});
