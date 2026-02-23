import { Box, Card, TextField, Typography } from "@mui/material";
import { DeleteIconButton } from "./DeleteIconButton";
import {
  preventNegativeNumberInput,
  preventScrollNumberInputChange,
  sanitizeNonNegativeInputValue,
} from "../utils/nonNegativeInput";

interface VolumeInputCardProps {
  label: string;
  avgWeight: number;
  value: string;
  errorText?: string | null;
  onChange: (value: string) => void;
  onRemove: () => void;
}

export function VolumeInputCard({
  label,
  avgWeight,
  value,
  errorText,
  onChange,
  onRemove,
}: VolumeInputCardProps) {
  const hasVolume = Number.parseFloat(value) > 0;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: errorText
          ? "rgba(211, 47, 47, 0.45)"
          : hasVolume
            ? "rgba(22, 163, 74, 0.35)"
            : "rgba(15, 23, 42, 0.1)",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbf8 100%)",
        transition: "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: errorText ? "rgba(211, 47, 47, 0.55)" : "rgba(22, 163, 74, 0.6)",
          boxShadow: "0 12px 22px rgba(16, 24, 40, 0.08)",
        },
      }}
    >
      <Box sx={{ p: 1.8 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 1,
              width: "100%",
              minWidth: 0,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontSize: "1rem", lineHeight: 1.15, fontWeight: 800 }}>
              {label}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.72rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Avg hanging weight: {avgWeight} lbs/animal
            </Typography>
          </Box>
          <DeleteIconButton
            title={`Remove ${label}`}
            ariaLabel={`Remove ${label}`}
            onClick={onRemove}
          />
        </Box>

        <TextField
          fullWidth
          size="small"
          label="Total Annual Hanging Weight (lbs)"
          type="number"
          value={value}
          onChange={(event) => onChange(sanitizeNonNegativeInputValue(event.target.value))}
          onKeyDown={preventNegativeNumberInput}
          onWheel={preventScrollNumberInputChange}
          error={Boolean(errorText)}
          helperText={errorText || undefined}
          FormHelperTextProps={{
            sx: {
              mt: 0.4,
              mb: 0,
              minHeight: errorText ? "auto" : 0,
            },
          }}
          inputProps={{ min: 0, max: 999999, step: 1 }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              fontWeight: 700,
              minHeight: 42,
              backgroundColor: "#fff",
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: errorText ? "error.main" : "success.main",
              },
            },
          }}
        />

      </Box>
    </Card>
  );
}
