import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Menu,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { AlertColor, SelectChangeEvent } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";
import CancelIcon from "@mui/icons-material/Cancel";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import type { EAnimalSpecies } from "./types";
import { EAnimalSpecies as AnimalSpecies, AVG_HANGING_WEIGHTS } from "./types";
import { calculateHeads, calculateLaborValue } from "./utils/calculations";
import {
  preventNegativeNumberInput,
  preventScrollNumberInputChange,
  sanitizeNonNegativeInputValue,
} from "./utils/nonNegativeInput";
import farmshareLogo from "./assets/farmshare.svg";
import { VolumeInputCard } from "./components/VolumeInputCard";
import { ComparisonScenarioCard } from "./components/ComparisonScenarioCard";
import type { SavedScenario } from "./scenarios";
import "./App.css";

const COST_PER_LB = 0.02;
const MAX_VOLUME = 999_999;
const MAX_TIME_PER_ANIMAL = 240;
const MAX_HOURLY_WAGE = 250;
const CALCULATOR_STORAGE_KEY = "farmshare.calculator-state.v2";
const SCENARIOS_STORAGE_KEY = "farmshare.saved-scenarios.v1";
const UI_STATE_STORAGE_KEY = "farmshare.ui-state.v1";

const DEFAULT_SETTINGS = {
  timePerAnimal: "45",
  hourlyWage: "25",
};

const AVAILABLE_SPECIES = Object.values(AnimalSpecies) as EAnimalSpecies[];

interface SpeciesPreset {
  id: string;
  label: string;
  species: EAnimalSpecies[];
}

interface PersistedCalculatorState {
  selectedSpecies: EAnimalSpecies[];
  volumes: Partial<Record<EAnimalSpecies, string>>;
  timePerAnimal: string;
  hourlyWage: string;
}

interface PersistedUiState {
  workspaceTab: "calculator" | "comparison";
  analyticsTab: "species" | "distribution";
  showAdvanced: boolean;
}

interface CalculatorHydrationResult {
  state: PersistedCalculatorState;
  restored: boolean;
  failed: boolean;
}

interface ToastState {
  id: number;
  open: boolean;
  message: string;
  severity: AlertColor;
  tone: "default" | "added" | "removed";
}

interface SpeciesMetric {
  species: EAnimalSpecies;
  label: string;
  volume: number;
  heads: number;
  savings: number;
  annualCost: number;
  errorText: string | null;
}

interface ApplySpeciesSelectionOptions {
  toastMessage?: string;
  toastSeverity?: AlertColor;
  toastTone?: ToastState["tone"];
  suppressDefaultToast?: boolean;
}

interface ScenarioDialogState {
  open: boolean;
  mode: "save" | "create";
  value: string;
}

const SPECIES_PRESETS: SpeciesPreset[] = [
  { id: "beef-focused", label: "Beef Focused", species: ["beef", "bison", "veal"] },
  { id: "mixed", label: "Mixed Operations", species: ["beef", "hog", "lamb", "goat"] },
  { id: "game", label: "Game Mix", species: ["venison", "yak", "bison"] },
];

const ANALYTICS_COLORS = {
  panelBackground: "#f8fafc",
  tabTrack: "#dff2e5",
  tabActive: "#a8dbba",
  tabActiveText: "#14532d",
  tabText: "#111827",
  barSavings: "#16a34a",
  barCost: "#dc2626",
  axisGrid: "#d4d8df",
};

const WORKSPACE_TAB_COLORS = {
  tabTrack: "#f1fbf4",
  tabActive: "#86d5a4",
  tabActiveText: "#14532d",
};

const DISTRIBUTION_COLORS = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#D55E00",
  "#56B4E9",
  "#CC79A7",
  "#F0E442",
  "#999999",
];

function formatSpeciesLabel(species: EAnimalSpecies): string {
  return species.charAt(0).toUpperCase() + species.slice(1);
}

function triggerFileDownload(blob: Blob, fileName: string): void {
  const fileUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = fileUrl;
  downloadLink.download = fileName;
  downloadLink.click();
  window.URL.revokeObjectURL(fileUrl);
}

function getNumericValue(value: string | undefined): number {
  if (!value || value.trim() === "") return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isAllowedSpecies(value: string): value is EAnimalSpecies {
  return AVAILABLE_SPECIES.includes(value as EAnimalSpecies);
}

function getVolumeError(value: string | undefined): string | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return "Enter a valid number";
  if (parsed < 0) return "Volume cannot be negative";
  if (parsed > MAX_VOLUME) {
    return `Max allowed is ${MAX_VOLUME.toLocaleString()} lbs`;
  }
  return null;
}

function getSettingError(
  value: string,
  label: string,
  maxValue: number,
): string | null {
  if (!value || value.trim() === "") return `${label} is required`;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return `Enter a valid ${label.toLowerCase()}`;
  if (parsed < 0) return `${label} cannot be negative`;
  if (parsed > maxValue) return `${label} cannot exceed ${maxValue}`;
  return null;
}

function getMatchingPresetId(selected: EAnimalSpecies[]): string {
  const match = SPECIES_PRESETS.find(
    (preset) =>
      preset.species.length === selected.length &&
      preset.species.every((species) => selected.includes(species)),
  );
  return match?.id ?? "";
}

function normalizeScenarioName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function canonicalScenarioName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function dedupeScenarioNames(scenarios: SavedScenario[]): SavedScenario[] {
  const used = new Set<string>();

  return scenarios.map((scenario, index) => {
    const base = canonicalScenarioName(scenario.name) || `Scenario ${index + 1}`;
    let candidate = base;
    let suffix = 2;

    while (used.has(normalizeScenarioName(candidate))) {
      candidate = `${base} (${suffix})`;
      suffix += 1;
    }

    used.add(normalizeScenarioName(candidate));
    return { ...scenario, name: candidate };
  });
}

function sanitizeSavedScenario(raw: unknown): SavedScenario | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SavedScenario>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return null;
  }

  const selectedSpecies = Array.isArray(candidate.selectedSpecies)
    ? candidate.selectedSpecies.filter(
        (species): species is EAnimalSpecies =>
          typeof species === "string" && isAllowedSpecies(species),
      )
    : [];

  const volumes: Partial<Record<EAnimalSpecies, string>> = {};
  if (candidate.volumes && typeof candidate.volumes === "object") {
    for (const [species, rawValue] of Object.entries(candidate.volumes)) {
      if (isAllowedSpecies(species) && typeof rawValue === "string") {
        volumes[species] = sanitizeNonNegativeInputValue(rawValue);
      }
    }
  }

  return {
    id: candidate.id,
    name: candidate.name,
    selectedSpecies,
    volumes,
    timePerAnimal:
      typeof candidate.timePerAnimal === "string"
        ? sanitizeNonNegativeInputValue(candidate.timePerAnimal)
        : DEFAULT_SETTINGS.timePerAnimal,
    hourlyWage:
      typeof candidate.hourlyWage === "string"
        ? sanitizeNonNegativeInputValue(candidate.hourlyWage)
        : DEFAULT_SETTINGS.hourlyWage,
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : new Date().toISOString(),
  };
}

