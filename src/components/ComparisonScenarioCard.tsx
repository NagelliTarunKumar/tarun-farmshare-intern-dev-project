import { useEffect, useState } from "react";
import {
  Box,
  Card,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { EAnimalSpecies } from "../types";
import { EAnimalSpecies as AnimalSpecies, AVG_HANGING_WEIGHTS } from "../types";
import { calculateHeads, calculateLaborValue } from "../utils/calculations";
import {
  preventNegativeNumberInput,
  preventScrollNumberInputChange,
  sanitizeNonNegativeInputValue,
} from "../utils/nonNegativeInput";
import type { SavedScenario } from "../scenarios";
import { DeleteIconButton } from "./DeleteIconButton";

const COST_PER_LB = 0.02;
const AVAILABLE_SPECIES = Object.values(AnimalSpecies) as EAnimalSpecies[];

interface ComparisonScenarioCardProps {
  scenario: SavedScenario;
  onChange: (next: SavedScenario) => void;
  onRename: (
    scenarioId: string,
    nextName: string,
    options?: { silent?: boolean },
  ) => boolean;
  onDelete: (scenarioId: string) => void;
}

function formatSpeciesLabel(species: EAnimalSpecies): string {
  return species.charAt(0).toUpperCase() + species.slice(1);
}

function parsePositiveNumber(value: string | undefined): number {
  if (!value || value.trim() === "") return 0;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(parsed, 0);
}

export function ComparisonScenarioCard({
  scenario,
  onChange,
  onRename,
  onDelete,
}: ComparisonScenarioCardProps) {
  const [scenarioNameDraft, setScenarioNameDraft] = useState(scenario.name);

  useEffect(() => {
    setScenarioNameDraft(scenario.name);
  }, [scenario.name]);

  const updateScenario = (patch: Partial<SavedScenario>) => {
    onChange({ ...scenario, ...patch, updatedAt: new Date().toISOString() });
  };

  const effectiveTimePerAnimal = parsePositiveNumber(scenario.timePerAnimal);
  const effectiveHourlyWage = parsePositiveNumber(scenario.hourlyWage);

  const speciesMetrics = scenario.selectedSpecies.map((species) => {
    const volume = parsePositiveNumber(scenario.volumes[species]);
    const heads = calculateHeads(volume, AVG_HANGING_WEIGHTS[species]);
    const savings = calculateLaborValue(heads, effectiveTimePerAnimal, effectiveHourlyWage);
    const cost = volume * COST_PER_LB;

    return {
      species,
      volume,
      heads,
      savings,
      cost,
    };
  });

  const totalVolume = speciesMetrics.reduce((sum, metric) => sum + metric.volume, 0);
  const totalSavings = speciesMetrics.reduce((sum, metric) => sum + metric.savings, 0);
  const totalCost = speciesMetrics.reduce((sum, metric) => sum + metric.cost, 0);
  const netBenefit = totalSavings - totalCost;

  const handleSpeciesChange = (event: SelectChangeEvent<EAnimalSpecies[]>) => {
    const rawValue = event.target.value;
    const nextSpecies = (typeof rawValue === "string" ? rawValue.split(",") : rawValue)
      .filter((value): value is EAnimalSpecies => AVAILABLE_SPECIES.includes(value as EAnimalSpecies));

    const deduped = Array.from(new Set(nextSpecies));
    const nextVolumes: Partial<Record<EAnimalSpecies, string>> = {};

    // Keep only volumes that still correspond to selected species.
    for (const species of deduped) {
      nextVolumes[species] = scenario.volumes[species] ?? "";
    }

    updateScenario({ selectedSpecies: deduped, volumes: nextVolumes });
  };

  const handleVolumeChange = (species: EAnimalSpecies, value: string) => {
    const sanitizedValue = sanitizeNonNegativeInputValue(value);
    updateScenario({
      volumes: {
        ...scenario.volumes,
        [species]: sanitizedValue,
      },
    });
  };

  const handleRemoveSpecies = (speciesToRemove: EAnimalSpecies) => {
    const nextSpecies = scenario.selectedSpecies.filter((species) => species !== speciesToRemove);
    const nextVolumes = { ...scenario.volumes };
    delete nextVolumes[speciesToRemove];
    updateScenario({ selectedSpecies: nextSpecies, volumes: nextVolumes });
  };

  return (
    <Card
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 3,
        border: "2px solid rgba(15, 23, 42, 0.2)",
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.08)",
        background: "#ffffff",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <TextField
          fullWidth
          size="small"
          label="Scenario name"
          value={scenarioNameDraft}
          onChange={(event) => {
            const nextValue = event.target.value;
            setScenarioNameDraft(nextValue);

            const candidate = nextValue.trim();
            if (candidate) {
              onRename(scenario.id, candidate, { silent: true });
            }
          }}
          onBlur={() => {
            const accepted = onRename(scenario.id, scenarioNameDraft);
            if (!accepted) {
              setScenarioNameDraft(scenario.name);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const accepted = onRename(scenario.id, scenarioNameDraft);
              if (!accepted) {
                setScenarioNameDraft(scenario.name);
              }
            }
          }}
        />
        <Tooltip title="Delete scenario">
          <IconButton
            color="error"
            onClick={() => onDelete(scenario.id)}
            aria-label={`Delete scenario ${scenario.name}`}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel id={`comparison-species-label-${scenario.id}`}>Species</InputLabel>
        <Select
          multiple
          labelId={`comparison-species-label-${scenario.id}`}
          value={scenario.selectedSpecies}
          label="Species"
          onChange={handleSpeciesChange}
          input={<OutlinedInput label="Species" />}
          renderValue={(selected) => {
            const selectedValues = selected as EAnimalSpecies[];
            if (selectedValues.length === 0) {
              return (
                <Typography variant="body2" color="text.secondary">
                  Select species
                </Typography>
              );
            }

            return (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                {selectedValues.map((species) => (
                  <Box
                    key={species}
                    sx={{
                      px: 0.9,
                      py: 0.2,
                      borderRadius: 999,
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      color: "#fff",
                      backgroundColor: "#16a34a",
                    }}
                  >
                    {formatSpeciesLabel(species)}
                  </Box>
                ))}
              </Box>
            );
          }}
        >
          {AVAILABLE_SPECIES.map((species) => (
            <MenuItem key={species} value={species}>
              {formatSpeciesLabel(species)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.2 }}>
        <TextField
          fullWidth
          size="small"
          label="Time per animal (min)"
          type="number"
          value={scenario.timePerAnimal}
          onChange={(event) =>
            updateScenario({
              timePerAnimal: sanitizeNonNegativeInputValue(event.target.value),
            })
          }
          onKeyDown={preventNegativeNumberInput}
          onWheel={preventScrollNumberInputChange}
          inputProps={{ min: 0, step: 1 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Hourly wage ($)"
          type="number"
          value={scenario.hourlyWage}
          onChange={(event) =>
            updateScenario({
              hourlyWage: sanitizeNonNegativeInputValue(event.target.value),
            })
          }
          onKeyDown={preventNegativeNumberInput}
          onWheel={preventScrollNumberInputChange}
          inputProps={{ min: 0, step: 0.5 }}
        />
      </Stack>

      <Box
        sx={{
          mb: 1.2,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 0.8,
        }}
      >
        {scenario.selectedSpecies.map((species) => (
          <Box
            key={species}
            sx={{
              p: 0.8,
              borderRadius: 1.5,
              border: "1px solid rgba(15, 23, 42, 0.08)",
              backgroundColor: "#fff",
            }}
          >
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: "0.84rem", fontWeight: 700, lineHeight: 1.2 }}>
                  {formatSpeciesLabel(species)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    color: "text.secondary",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Avg {AVG_HANGING_WEIGHTS[species]} lbs
                </Typography>
                <DeleteIconButton
                  title={`Remove ${formatSpeciesLabel(species)}`}
                  ariaLabel={`Remove ${formatSpeciesLabel(species)} from ${scenario.name}`}
                  onClick={() => handleRemoveSpecies(species)}
                  sx={{ mt: -0.2 }}
                />
              </Box>
            </Stack>

            <TextField
              size="small"
              type="number"
              label="Volume"
              value={scenario.volumes[species] ?? ""}
              onChange={(event) => handleVolumeChange(species, event.target.value)}
              onKeyDown={preventNegativeNumberInput}
              onWheel={preventScrollNumberInputChange}
              inputProps={{ min: 0, step: 1 }}
              sx={{ mt: 0.7, width: "100%" }}
            />
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 0.8,
        }}
      >
        <Box sx={{ p: 0.8, borderRadius: 1.5, backgroundColor: "rgba(59, 130, 246, 0.08)" }}>
          <Typography variant="caption" sx={{ color: "primary.dark", fontWeight: 700 }}>
            Total Annual Volume:
          </Typography>
          <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: "primary.main" }}>
            {`${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} lbs`}
          </Typography>
        </Box>
        <Box sx={{ p: 0.8, borderRadius: 1.5, backgroundColor: "rgba(22, 163, 74, 0.08)" }}>
          <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 700 }}>
            Total Annual Savings:
          </Typography>
          <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: "success.main" }}>
            {`$${totalSavings.toFixed(2)}`}
          </Typography>
        </Box>
        <Box sx={{ p: 0.8, borderRadius: 1.5, backgroundColor: "rgba(220, 38, 38, 0.08)" }}>
          <Typography variant="caption" sx={{ color: "error.dark", fontWeight: 700 }}>
            Total Annual Cost:
          </Typography>
          <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: "error.main" }}>
            {`$${totalCost.toFixed(2)}`}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 0.8,
            borderRadius: 1.5,
            backgroundColor:
              netBenefit >= 0 ? "rgba(22, 163, 74, 0.08)" : "rgba(220, 38, 38, 0.08)",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: netBenefit >= 0 ? "success.dark" : "error.dark", fontWeight: 700 }}
          >
            Net Annual Benefit:
          </Typography>
          <Typography
            sx={{
              fontSize: "0.95rem",
              fontWeight: 800,
              color: netBenefit >= 0 ? "success.main" : "error.main",
            }}
          >
            {`$${netBenefit.toFixed(2)}`}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}
