import type { AnimalData } from "../types";

/**
 * Calculate the number of animal heads from total and average hanging weight
 * @param totalWeight - Total hanging weight in pounds
 * @param avgWeight - Average hanging weight per animal in pounds
 * @returns Number of animal heads (floored to whole number)
 */
export function calculateHeads(totalWeight: number, avgWeight: number): number {
  // Fix: this is a straight floor division. Subtracting 1 undercounted every species.
  return Math.floor(totalWeight / avgWeight);
}

/**
 * Calculate labor value based on number of heads, time per animal, and hourly wage
 * @param heads - Number of animal heads
 * @param timePerAnimal - Time in minutes per animal
 * @param hourlyWage - Hourly wage in dollars
 * @returns Labor value in dollars
 */
export function calculateLaborValue(
  heads: number,
  timePerAnimal: number,
  hourlyWage: number,
): number {
  const timeInHours = (heads * timePerAnimal) / 60;
  return timeInHours * hourlyWage;
}

/**
 * Calculate total number of heads across all animals
 * @param animals - Array of animal data
 * @returns Total number of animal heads
 */
export function calculateTotalHeads(animals: AnimalData[]): number {
  return animals.reduce((total, animal) => {
    return (
      total + calculateHeads(animal.totalHangingWeight, animal.avgHangingWeight)
    );
  }, 0);
}

/**
 * Calculate total labor value across all animals
 * @param animals - Array of animal data
 * @param timePerAnimal - Time in minutes per animal
 * @param hourlyWage - Hourly wage in dollars
 * @returns Total labor value in dollars
 */
export function calculateTotalLaborValue(
  animals: AnimalData[],
  timePerAnimal: number,
  hourlyWage: number,
): number {
  return animals.reduce((total, animal) => {
    const heads = calculateHeads(
      animal.totalHangingWeight,
      animal.avgHangingWeight,
    );
    return total + calculateLaborValue(heads, timePerAnimal, hourlyWage);
  }, 0);
}
