import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeleteIconButton } from "./DeleteIconButton";

describe("DeleteIconButton - new", () => {
  it("renders and triggers click handler - new", () => {
    const onClick = vi.fn();
    render(
      <DeleteIconButton
        title="Remove Beef"
        ariaLabel="Remove Beef"
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByLabelText("Remove Beef"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
