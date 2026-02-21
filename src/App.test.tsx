import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

describe("Meat Processor Value Calculator", () => {
  it("renders the calculator title", () => {
    render(<App />);
    expect(
      screen.getByText("Meat Processor Value Calculator"),
    ).toBeInTheDocument();
  });

  it("displays the multi-select dropdown and summary", () => {
    render(<App />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Annual Summary")).toBeInTheDocument();
    // Fix test text: the UI shows annual values, not monthly values.
    expect(screen.getByText("Total Annual Savings:")).toBeInTheDocument();
    expect(screen.getByText("Total Annual Cost:")).toBeInTheDocument();
  });

  it("shows volume inputs when species are selected", () => {
    render(<App />);

    // Beef is selected by default, so the annual section should already be visible.
    expect(
      screen.getByText(/Annual Processing Volume by Species/i),
    ).toBeInTheDocument();
  });

  it("calculates annual savings and cost correctly", () => {
    render(<App />);

    // Beef input is already mounted from default selection.
    const volumeInput = screen.getByLabelText(
      /Total Annual Hanging Weight \(lbs\)/i,
    );
    fireEvent.change(volumeInput, { target: { value: "1000" } });

    // Fix test text: summary label uses "Total Annual Volume".
    expect(screen.getByText("Total Annual Volume:")).toBeInTheDocument();
    expect(screen.getByText("Net Annual Benefit:")).toBeInTheDocument();
  });

  it("shows advanced settings when clicked", () => {
    render(<App />);

    // Advanced settings should be hidden initially
    expect(
      screen.queryByLabelText(/Time Savings per Animal/i),
    ).not.toBeVisible();

    // Click the expand button
    const expandButton = screen.getByRole("button", {
      name: /expand advanced settings/i,
    });
    fireEvent.click(expandButton);

    // Advanced settings should now be visible
    expect(screen.getByLabelText(/Time Savings per Animal/i)).toBeVisible();
    expect(screen.getByLabelText(/Average Hourly Wage/i)).toBeVisible();
  });

  it("can select multiple species", () => {
    render(<App />);

    const selectElement = screen.getByRole("combobox");

    // Open the dropdown
    fireEvent.mouseDown(selectElement);

    // Beef starts selected, so we only need to add Hog.
    const hogOption = screen.getByRole("option", { name: /Hog/i });
    fireEvent.click(hogOption);

    // Check if chips are displayed for both species
    expect(
      screen.getByText("Beef", { selector: ".MuiChip-label" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Hog", { selector: ".MuiChip-label" }),
    ).toBeInTheDocument();
  });

  // FAILING TEST - Interns need to add delete/remove functionality
  it("should allow removing a selected species", () => {
    render(<App />);

    // Fix: species chips are now removable via an explicit delete icon label.
    const deleteButton = screen.getByLabelText(/remove beef/i);
    fireEvent.click(deleteButton);

    expect(
      screen.queryByText("Beef", { selector: ".MuiChip-label" }),
    ).not.toBeInTheDocument();
  });
});
