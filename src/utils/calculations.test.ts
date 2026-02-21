import { describe, it, expect } from "vitest";
import {
  calculateHeads,
  calculateLaborValue,
  calculateTotalHeads,
  calculateTotalLaborValue,
} from "./calculations";
import type { AnimalData } from "../types";
import { EAnimalSpecies } from "../types";

describe("calculations utils", () => {
  describe("calculateHeads", () => {
    it("should calculate number of heads from total and average weight", () => {
      expect(calculateHeads(1000, 500)).toBe(2); // Should be 2
      expect(calculateHeads(1500, 300)).toBe(5); // Should be 5
    });

    it("should handle exact divisions", () => {
      expect(calculateHeads(1000, 250)).toBe(4); // Should be 4
    });

    it("should floor partial animals", () => {
      // 1000 / 333 = 3.003..., floor should return 3 heads.
      expect(calculateHeads(1000, 333)).toBe(3);
    });

    it("should handle single animal", () => {
      expect(calculateHeads(500, 500)).toBe(1); // Should be 1
    });

    it("should handle zero total weight", () => {
      expect(calculateHeads(0, 500)).toBe(0); // Should be 0
    });
  });

  describe("calculateLaborValue", () => {
    it("should calculate labor value correctly", () => {
      // 2 heads * 30 minutes = 60 minutes = 1 hour * $25 = $25
      expect(calculateLaborValue(2, 30, 25)).toBe(25);
    });

    it("should handle 1 hour worth of work", () => {
      // 2 heads * 30 minutes = 1 hour
      expect(calculateLaborValue(2, 30, 25)).toBe(25);
    });

    it("should handle fractional hours", () => {
      // 1 head * 30 minutes = 0.5 hours * $25 = $12.50
      // Fix test expectation: previous value (15) didn't match the formula above.
      expect(calculateLaborValue(1, 30, 25)).toBe(12.5);
    });

    it("should handle different time per animal", () => {
      // 4 heads * 15 minutes = 60 minutes = 1 hour * $25 = $25
      expect(calculateLaborValue(4, 15, 25)).toBe(25);
    });

    it("should handle different hourly wage", () => {
      // 2 heads * 30 minutes = 1 hour * $50 = $50
      expect(calculateLaborValue(2, 30, 50)).toBe(50);
    });

    it("should handle zero heads", () => {
      expect(calculateLaborValue(0, 30, 25)).toBe(0);
    });
  });

  describe("calculateTotalHeads", () => {
    it("should calculate total heads across multiple animals", () => {
      const animals: AnimalData[] = [
        {
          species: EAnimalSpecies.beef,
          totalHangingWeight: 1000,
          avgHangingWeight: 500,
        },
        {
          species: EAnimalSpecies.hog,
          totalHangingWeight: 800,
          avgHangingWeight: 200,
        },
      ];
      // Should be 2 + 4 = 6
      expect(calculateTotalHeads(animals)).toBe(6);
    });

    it("should handle empty array", () => {
      expect(calculateTotalHeads([])).toBe(0);
    });

    it("should handle single animal", () => {
      const animals: AnimalData[] = [
        {
          species: EAnimalSpecies.bison,
          totalHangingWeight: 1500,
          avgHangingWeight: 300,
        },
      ];
      // Should be 5
      expect(calculateTotalHeads(animals)).toBe(5);
    });
  });

  describe("calculateTotalLaborValue", () => {
    it("should calculate total labor value across multiple animals", () => {
      const animals: AnimalData[] = [
        {
          species: EAnimalSpecies.beef,
          totalHangingWeight: 1000,
          avgHangingWeight: 500,
        }, // 2 heads
        {
          species: EAnimalSpecies.hog,
          totalHangingWeight: 600,
          avgHangingWeight: 200,
        }, // 3 heads
      ];
      // Total should be $62.50 (2 heads * 30 min = 1 hr * $25 = $25) + (3 heads * 30 min = 1.5 hrs * $25 = $37.50)
      expect(calculateTotalLaborValue(animals, 30, 25)).toBe(62.5);
    });

    it("should handle empty array", () => {
      expect(calculateTotalLaborValue([], 30, 25)).toBe(0);
    });

    it("should handle different time and wage parameters", () => {
      const animals: AnimalData[] = [
        {
          species: EAnimalSpecies.lamb,
          totalHangingWeight: 400,
          avgHangingWeight: 100,
        }, // 4 heads
      ];
      // 4 heads * 15 min = 60 min = 1 hr * $30 = $30
      expect(calculateTotalLaborValue(animals, 15, 30)).toBe(30);
    });

    it("should calculate correctly with multiple species", () => {
      const animals: AnimalData[] = [
        {
          species: EAnimalSpecies.beef,
          totalHangingWeight: 2000,
          avgHangingWeight: 500,
        }, // 4 heads
        {
          species: EAnimalSpecies.hog,
          totalHangingWeight: 800,
          avgHangingWeight: 200,
        }, // 4 heads
        {
          species: EAnimalSpecies.lamb,
          totalHangingWeight: 300,
          avgHangingWeight: 100,
        }, // 3 heads
      ];
      // Fix expected total after head-count bug fix:
      // 4 heads * 30 min = 2 hrs * $25 = $50
      // 4 heads * 30 min = 2 hrs * $25 = $50
      // 3 heads * 30 min = 1.5 hrs * $25 = $37.50
      // Total = $137.50
      expect(calculateTotalLaborValue(animals, 30, 25)).toBe(137.5);
    });
  });
});
