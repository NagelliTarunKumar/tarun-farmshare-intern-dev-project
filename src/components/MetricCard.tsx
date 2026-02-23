import type { ReactNode } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  iconBackground: string;
  valueColor: string;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  iconBackground,
  valueColor,
}: MetricCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "rgba(21, 128, 61, 0.14)",
        background: "linear-gradient(160deg, #ffffff 0%, #f6fbf7 100%)",
        transition: "transform 180ms ease, box-shadow 180ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 24px rgba(0, 0, 0, 0.08)",
        },
      }}
    >
      <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
              {label}
            </Typography>
            <Typography
              variant="h5"
              sx={{ mt: 0.5, fontWeight: 800, color: valueColor, lineHeight: 1.2 }}
            >
              {value}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {subtitle}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              background: iconBackground,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
