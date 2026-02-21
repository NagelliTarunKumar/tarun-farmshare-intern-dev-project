import { useState } from "react";
import {
  Container,
  TextField,
  Typography,
  Box,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Collapse,
  IconButton,
  OutlinedInput,
  Chip,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CancelIcon from "@mui/icons-material/Cancel";
import type { EAnimalSpecies } from "./types";
import { EAnimalSpecies as AnimalSpecies, AVG_HANGING_WEIGHTS } from "./types";
import { calculateHeads, calculateLaborValue } from "./utils/calculations";
import "./App.css";

const COST_PER_LB = 0.02;

function App() {
  const [selectedSpecies, setSelectedSpecies] = useState<EAnimalSpecies[]>([
    "beef",
  ]);
  const [volumes, setVolumes] = useState<Partial<Record<EAnimalSpecies, string>>>(
    {},
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timePerAnimal, setTimePerAnimal] = useState("45"); // minutes
  const [hourlyWage, setHourlyWage] = useState("25"); // dollars

  const formatSpeciesLabel = (species: EAnimalSpecies): string =>
    species.charAt(0).toUpperCase() + species.slice(1);

  const handleSpeciesChange = (event: SelectChangeEvent<EAnimalSpecies[]>) => {
    const value = event.target.value;
    const species = typeof value === "string" ? value.split(",") : value;
    setSelectedSpecies(species as EAnimalSpecies[]);
  };

  const handleVolumeChange = (species: EAnimalSpecies, value: string) => {
    setVolumes((prev) => ({ ...prev, [species]: value }));
  };

  const handleRemoveSpecies = (speciesToRemove: EAnimalSpecies) => {
    setSelectedSpecies((prev) =>
      prev.filter((species) => species !== speciesToRemove),
    );
    setVolumes((prev) => {
      // Keep form state in sync so removed species don't linger in totals.
      const next = { ...prev };
      delete next[speciesToRemove];
      return next;
    });
  };

  const calculateTotalAnnualSavings = () => {
    return selectedSpecies.reduce((total, species) => {
      const volume = parseFloat(volumes[species] || "0");
      if (volume > 0) {
        const avgWeight = AVG_HANGING_WEIGHTS[species];
        const heads = calculateHeads(volume, avgWeight);
        const savings = calculateLaborValue(
          heads,
          parseFloat(timePerAnimal),
          parseFloat(hourlyWage),
        );
        return total + savings;
      }
      return total;
    }, 0);
  };

  const calculateTotalAnnualCost = () => {
    return selectedSpecies.reduce((total, species) => {
      const volume = parseFloat(volumes[species] || "0");
      return total + volume * COST_PER_LB;
    }, 0);
  };

  const getTotalVolume = () => {
    return selectedSpecies.reduce((total, species) => {
      return total + parseFloat(volumes[species] || "0");
    }, 0);
  };

  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Meat Processor Value Calculator
        </Typography>

        <Paper sx={{ p: 2, mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Animal Species</InputLabel>
            <Select
              multiple
              value={selectedSpecies}
              onChange={handleSpeciesChange}
              input={<OutlinedInput label="Select Animal Species" />}
              renderValue={(selected) => {
                const selectedValues = selected as EAnimalSpecies[];
                return (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selectedValues.map((value) => (
                      <Chip
                        key={value}
                        label={formatSpeciesLabel(value)}
                        onDelete={() => handleRemoveSpecies(value)}
                        // Prevent opening the select menu when user clicks delete.
                        deleteIcon={
                          <CancelIcon
                            onMouseDown={(event) => event.stopPropagation()}
                            aria-label={`Remove ${formatSpeciesLabel(value)}`}
                          />
                        }
                      />
                    ))}
                  </Box>
                );
              }}
            >
              {Object.values(AnimalSpecies).map((s) => (
                <MenuItem key={s} value={s}>
                  {formatSpeciesLabel(s)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedSpecies.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Annual Processing Volume by Species
              </Typography>
              {selectedSpecies.map((species) => (
                <Card key={species} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {formatSpeciesLabel(species)}
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        (Avg: {AVG_HANGING_WEIGHTS[species]} lbs/animal)
                      </Typography>
                    </Typography>
                    <TextField
                      fullWidth
                      label="Total Annual Hanging Weight (lbs)"
                      type="number"
                      value={volumes[species] || ""}
                      onChange={(e) =>
                        handleVolumeChange(species, e.target.value)
                      }
                      inputProps={{ min: 0 }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              Advanced Settings
            </Typography>
            <IconButton
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-label={
                showAdvanced
                  ? "Collapse advanced settings"
                  : "Expand advanced settings"
              }
              sx={{
                transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s",
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          <Collapse in={showAdvanced}>
            <TextField
              fullWidth
              label="Time Savings per Animal (minutes)"
              type="number"
              value={timePerAnimal}
              onChange={(e) => setTimePerAnimal(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Average Hourly Wage ($)"
              type="number"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
              sx={{ mb: 2 }}
            />
          </Collapse>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Annual Summary
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 2,
                pb: 1,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="body1">Total Annual Volume:</Typography>
              <Typography variant="body1" fontWeight="bold">
                {getTotalVolume().toLocaleString()} lbs
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 2,
                pb: 1,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="body1" color="success.main">
                Total Annual Savings:
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                $
                {calculateTotalAnnualSavings().toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="body1" color="error.main">
                Total Annual Cost:
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="error.main">
                $
                {calculateTotalAnnualCost().toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                pt: 2,
                borderTop: 2,
                borderColor: "primary.main",
              }}
            >
              <Typography variant="h6">Net Annual Benefit:</Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                $
                {(
                  calculateTotalAnnualSavings() - calculateTotalAnnualCost()
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default App;
