import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VolumeInputCard } from "./VolumeInputCard";

describe("VolumeInputCard - new", () => {
  it("sanitizes negative values before bubbling changes - new", () => {
    const onChange = vi.fn();
    render(
      <VolumeInputCard
        label="Beef"
        avgWeight={700}
        value=""
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Total Annual Hanging Weight/i), {
      target: { value: "-1200" },
    });

    expect(onChange).toHaveBeenCalledWith("1200");
  });

  it("calls remove handler and shows validation text - new", () => {
    const onRemove = vi.fn();
    render(
      <VolumeInputCard
        label="Hog"
        avgWeight={200}
        value=""
        errorText="Volume cannot be negative"
        onChange={vi.fn()}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByLabelText("Remove Hog"));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Volume cannot be negative")).toBeInTheDocument();
  });
});