function getInitialCalculatorState(): CalculatorHydrationResult {
  const fallback: PersistedCalculatorState = {
    selectedSpecies: ["beef"],
    volumes: {},
    timePerAnimal: DEFAULT_SETTINGS.timePerAnimal,
    hourlyWage: DEFAULT_SETTINGS.hourlyWage,
  };

  if (typeof window === "undefined") {
    return { state: fallback, restored: false, failed: false };
  }

  try {
    const raw = localStorage.getItem(CALCULATOR_STORAGE_KEY);
    if (!raw) {
      return { state: fallback, restored: false, failed: false };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedCalculatorState>;
    const selectedSpecies = Array.isArray(parsed.selectedSpecies)
      ? parsed.selectedSpecies.filter(
          (species): species is EAnimalSpecies =>
            typeof species === "string" && isAllowedSpecies(species),
        )
      : [];

    const volumes: Partial<Record<EAnimalSpecies, string>> = {};
    if (parsed.volumes && typeof parsed.volumes === "object") {
      for (const [species, rawValue] of Object.entries(parsed.volumes)) {
        if (isAllowedSpecies(species) && typeof rawValue === "string") {
          volumes[species] = sanitizeNonNegativeInputValue(rawValue);
        }
      }
    }

    return {
      state: {
        selectedSpecies,
        volumes,
        timePerAnimal:
          typeof parsed.timePerAnimal === "string"
            ? sanitizeNonNegativeInputValue(parsed.timePerAnimal)
            : DEFAULT_SETTINGS.timePerAnimal,
        hourlyWage:
          typeof parsed.hourlyWage === "string"
            ? sanitizeNonNegativeInputValue(parsed.hourlyWage)
            : DEFAULT_SETTINGS.hourlyWage,
      },
      restored: true,
      failed: false,
    };
  } catch {
    return { state: fallback, restored: false, failed: true };
  }
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function createDonutSlicePath(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function App() {
  const initialCalculatorHydration = useMemo(() => getInitialCalculatorState(), []);
  const [workspaceTab, setWorkspaceTab] = useState<"calculator" | "comparison">(
    "calculator",
  );
  const [selectedSpecies, setSelectedSpecies] = useState<EAnimalSpecies[]>(
    initialCalculatorHydration.state.selectedSpecies,
  );
  const [volumes, setVolumes] = useState<Partial<Record<EAnimalSpecies, string>>>(
    initialCalculatorHydration.state.volumes,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timePerAnimal, setTimePerAnimal] = useState(
    initialCalculatorHydration.state.timePerAnimal,
  );
  const [hourlyWage, setHourlyWage] = useState(
    initialCalculatorHydration.state.hourlyWage,
  );
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenarioDialog, setScenarioDialog] = useState<ScenarioDialogState>({
    open: false,
    mode: "save",
    value: "",
  });
  const [analyticsTab, setAnalyticsTab] = useState<"species" | "distribution">(
    "species",
  );
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [toast, setToast] = useState<ToastState>({
    id: 0,
    open: false,
    message: "",
    severity: "success",
    tone: "default",
  });

  const [hasLoadedScenarioState, setHasLoadedScenarioState] = useState(false);
  const [hasLoadedUiState, setHasLoadedUiState] = useState(false);
  const toastIdRef = useRef(0);
  const isExportMenuOpen = Boolean(exportMenuAnchorEl);

  const openToast = (
    message: string,
    severity: AlertColor = "success",
    tone: ToastState["tone"] = "default",
  ) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, open: true, message, severity, tone });
  };

  useEffect(() => {
    if (initialCalculatorHydration.failed) {
      openToast("Could not restore saved calculator data", "warning");
      return;
    }
    if (initialCalculatorHydration.restored) {
      openToast("Restored your previous calculator session", "info");
    }
  }, [initialCalculatorHydration.failed, initialCalculatorHydration.restored]);

  useEffect(() => {
    const payload: PersistedCalculatorState = {
      selectedSpecies,
      volumes,
      timePerAnimal,
      hourlyWage,
    };

    try {
      localStorage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to persist calculator state", error);
    }
  }, [hourlyWage, selectedSpecies, timePerAnimal, volumes]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCENARIOS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const nextScenarios = parsed
        .map((entry) => sanitizeSavedScenario(entry))
        .filter((entry): entry is SavedScenario => Boolean(entry));

      setSavedScenarios(dedupeScenarioNames(nextScenarios));
    } catch (error) {
      console.error("Failed to load saved scenarios", error);
    } finally {
      setHasLoadedScenarioState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedScenarioState) return;

    try {
      localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(savedScenarios));
    } catch (error) {
      console.error("Failed to persist saved scenarios", error);
    }
  }, [hasLoadedScenarioState, savedScenarios]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(UI_STATE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedUiState>;

      if (parsed.workspaceTab === "calculator" || parsed.workspaceTab === "comparison") {
        setWorkspaceTab(parsed.workspaceTab);
      }
      if (parsed.analyticsTab === "species" || parsed.analyticsTab === "distribution") {
        setAnalyticsTab(parsed.analyticsTab);
      }
      if (typeof parsed.showAdvanced === "boolean") {
        setShowAdvanced(parsed.showAdvanced);
      }
    } catch (error) {
      console.error("Failed to load persisted UI state", error);
    } finally {
      setHasLoadedUiState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedUiState) return;

    const payload: PersistedUiState = {
      workspaceTab,
      analyticsTab,
      showAdvanced,
    };

    try {
      localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to persist UI state", error);
    }
  }, [analyticsTab, hasLoadedUiState, showAdvanced, workspaceTab]);

  const applySpeciesSelection = (
    nextSpecies: EAnimalSpecies[],
    options: ApplySpeciesSelectionOptions = {},
  ) => {
    const uniqueNext = Array.from(new Set(nextSpecies));

    setSelectedSpecies((previousSpecies) => {
      const addedSpecies = uniqueNext.find(
        (species) => !previousSpecies.includes(species),
      );
      const removedSpecies = previousSpecies.find(
        (species) => !uniqueNext.includes(species),
      );

      if (options.toastMessage) {
        openToast(
          options.toastMessage,
          options.toastSeverity ?? "success",
          options.toastTone ?? "added",
        );
      } else if (!options.suppressDefaultToast) {
        if (addedSpecies) {
          openToast(`${formatSpeciesLabel(addedSpecies)} selected`, "success", "added");
        } else if (removedSpecies) {
          openToast(`${formatSpeciesLabel(removedSpecies)} removed`, "info", "removed");
        }
      }

      return uniqueNext;
    });

    setVolumes((previousVolumes) => {
      const allowed = new Set(uniqueNext);
      return Object.entries(previousVolumes).reduce<
        Partial<Record<EAnimalSpecies, string>>
      >((next, [species, rawValue]) => {
        if (allowed.has(species as EAnimalSpecies)) {
          next[species as EAnimalSpecies] = rawValue;
        }
        return next;
      }, {});
    });
  };

  const handleSpeciesChange = (event: SelectChangeEvent<EAnimalSpecies[]>) => {
    const value = event.target.value;
    const nextSpecies = (typeof value === "string" ? value.split(",") : value)
      .filter((species): species is EAnimalSpecies => isAllowedSpecies(species));
    applySpeciesSelection(nextSpecies);
  };

  const handleRemoveSpecies = (speciesToRemove: EAnimalSpecies) => {
    const nextSpecies = selectedSpecies.filter(
      (species) => species !== speciesToRemove,
    );
    applySpeciesSelection(nextSpecies);
  };

  const handleVolumeChange = (species: EAnimalSpecies, value: string) => {
    const sanitizedValue = sanitizeNonNegativeInputValue(value);
    setVolumes((previous) => ({ ...previous, [species]: sanitizedValue }));
  };

  const handleApplyPreset = (preset: SpeciesPreset) => {
    applySpeciesSelection(preset.species, {
      toastMessage: `${preset.label} selected`,
      suppressDefaultToast: true,
    });
  };

  const handlePresetSelect = (event: SelectChangeEvent<string>) => {
    const selectedPresetId = event.target.value;
    const selectedPreset = SPECIES_PRESETS.find(
      (preset) => preset.id === selectedPresetId,
    );

    if (!selectedPreset) return;
    handleApplyPreset(selectedPreset);
  };

  const handleClearAll = () => {
    setSelectedSpecies([]);
    setVolumes({});
    setTimePerAnimal(DEFAULT_SETTINGS.timePerAnimal);
    setHourlyWage(DEFAULT_SETTINGS.hourlyWage);
    setShowAdvanced(false);
    openToast("Cleared all selected species and inputs", "info", "removed");
  };

  const isScenarioNameTaken = (
    name: string,
    excludeScenarioId?: string,
  ): boolean => {
    const normalized = normalizeScenarioName(name);
    return savedScenarios.some(
      (scenario) =>
        scenario.id !== excludeScenarioId &&
        normalizeScenarioName(scenario.name) === normalized,
    );
  };

  const handleOpenSaveScenarioDialog = () => {
    if (selectedSpecies.length === 0) {
      openToast("Select at least one species before saving", "warning");
      return;
    }

    const defaultName = `Scenario ${savedScenarios.length + 1}`;
    setScenarioDialog({ open: true, mode: "save", value: defaultName });
  };

  const handleOpenCreateScenarioDialog = () => {
    const defaultName = `Scenario ${savedScenarios.length + 1}`;
    setScenarioDialog({ open: true, mode: "create", value: defaultName });
  };

  const handleCloseScenarioDialog = () => {
    setScenarioDialog((previous) => ({ ...previous, open: false }));
  };

  const handleConfirmScenarioDialog = () => {
    const timestamp = new Date();
    const fallbackName = `Scenario ${savedScenarios.length + 1}`;
    const scenarioName = canonicalScenarioName(scenarioDialog.value) || fallbackName;

    if (isScenarioNameTaken(scenarioName)) {
      openToast("Scenario name already exists. Use a unique name.", "warning");
      return;
    }

    const nextScenario: SavedScenario =
      scenarioDialog.mode === "save"
        ? {
            id: `scenario-${timestamp.getTime()}`,
            name: scenarioName,
            selectedSpecies,
            volumes,
            timePerAnimal,
            hourlyWage,
            createdAt: timestamp.toISOString(),
            updatedAt: timestamp.toISOString(),
          }
        : {
            id: `scenario-${timestamp.getTime()}`,
            name: scenarioName,
            selectedSpecies: [],
            volumes: {},
            timePerAnimal: DEFAULT_SETTINGS.timePerAnimal,
            hourlyWage: DEFAULT_SETTINGS.hourlyWage,
            createdAt: timestamp.toISOString(),
            updatedAt: timestamp.toISOString(),
          };

    setSavedScenarios((previous) => [nextScenario, ...previous]);
    setScenarioDialog((previous) => ({ ...previous, open: false }));
    openToast(
      scenarioDialog.mode === "save"
        ? `${scenarioName} saved`
        : `${scenarioName} created`,
      "success",
      "added",
    );
  };

  const handleUpdateScenario = (nextScenario: SavedScenario) => {
    setSavedScenarios((previous) =>
      previous.map((scenario) =>
        scenario.id === nextScenario.id ? nextScenario : scenario,
      ),
    );
  };

  const handleRenameScenario = (
    scenarioId: string,
    nextName: string,
    options?: { silent?: boolean },
  ): boolean => {
    const scenarioName = canonicalScenarioName(nextName);
    if (!scenarioName) {
      if (!options?.silent) {
        openToast("Scenario name cannot be empty.", "warning");
      }
      return false;
    }

    if (isScenarioNameTaken(scenarioName, scenarioId)) {
      if (!options?.silent) {
        openToast("Scenario name already exists. Use a unique name.", "warning");
      }
      return false;
    }

    setSavedScenarios((previous) =>
      previous.map((scenario) =>
        scenario.id === scenarioId
          ? {
              ...scenario,
              name: scenarioName,
              updatedAt: new Date().toISOString(),
            }
          : scenario,
      ),
    );
    return true;
  };

  const handleDeleteScenario = (scenarioId: string) => {
    setSavedScenarios((previous) =>
      previous.filter((scenario) => scenario.id !== scenarioId),
    );
    openToast("Scenario removed", "info", "removed");
  };

  const timePerAnimalError = getSettingError(
    timePerAnimal,
    "Time savings per animal",
    MAX_TIME_PER_ANIMAL,
  );
  const hourlyWageError = getSettingError(
    hourlyWage,
    "Hourly wage",
    MAX_HOURLY_WAGE,
  );

  const effectiveTimePerAnimal = timePerAnimalError
    ? 0
    : getNumericValue(timePerAnimal);
  const effectiveHourlyWage = hourlyWageError ? 0 : getNumericValue(hourlyWage);

  const speciesMetrics = useMemo<SpeciesMetric[]>(() => {
    return selectedSpecies.map((species) => {
      const errorText = getVolumeError(volumes[species]);
      const volume = errorText ? 0 : getNumericValue(volumes[species]);
      const heads = calculateHeads(volume, AVG_HANGING_WEIGHTS[species]);
      const savings = calculateLaborValue(
        heads,
        effectiveTimePerAnimal,
        effectiveHourlyWage,
      );

      return {
        species,
        label: formatSpeciesLabel(species),
        volume,
        heads,
        savings,
        annualCost: volume * COST_PER_LB,
        errorText,
      };
    });
  }, [
    effectiveHourlyWage,
    effectiveTimePerAnimal,
    selectedSpecies,
    volumes,
  ]);

  const hasValidationErrors =
    Boolean(timePerAnimalError) ||
    Boolean(hourlyWageError) ||
    speciesMetrics.some((metric) => Boolean(metric.errorText));

  const totalAnnualVolume = speciesMetrics.reduce(
    (total, metric) => total + metric.volume,
    0,
  );
  const totalAnnualSavings = speciesMetrics.reduce(
    (total, metric) => total + metric.savings,
    0,
  );
  const totalAnnualCost = speciesMetrics.reduce(
    (total, metric) => total + metric.annualCost,
    0,
  );
  const netAnnualBenefit = totalAnnualSavings - totalAnnualCost;

  const monthlyVolume = totalAnnualVolume / 12;
  const monthlySavings = totalAnnualSavings / 12;
  const monthlyCost = totalAnnualCost / 12;
  const monthlyNetBenefit = netAnnualBenefit / 12;
  const hasCustomAssumptions =
    timePerAnimal !== DEFAULT_SETTINGS.timePerAnimal ||
    hourlyWage !== DEFAULT_SETTINGS.hourlyWage;
  const timePerAnimalSummary = timePerAnimal.trim()
    ? `${getNumericValue(timePerAnimal).toLocaleString(undefined, {
        maximumFractionDigits: 1,
      })} min/animal`
    : "Not set";
  const hourlyWageSummary = hourlyWage.trim()
    ? `$${getNumericValue(hourlyWage).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}/hr`
    : "Not set";

  const hasAnyVolume = speciesMetrics.some((metric) => metric.volume > 0);
  const canExportCsv = hasAnyVolume;
  const canExportPdf =
    workspaceTab === "calculator" ? hasAnyVolume : savedScenarios.length > 0;
  const isExportDisabled = !canExportCsv && !canExportPdf;
  const selectedPresetId = getMatchingPresetId(selectedSpecies);
  const selectedPreset = SPECIES_PRESETS.find(
    (preset) => preset.id === selectedPresetId,
  );
  const hasCustomSpeciesSelection =
    selectedSpecies.length > 0 && !selectedPreset;
  const chartSpeciesData = speciesMetrics
    .filter((metric) => metric.volume > 0)
    .map((metric) => ({
      name: metric.label,
      volume: metric.volume,
      animals: metric.heads,
      savings: metric.savings,
      cost: metric.annualCost,
    }));
  const maxSpeciesChartValue = Math.max(
    ...chartSpeciesData.flatMap((metric) => [metric.savings, metric.cost]),
    1,
  );
  const distributionData = chartSpeciesData.map((metric, index) => ({
    ...metric,
    color: DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length],
    share: totalAnnualVolume > 0 ? (metric.volume / totalAnnualVolume) * 100 : 0,
  }));
  const distributionSlices = useMemo(() => {
    let cumulativeShare = 0;

    return distributionData.map((metric) => {
      const startAngle = (cumulativeShare / 100) * 360 - 90;
      cumulativeShare += metric.share;
      const endAngle = (cumulativeShare / 100) * 360 - 90;

      return {
        ...metric,
        tooltip: `${metric.name}: ${metric.share.toFixed(1)}% (${metric.volume.toLocaleString()} lbs)`,
        path: createDonutSlicePath(120, 120, 120, 56, startAngle, endAngle),
      };
    });
  }, [distributionData]);

  const pieChartBackground = useMemo(() => {
    if (distributionData.length === 0) {
      return "conic-gradient(#e2e8f0 0% 100%)";
    }

    let cumulative = 0;
    const segments = distributionData.map((item) => {
      const start = cumulative;
      cumulative += item.share;
      return `${item.color} ${start}% ${cumulative}%`;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [distributionData]);

  const handleExportCsv = () => {
    if (!hasAnyVolume) {
      openToast("Add annual volume data before exporting", "warning");
      return;
    }

    const csvLines: string[] = [
      [
        "Species",
        "Annual Volume (lbs)",
        "Estimated Heads",
        "Annual Savings ($)",
        "Annual Cost ($)",
        "Net Benefit ($)",
      ].join(","),
    ];

    for (const metric of speciesMetrics) {
      if (metric.volume <= 0) continue;
      csvLines.push(
        [
          metric.label,
          metric.volume.toFixed(2),
          metric.heads.toString(),
          metric.savings.toFixed(2),
          metric.annualCost.toFixed(2),
          (metric.savings - metric.annualCost).toFixed(2),
        ].join(","),
      );
    }

    csvLines.push("");
    csvLines.push("Totals");
    csvLines.push(
      [
        "Total Annual Volume",
        totalAnnualVolume.toFixed(2),
        "",
        "",
        "",
        "",
      ].join(","),
    );
    csvLines.push(
      [
        "Total Annual Savings",
        totalAnnualSavings.toFixed(2),
        "",
        "",
        "",
        "",
      ].join(","),
    );
    csvLines.push(
      ["Total Annual Cost", totalAnnualCost.toFixed(2), "", "", "", ""].join(","),
    );
    csvLines.push(
      ["Net Annual Benefit", netAnnualBenefit.toFixed(2), "", "", "", ""].join(","),
    );

    csvLines.push("");
    csvLines.push("Monthly Breakdown");
    csvLines.push("Metric,Value");
    csvLines.push(["Monthly Volume (lbs)", monthlyVolume.toFixed(2)].join(","));
    csvLines.push(["Monthly Savings ($)", monthlySavings.toFixed(2)].join(","));
    csvLines.push(["Monthly Cost ($)", monthlyCost.toFixed(2)].join(","));
    csvLines.push(["Monthly Net Benefit ($)", monthlyNetBenefit.toFixed(2)].join(","));

    const csvBlob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    triggerFileDownload(
      csvBlob,
      `farmshare-annual-projection-${new Date().toISOString().slice(0, 10)}.csv`,
    );

    openToast("CSV export created");
  };

  const handleOpenExportMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    setExportMenuAnchorEl(event.currentTarget);
  };

  const handleCloseExportMenu = () => {
    setExportMenuAnchorEl(null);
  };

  const handleExportPdf = () => {
    if (!canExportPdf) {
      openToast(
        workspaceTab === "calculator"
          ? "Add annual volume data before exporting"
          : "Create at least one scenario before exporting",
        "warning",
      );
      return;
    }

    const previousTitle = document.title;
    const exportDate = new Date().toISOString().slice(0, 10);
    const activeViewLabel = workspaceTab === "calculator" ? "calculator" : "comparison";
    document.title = `farmshare-${activeViewLabel}-${exportDate}`;

    window.setTimeout(() => {
      window.print();
      document.title = previousTitle;
    }, 120);

    openToast(
      workspaceTab === "calculator"
        ? "Opening print dialog for Calculator. Choose Save as PDF."
        : "Opening print dialog for Comparison. Choose Save as PDF.",
      "info",
    );
  };

  return (
    <>
      <header className="top-nav">
        <div className="top-nav__inner">
          <a className="top-nav__brand" href="/" aria-label="Farmshare home">
            <img src={farmshareLogo} className="top-nav__logo" alt="Farmshare logo" />
          </a>
          <h1 className="top-nav__title">Meat Processor Value Calculator</h1>
          <div className="top-nav__spacer" aria-hidden="true" />
        </div>
      </header>

      <Box
        className="app-print-root"
        sx={{
          minHeight: "calc(100vh - 94px)",
          py: { xs: 2.5, md: 4 },
          background:
            "radial-gradient(circle at 85% 15%, rgba(123, 190, 114, 0.12), transparent 32%), linear-gradient(180deg, #f4f8f4 0%, #ecf4ed 100%)",
        }}
      >
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              mb: 2.5,
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              border: "1px solid rgba(22, 101, 52, 0.2)",
              background: "linear-gradient(140deg, #ffffff 0%, #f0f8f1 100%)",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              gap={2}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#14532d" }}>
                  Processing Projection Workspace
                </Typography>
              </Box>

              <Stack
                direction="row"
                spacing={1.2}
                flexWrap="wrap"
                useFlexGap
                className="no-print"
              >
                {workspaceTab === "calculator" && (
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<SaveOutlinedIcon />}
                    onClick={handleOpenSaveScenarioDialog}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Save Scenario
                  </Button>
                )}
                {workspaceTab === "comparison" && (
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<AddCircleOutlineOutlinedIcon />}
                    onClick={handleOpenCreateScenarioDialog}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Create Scenario
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<DownloadIcon />}
                  endIcon={
                    <ArrowDropDownIcon
                      sx={{
                        transform: isExportMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 150ms ease",
                      }}
                    />
                  }
                  onClick={handleOpenExportMenu}
                  disabled={isExportDisabled}
                  aria-controls={isExportMenuOpen ? "export-menu" : undefined}
                  aria-haspopup="menu"
                  aria-expanded={isExportMenuOpen ? "true" : undefined}
                  sx={{ textTransform: "none", fontWeight: 700, minWidth: 148 }}
                >
                  Export
                </Button>
                <Menu
                  id="export-menu"
                  anchorEl={exportMenuAnchorEl}
                  open={isExportMenuOpen}
                  onClose={handleCloseExportMenu}
                  className="no-print"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  MenuListProps={{
                    dense: true,
                    sx: { py: 0.4 },
                  }}
                  PaperProps={{
                    elevation: 0,
                    sx: {
                      mt: 0.8,
                      minWidth: 156,
                      borderRadius: 2,
                      border: "1px solid rgba(15, 23, 42, 0.1)",
                      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.14)",
                    },
                  }}
                >
                  <MenuItem
                    disabled={!canExportCsv}
                    sx={{
                      mx: 0.5,
                      my: 0.2,
                      borderRadius: 1.2,
                      gap: 1,
                      minHeight: 0,
                      py: 0.7,
                      px: 1.1,
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      "&:hover": { backgroundColor: "rgba(22, 163, 74, 0.12)" },
                    }}
                    onClick={() => {
                      handleCloseExportMenu();
                      handleExportCsv();
                    }}
                  >
                    <DescriptionOutlinedIcon sx={{ fontSize: 18, color: "#0369a1" }} />
                    CSV
                  </MenuItem>
                  <MenuItem
                    disabled={!canExportPdf}
                    sx={{
                      mx: 0.5,
                      my: 0.2,
                      borderRadius: 1.2,
                      gap: 1,
                      minHeight: 0,
                      py: 0.7,
                      px: 1.1,
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      "&:hover": { backgroundColor: "rgba(22, 163, 74, 0.12)" },
                    }}
                    onClick={() => {
                      handleCloseExportMenu();
                      handleExportPdf();
                    }}
                  >
                    <PictureAsPdfOutlinedIcon sx={{ fontSize: 18, color: "#b91c1c" }} />
                    PDF
                  </MenuItem>
                </Menu>
              </Stack>
            </Stack>

            <Tabs
              value={workspaceTab}
              onChange={(_, value: "calculator" | "comparison") =>
                setWorkspaceTab(value)
              }
              variant="fullWidth"
              sx={{
                mt: 1.8,
                mb: 1.8,
                p: 0.4,
                borderRadius: 2,
                border: "1px solid rgba(15, 23, 42, 0.12)",
                backgroundColor: WORKSPACE_TAB_COLORS.tabTrack,
                "& .MuiTabs-indicator": { display: "none" },
              }}
            >
              <Tab
                value="calculator"
                icon={<CalculateOutlinedIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Calculator"
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  borderRadius: 1.5,
                  minHeight: 42,
                  "&.Mui-selected": {
                    backgroundColor: WORKSPACE_TAB_COLORS.tabActive,
                    color: WORKSPACE_TAB_COLORS.tabActiveText,
                    boxShadow: "inset 0 0 0 1px rgba(20, 83, 45, 0.18)",
                  },
                }}
              />
              <Tab
                value="comparison"
                icon={<CompareArrowsOutlinedIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Comparison"
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  borderRadius: 1.5,
                  minHeight: 42,
                  "&.Mui-selected": {
                    backgroundColor: WORKSPACE_TAB_COLORS.tabActive,
                    color: WORKSPACE_TAB_COLORS.tabActiveText,
                    boxShadow: "inset 0 0 0 1px rgba(20, 83, 45, 0.18)",
                  },
                }}
              />
            </Tabs>

            {workspaceTab === "calculator" && (
              <Stack
                direction="column"
                spacing={1.8}
                sx={{ width: "100%", maxWidth: 760 }}
              >
              <Box sx={{ width: "100%" }}>
                <FormControl size="small" fullWidth>
                  <Typography
                    variant="caption"
                    sx={{ mb: 0.6, fontWeight: 700, color: "text.secondary" }}
                  >
                    Species Preset
                  </Typography>
                  <Select
                    id="preset-select"
                    value={selectedPresetId}
                    onChange={handlePresetSelect}
                    displayEmpty
                    input={<OutlinedInput notched={false} />}
                    renderValue={(value) => {
                      if (!value) {
                        return hasCustomSpeciesSelection
                          ? "Custom mix"
                          : "Select a preset";
                      }
                      const selectedPreset = SPECIES_PRESETS.find(
                        (preset) => preset.id === value,
                      );
                      return selectedPreset?.label ?? "Custom mix";
                    }}
                  >
                    {SPECIES_PRESETS.map((preset) => (
                      <MenuItem key={preset.id} value={preset.id} sx={{ py: 1.2 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{preset.label}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Includes:{" "}
                            {preset.species
                              .map((species) => formatSpeciesLabel(species))
                              .join(", ")}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {hasCustomSpeciesSelection
                      ? "Custom mix active. Select a preset to replace your current species."
                      : "Quick-select species groups, then refine in species selection."}
                  </FormHelperText>
                </FormControl>
              </Box>

              <Box sx={{ width: "100%" }}>
                <Typography
                  variant="caption"
                  sx={{ mb: 0.6, fontWeight: 700, color: "text.secondary", display: "block" }}
                >
                  Select Animal Species
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <FormControl fullWidth size="small">
                    <Select
                      id="species-select"
                      multiple
                      displayEmpty
                      value={selectedSpecies}
                      onChange={handleSpeciesChange}
                      input={<OutlinedInput notched={false} />}
                      MenuProps={{ PaperProps: { sx: { maxHeight: 330 } } }}
                      renderValue={(selected) => {
                        const selectedValues = selected as EAnimalSpecies[];

                        if (selectedValues.length === 0) {
                          return (
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                              Please select a species
                            </Typography>
                          );
                        }

                        return (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                            {selectedValues.map((value) => (
                              <Chip
                                key={value}
                                size="small"
                                color="success"
                                variant="filled"
                                label={formatSpeciesLabel(value)}
                                onDelete={() => handleRemoveSpecies(value)}
                                deleteIcon={
                                  <CancelIcon
                                    aria-label={`Remove ${formatSpeciesLabel(value)}`}
                                    onMouseDown={(event) => event.stopPropagation()}
                                  />
                                }
                                sx={{
                                  fontWeight: 700,
                                  "& .MuiChip-deleteIcon": {
                                    color: "rgba(255,255,255,0.9)",
                                  },
                                  "& .MuiChip-deleteIcon:hover": { color: "#fff" },
                                }}
                              />
                            ))}
                          </Box>
                        );
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          minHeight: 44,
                          borderRadius: 2,
                          backgroundColor: "#fcfefc",
                          transition: "all 150ms ease",
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "success.main",
                          },
                        },
                      }}
                    >
                      {AVAILABLE_SPECIES.map((species) => (
                        <MenuItem key={species} value={species} sx={{ py: 1.1 }}>
                          <Box
                            sx={{
                              width: "100%",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography sx={{ fontWeight: 600 }}>
                              {formatSpeciesLabel(species)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Avg {AVG_HANGING_WEIGHTS[species]} lbs
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<RestartAltIcon />}
                    onClick={handleClearAll}
                    disabled={
                      selectedSpecies.length === 0 &&
                      !hasAnyVolume &&
                      timePerAnimal === DEFAULT_SETTINGS.timePerAnimal &&
                      hourlyWage === DEFAULT_SETTINGS.hourlyWage
                    }
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      height: 44,
                      minHeight: 44,
                      minWidth: { xs: "100%", sm: 126 },
                      px: 1.6,
                      borderColor: "rgba(15, 23, 42, 0.18)",
                      color: "text.secondary",
                      "&:hover": {
                        borderColor: "rgba(220, 38, 38, 0.42)",
                        color: "error.main",
                        backgroundColor: "rgba(220, 38, 38, 0.05)",
                      },
                    }}
                  >
                    Clear All
                  </Button>
                </Box>
                <FormHelperText sx={{ mt: 0.6 }}>
                  Choose species to generate volume cards and annual projections.
                </FormHelperText>
              </Box>
              </Stack>
            )}

            {workspaceTab === "comparison" && (
              <Box sx={{ mt: 0.5 }}>
                {savedScenarios.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No scenarios yet. Use Create Scenario in the top actions.
                  </Alert>
                ) : (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
                      gap: 1.4,
                    }}
                  >
                    {savedScenarios.map((scenario) => (
                      <ComparisonScenarioCard
                        key={scenario.id}
                        scenario={scenario}
                        onChange={handleUpdateScenario}
                        onRename={handleRenameScenario}
                        onDelete={handleDeleteScenario}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Paper>

          {workspaceTab === "calculator" && hasValidationErrors && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
              Fix highlighted inputs to ensure accurate projections.
            </Alert>
          )}

          {workspaceTab === "calculator" && (selectedSpecies.length > 0 ? (
            <Paper
              elevation={0}
              sx={{
                mb: 2.5,
                p: { xs: 2, md: 2.4 },
                borderRadius: 3,
                border: "1px solid rgba(22, 163, 74, 0.22)",
                background: "linear-gradient(180deg, #ffffff 0%, #f7fbf8 100%)",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                sx={{ mb: 1.4 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Annual Processing Volume by Species
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Values update live as you type
                </Typography>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  gap: 1.8,
                }}
              >
                {speciesMetrics.map((metric) => (
                  <VolumeInputCard
                    key={metric.species}
                    label={metric.label}
                    avgWeight={AVG_HANGING_WEIGHTS[metric.species]}
                    value={volumes[metric.species] ?? ""}
                    errorText={metric.errorText}
                    onChange={(value) => handleVolumeChange(metric.species, value)}
                    onRemove={() => handleRemoveSpecies(metric.species)}
                  />
                ))}
              </Box>

              <Box
                sx={{
                  mt: 2.1,
                  pt: 2,
                  borderTop: "1px solid rgba(22, 163, 74, 0.2)",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "1fr auto" },
                    gap: 1.3,
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#14532d" }}>
                      Advanced Settings
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.2 }}>
                      These values are used to estimate labor savings for each species.
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={0.8}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                    justifyContent={{ xs: "flex-start", lg: "flex-end" }}
                  >
                    <Chip
                      size="small"
                      label={`Time: ${timePerAnimalSummary}`}
                      sx={{
                        fontWeight: 700,
                        bgcolor: "rgba(8, 145, 178, 0.12)",
                        color: "#0e7490",
                      }}
                    />
                    <Chip
                      size="small"
                      label={`Wage: ${hourlyWageSummary}`}
                      sx={{
                        fontWeight: 700,
                        bgcolor: "rgba(37, 99, 235, 0.1)",
                        color: "#1d4ed8",
                      }}
                    />
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => {
                        setTimePerAnimal(DEFAULT_SETTINGS.timePerAnimal);
                        setHourlyWage(DEFAULT_SETTINGS.hourlyWage);
                        openToast("Assumptions reset to defaults", "info");
                      }}
                      disabled={!hasCustomAssumptions}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="small"
                      variant={showAdvanced ? "contained" : "outlined"}
                      color="success"
                      endIcon={
                        <ExpandMoreIcon
                          sx={{
                            transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 240ms",
                          }}
                        />
                      }
                      onClick={() => setShowAdvanced((current) => !current)}
                      aria-label={
                        showAdvanced
                          ? "Collapse advanced settings"
                          : "Expand advanced settings"
                      }
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      {showAdvanced ? "Hide details" : "Edit"}
                    </Button>
                  </Stack>
                </Box>

                <Collapse in={showAdvanced}>
                  <Box
                    sx={{
                      mt: 1.4,
                      pt: 1.4,
                      borderTop: "1px dashed rgba(21, 128, 61, 0.3)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mb: 1.2,
                        color: "text.secondary",
                        fontWeight: 600,
                      }}
                    >
                      Tune these assumptions only if your operation differs from the default
                      baseline.
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Time Savings per Animal (minutes)"
                        type="number"
                        value={timePerAnimal}
                        onChange={(event) =>
                          setTimePerAnimal(
                            sanitizeNonNegativeInputValue(event.target.value),
                          )
                        }
                        onKeyDown={preventNegativeNumberInput}
                        onWheel={preventScrollNumberInputChange}
                        error={Boolean(timePerAnimalError)}
                        helperText={timePerAnimalError ?? " "}
                        inputProps={{ min: 0, max: MAX_TIME_PER_ANIMAL, step: 1 }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Average Hourly Wage ($)"
                        type="number"
                        value={hourlyWage}
                        onChange={(event) =>
                          setHourlyWage(
                            sanitizeNonNegativeInputValue(event.target.value),
                          )
                        }
                        onKeyDown={preventNegativeNumberInput}
                        onWheel={preventScrollNumberInputChange}
                        error={Boolean(hourlyWageError)}
                        helperText={hourlyWageError ?? " "}
                        inputProps={{ min: 0, max: MAX_HOURLY_WAGE, step: 0.5 }}
                      />
                    </Stack>
                  </Box>
                </Collapse>
              </Box>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                mb: 2.5,
                p: { xs: 3, sm: 4.5 },
                borderRadius: 3,
                border: "2px dashed rgba(22, 101, 52, 0.24)",
                backgroundColor: "rgba(255,255,255,0.7)",
                textAlign: "center",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#14532d" }}>
                Select at least one species
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.6, color: "text.secondary" }}>
                Add species above to unlock input cards, advanced settings, and annual summaries.
              </Typography>
            </Paper>
          ))}

          {workspaceTab === "calculator" && selectedSpecies.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 2.6 },
                borderRadius: 3,
                border: "1px solid rgba(15, 23, 42, 0.12)",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbf9 100%)",
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                Annual Summary
              </Typography>

              <Box
                sx={{
                  mb: 2.2,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                  gap: 1.2,
                }}
              >
                <Box
                  sx={{
                    p: 1.4,
                    borderRadius: 2,
                    border: "1px solid rgba(22, 163, 74, 0.28)",
                    backgroundColor: "rgba(22, 163, 74, 0.07)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 700 }}>
                    Total Annual Savings:
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.3, fontWeight: 800, color: "success.main" }}>
                    {`$${totalAnnualSavings.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 1.4,
                    borderRadius: 2,
                    border: "1px solid rgba(37, 99, 235, 0.28)",
                    backgroundColor: "rgba(59, 130, 246, 0.08)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "primary.dark", fontWeight: 700 }}>
                    Total Annual Volume:
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.3, fontWeight: 800, color: "primary.main" }}>
                    {`${totalAnnualVolume.toLocaleString()} lbs`}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 1.4,
                    borderRadius: 2,
                    border: "1px solid rgba(220, 38, 38, 0.24)",
                    backgroundColor: "rgba(220, 38, 38, 0.06)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "error.dark", fontWeight: 700 }}>
                    Total Annual Cost:
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.3, fontWeight: 800, color: "error.main" }}>
                    {`$${totalAnnualCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 1.4,
                    borderRadius: 2,
                    border: "1px solid rgba(15, 23, 42, 0.1)",
                    backgroundColor:
                      netAnnualBenefit >= 0
                        ? "rgba(22, 163, 74, 0.08)"
                        : "rgba(220, 38, 38, 0.06)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: netAnnualBenefit >= 0 ? "success.dark" : "error.dark",
                      fontWeight: 700,
                    }}
                  >
                    Net Annual Benefit:
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      mt: 0.3,
                      fontWeight: 800,
                      color: netAnnualBenefit >= 0 ? "success.main" : "error.main",
                    }}
                  >
                    {`$${netAnnualBenefit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                  </Typography>
                </Box>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.6, sm: 2 },
                  borderRadius: 2.5,
                  border: "1px solid rgba(15, 23, 42, 0.1)",
                  backgroundColor: ANALYTICS_COLORS.panelBackground,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.3 }}>
                  Analytics Dashboard
                </Typography>

                <Tabs
                  value={analyticsTab}
                  onChange={(_, value: "species" | "distribution") =>
                    setAnalyticsTab(value)
                  }
                  variant="fullWidth"
                  sx={{
                    mb: 1.4,
                    p: 0.4,
                    minHeight: 58,
                    borderRadius: 999,
                    backgroundColor: ANALYTICS_COLORS.tabTrack,
                    "& .MuiTabs-indicator": {
                      display: "none",
                    },
                  }}
                >
                  <Tab
                    label="By Species"
                    value="species"
                    sx={{
                      textTransform: "none",
                      fontWeight: 800,
                      borderRadius: 999,
                      minHeight: 48,
                      color: ANALYTICS_COLORS.tabText,
                      "&.Mui-selected": {
                        backgroundColor: ANALYTICS_COLORS.tabActive,
                        color: ANALYTICS_COLORS.tabActiveText,
                        boxShadow: "inset 0 0 0 1px rgba(22, 101, 52, 0.16)",
                      },
                    }}
                  />
                  <Tab
                    label="Volume Distribution"
                    value="distribution"
                    sx={{
                      textTransform: "none",
                      fontWeight: 800,
                      borderRadius: 999,
                      minHeight: 48,
                      color: ANALYTICS_COLORS.tabText,
                      "&.Mui-selected": {
                        backgroundColor: ANALYTICS_COLORS.tabActive,
                        color: ANALYTICS_COLORS.tabActiveText,
                        boxShadow: "inset 0 0 0 1px rgba(22, 101, 52, 0.16)",
                      },
                    }}
                  />
                </Tabs>

                {!hasAnyVolume ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Enter annual volume data to populate charts in Analytics Dashboard.
                  </Alert>
                ) : (
                  <>
                    {analyticsTab === "species" && (
                      <Box>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: `repeat(${chartSpeciesData.length}, minmax(0, 1fr))`,
                            gap: { xs: 0.9, sm: 1.4 },
                            alignItems: "end",
                            height: 250,
                            borderBottom: "1px solid rgba(15, 23, 42, 0.12)",
                            px: 1,
                            pb: 1,
                          }}
                        >
                          {chartSpeciesData.map((metric) => (
                            <Tooltip
                              key={metric.name}
                              arrow
                              title={`${metric.name}: ~${metric.animals.toLocaleString()} animals | Savings $${metric.savings.toFixed(2)} | Cost $${metric.cost.toFixed(2)}`}
                            >
                              <Box
                                sx={{
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "flex-end",
                                  justifyContent: "center",
                                  gap: 0.8,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: { xs: 9, sm: 12, md: 14 },
                                    height: `${Math.max(
                                      (metric.savings / maxSpeciesChartValue) * 100,
                                      5,
                                    )}%`,
                                    borderRadius: "8px 8px 0 0",
                                    backgroundColor: ANALYTICS_COLORS.barSavings,
                                  }}
                                />
                                <Box
                                  sx={{
                                    width: { xs: 9, sm: 12, md: 14 },
                                    height: `${Math.max(
                                      (metric.cost / maxSpeciesChartValue) * 100,
                                      5,
                                    )}%`,
                                    borderRadius: "8px 8px 0 0",
                                    backgroundColor: ANALYTICS_COLORS.barCost,
                                  }}
                                />
                              </Box>
                            </Tooltip>
                          ))}
                        </Box>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: `repeat(${chartSpeciesData.length}, minmax(0, 1fr))`,
                            gap: { xs: 0.9, sm: 1.4 },
                            mt: 0.8,
                            px: 1,
                          }}
                        >
                          {chartSpeciesData.map((metric) => (
                            <Box key={metric.name} sx={{ textAlign: "center" }}>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {metric.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ display: "block", color: "text.secondary", fontSize: "0.68rem" }}
                              >
                                ~{metric.animals.toLocaleString()} animals
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                        <Stack direction="row" spacing={2} sx={{ mt: 1.2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: 1,
                                bgcolor: ANALYTICS_COLORS.barSavings,
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{ color: ANALYTICS_COLORS.barSavings, fontWeight: 700 }}
                            >
                              Annual Savings
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: 1,
                                bgcolor: ANALYTICS_COLORS.barCost,
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{ color: ANALYTICS_COLORS.barCost, fontWeight: 700 }}
                            >
                              Annual Cost
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    )}

                    {analyticsTab === "distribution" && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", md: "row" },
                          alignItems: "center",
                          justifyContent: "center",
                          gap: { xs: 1.8, md: 3 },
                          width: "100%",
                          mx: "auto",
                        }}
                      >
                        <Box
                          sx={{
                            width: 240,
                            height: 240,
                            mx: "auto",
                            borderRadius: "50%",
                            background: pieChartBackground,
                            position: "relative",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                          }}
                        >
                          <Box
                            component="svg"
                            viewBox="0 0 240 240"
                            aria-label="Volume distribution details"
                            sx={{ position: "absolute", inset: 0 }}
                          >
                            {distributionSlices.map((slice) => (
                              <Tooltip key={slice.name} arrow title={slice.tooltip}>
                                <path
                                  d={slice.path}
                                  fill={slice.color}
                                  fillOpacity={0.02}
                                  stroke="transparent"
                                  style={{ cursor: "pointer" }}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                          <Box
                            sx={{
                              position: "absolute",
                              inset: "23%",
                              borderRadius: "50%",
                              backgroundColor: "#fff",
                              display: "grid",
                              placeItems: "center",
                              textAlign: "center",
                              border: "1px solid rgba(15, 23, 42, 0.08)",
                              p: 1,
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              Total Volume
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {totalAnnualVolume.toLocaleString()} lbs
                            </Typography>
                          </Box>
                        </Box>

                        <Stack spacing={0.75} sx={{ width: "100%", maxWidth: 360 }}>
                          {distributionData.map((metric) => (
                            <Box
                              key={metric.name}
                              sx={{
                                display: "grid",
                                gridTemplateColumns: "1fr auto",
                                alignItems: "center",
                                columnGap: 1.1,
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: "50%",
                                    backgroundColor: metric.color,
                                    flexShrink: 0,
                                  }}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {metric.name}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ whiteSpace: "nowrap" }}
                              >
                                {metric.share.toFixed(1)}% ({metric.volume.toLocaleString()} lbs)
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </>
                )}
              </Paper>
            </Paper>
          )}
        </Container>
      </Box>

      <Snackbar
        className="no-print"
        key={toast.id}
        open={toast.open}
        autoHideDuration={2200}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => setToast((previous) => ({ ...previous, open: false }))}
      >
        <Alert
          variant="filled"
          severity={toast.severity}
          onClose={() => setToast((previous) => ({ ...previous, open: false }))}
          sx={{
            width: "100%",
            ...(toast.tone === "added" && {
              backgroundColor: "#1877F2",
              color: "#fff",
              "& .MuiAlert-icon": { color: "#fff" },
            }),
            ...(toast.tone === "removed" && {
              backgroundColor: "#FEE2E2",
              color: "#991B1B",
              "& .MuiAlert-icon": { color: "#B91C1C" },
            }),
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      <Dialog
        className="no-print"
        open={scenarioDialog.open}
        onClose={handleCloseScenarioDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {scenarioDialog.mode === "save" ? "Save Scenario" : "Create Scenario"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Scenario name"
            value={scenarioDialog.value}
            onChange={(event) =>
              setScenarioDialog((previous) => ({
                ...previous,
                value: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleConfirmScenarioDialog();
              }
            }}
            sx={{ mt: 0.6 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseScenarioDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmScenarioDialog} variant="contained" color="success">
            {scenarioDialog.mode === "save" ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default App;
