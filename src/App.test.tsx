import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import App from "./App";

function expectSummaryRowValue(label: string, value: string | RegExp): void {
  const labelNode = screen.getByText(label);
  const row = labelNode.closest("div");

  if (!row) {
    throw new Error(`Could not find summary row for label: ${label}`);
  }

  expect(within(row).getByText(value)).toBeInTheDocument();
}

describe("Meat Processor Value Calculator", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the navbar title and annual summary", () => {
    render(<App />);

    expect(
      screen.getByText("Meat Processor Value Calculator"),
    ).toBeInTheDocument();
    expect(screen.getByText("Annual Summary")).toBeInTheDocument();
    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "By Species" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Volume Distribution" }),
    ).toBeInTheDocument();
  });

  it("renders default annual summary values", () => {
    render(<App />);

    expectSummaryRowValue("Total Annual Volume:", "0 lbs");
    expectSummaryRowValue("Total Annual Savings:", "$0.00");
    expectSummaryRowValue("Total Annual Cost:", "$0.00");

    expect(screen.queryByText("All selected species")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Animals processed per year"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Labor value gained")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Savings minus software cost"),
    ).not.toBeInTheDocument();
  });

  it("updates annual summary rows when annual volume changes", () => {
    render(<App />);

    const volumeInput = screen.getByLabelText(
      /Total Annual Hanging Weight \(lbs\)/i,
    );
    fireEvent.change(volumeInput, { target: { value: "1000" } });

    expectSummaryRowValue("Total Annual Volume:", "1,000 lbs");
    expectSummaryRowValue("Total Annual Savings:", "$18.75");
    expectSummaryRowValue("Total Annual Cost:", "$20.00");
  });

  it("shows and hides advanced settings", () => {
    render(<App />);

    expect(
      screen.queryByLabelText(/Time Savings per Animal/i),
    ).not.toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: /expand advanced settings/i }),
    );

    expect(screen.getByLabelText(/Time Savings per Animal/i)).toBeVisible();
    expect(screen.getByLabelText(/Average Hourly Wage/i)).toBeVisible();
  });

  it("can select and remove species", () => {
    render(<App />);

    const selectElement = screen
      .getAllByRole("combobox")
      .find((combobox) => /beef/i.test(combobox.textContent ?? ""));

    expect(selectElement).toBeDefined();
    if (!selectElement) {
      throw new Error("Could not find species combobox");
    }

    fireEvent.mouseDown(selectElement);
    fireEvent.click(screen.getByRole("option", { name: /Hog/i }));

    expect(
      screen.getByText("Beef", { selector: ".MuiChip-label" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Hog", { selector: ".MuiChip-label" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText(/remove beef/i)[0]);
    expect(
      screen.queryByText("Beef", { selector: ".MuiChip-label" }),
    ).not.toBeInTheDocument();
  });
});
