import { IconButton, Tooltip } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

interface DeleteIconButtonProps {
  title: string;
  ariaLabel: string;
  onClick: () => void;
  size?: "small" | "medium" | "large";
  sx?: SxProps<Theme>;
}

export function DeleteIconButton({
  title,
  ariaLabel,
  onClick,
  size = "small",
  sx,
}: DeleteIconButtonProps) {
  return (
    <Tooltip title={title}>
      <IconButton
        onClick={onClick}
        aria-label={ariaLabel}
        size={size}
        sx={[
          {
            p: 0.55,
            color: "#b42318",
            backgroundColor: "rgba(255, 241, 240, 0.8)",
            border: "1px solid rgba(217, 45, 32, 0.2)",
            "&:hover": { backgroundColor: "rgba(254, 228, 226, 1)" },
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
