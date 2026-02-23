import type { EAnimalSpecies } from "./types";

export interface ScenarioState {
  selectedSpecies: EAnimalSpecies[];
  volumes: Partial<Record<EAnimalSpecies, string>>;
  timePerAnimal: string;
  hourlyWage: string;
}

export interface SavedScenario extends ScenarioState {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
