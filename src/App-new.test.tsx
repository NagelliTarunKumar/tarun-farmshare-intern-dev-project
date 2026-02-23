import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";

describe("App scenario workflows - new", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves a calculator scenario and shows it in comparison tab - new", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Save Scenario" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Scenario name")).toHaveValue("Scenario 1");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Comparison" }));
    expect(screen.getByDisplayValue("Scenario 1")).toBeInTheDocument();
  });

  it("blocks duplicate scenario names - new", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Save Scenario" }));
    let dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Scenario name"), {
      target: { value: "Ops Plan" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Scenario" }));
    dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Scenario name"), {
      target: { value: "Ops Plan" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Comparison" }));
    expect(screen.getAllByDisplayValue("Ops Plan")).toHaveLength(1);
  });

  it("creates and restores a comparison scenario from local storage - new", async () => {
    const firstRender = render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Comparison" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Scenario" }));

    let dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Scenario name"), {
      target: { value: "Comparison Plan" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("Comparison Plan")).toBeInTheDocument();
    firstRender.unmount();

    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Comparison" }));
    expect(screen.getByDisplayValue("Comparison Plan")).toBeInTheDocument();
  });

  it("restores calculator species and volumes after refresh - new", () => {
    const firstRender = render(<App />);

    const speciesSelect = screen
      .getAllByRole("combobox")
      .find((combobox) => /beef/i.test(combobox.textContent ?? ""));
    if (!speciesSelect) {
      throw new Error("Could not find species selector");
    }

    fireEvent.mouseDown(speciesSelect);
    fireEvent.click(screen.getByRole("option", { name: /Hog/i }));

    const volumeInputs = screen.getAllByLabelText(/Total Annual Hanging Weight \(lbs\)/i);
    fireEvent.change(volumeInputs[0], { target: { value: "1234" } });
    fireEvent.change(volumeInputs[1], { target: { value: "5678" } });

    firstRender.unmount();
    render(<App />);

    expect(
      screen.getByText("Hog", { selector: ".MuiChip-label" }),
    ).toBeInTheDocument();
    const restoredInputs = screen.getAllByLabelText(/Total Annual Hanging Weight \(lbs\)/i);
    const restoredValues = restoredInputs.map((input) => (input as HTMLInputElement).value);
    expect(restoredValues).toEqual(expect.arrayContaining(["1234", "5678"]));
  });
});
