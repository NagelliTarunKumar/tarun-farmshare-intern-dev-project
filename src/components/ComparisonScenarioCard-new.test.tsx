import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SavedScenario } from "../scenarios";
import { ComparisonScenarioCard } from "./ComparisonScenarioCard";

function buildScenario(overrides: Partial<SavedScenario> = {}): SavedScenario {
  return {
    id: "scenario-1",
    name: "Scenario Alpha",
    selectedSpecies: ["beef", "hog"],
    volumes: { beef: "700", hog: "200" },
    timePerAnimal: "45",
    hourlyWage: "25",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ComparisonScenarioCard - new", () => {
  it("renames scenario on blur when accepted - new", () => {
    const onRename = vi.fn(() => true);
    render(
      <ComparisonScenarioCard
        scenario={buildScenario()}
        onChange={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText("Scenario name");
    fireEvent.change(nameInput, { target: { value: "Scenario Beta" } });
    fireEvent.blur(nameInput);

    expect(onRename).toHaveBeenCalledWith("scenario-1", "Scenario Beta");
  });

  it("reverts name when rename is rejected - new", () => {
    const onRename = vi.fn(() => false);
    render(
      <ComparisonScenarioCard
        scenario={buildScenario()}
        onChange={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText("Scenario name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Duplicate Name" } });
    fireEvent.blur(nameInput);

    expect(nameInput.value).toBe("Scenario Alpha");
  });

  it("deletes full scenario from top action - new", () => {
    const onDelete = vi.fn();
    render(
      <ComparisonScenarioCard
        scenario={buildScenario()}
        onChange={vi.fn()}
        onRename={vi.fn(() => true)}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByLabelText("Delete scenario Scenario Alpha"));
    expect(onDelete).toHaveBeenCalledWith("scenario-1");
  });

  it("removes a species and its volume via species delete control - new", () => {
    const onChange = vi.fn();
    render(
      <ComparisonScenarioCard
        scenario={buildScenario()}
        onChange={onChange}
        onRename={vi.fn(() => true)}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Remove Beef from Scenario Alpha"));

    const updated = onChange.mock.calls[0]?.[0] as SavedScenario;
    expect(updated.selectedSpecies).toEqual(["hog"]);
    expect(updated.volumes.beef).toBeUndefined();
    expect(updated.volumes.hog).toBe("200");
  });

  it("sanitizes negative numeric edits for time, wage, and species volume - new", () => {
    const onChange = vi.fn();
    render(
      <ComparisonScenarioCard
        scenario={buildScenario()}
        onChange={onChange}
        onRename={vi.fn(() => true)}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Time per animal (min)"), {
      target: { value: "-50" },
    });
    let updated = onChange.mock.calls.at(-1)?.[0] as SavedScenario;
    expect(updated.timePerAnimal).toBe("50");

    fireEvent.change(screen.getByLabelText("Hourly wage ($)"), {
      target: { value: "-30.5" },
    });
    updated = onChange.mock.calls.at(-1)?.[0] as SavedScenario;
    expect(updated.hourlyWage).toBe("30.5");

    fireEvent.change(screen.getAllByLabelText("Volume")[0], {
      target: { value: "-999" },
    });
    updated = onChange.mock.calls.at(-1)?.[0] as SavedScenario;
    expect(updated.volumes.beef).toBe("999");
  });
});
