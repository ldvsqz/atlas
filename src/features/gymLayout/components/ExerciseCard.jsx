import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StraightenIcon from '@mui/icons-material/Straighten';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { getExerciseSizeLabel } from '../models/gymLayoutModels';

function ExerciseCard({
  exercise,
  placed = false,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const color = exercise.color || '#2563EB';

  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = (e) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  };

  return (
    <Box
      onClick={() => !placed && onSelect && onSelect(isSelected ? null : exercise)}
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: '1.5px solid',
        borderColor: isSelected ? color : 'divider',
        bgcolor: isSelected ? alpha(color, 0.06) : 'background.paper',
        cursor: 'pointer',
        position: 'relative',
        boxSizing: 'border-box',
        width: '100%',
        transition: 'all 0.15s ease',
        '&:active': { transform: 'scale(0.99)' }
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={800} variant="body2" color="text.primary" noWrap sx={{ fontSize: 13.5 }}>
              {exercise.name}
            </Typography>
          </Box>
        </Stack>

        {/* MENÚ DE ACCIONES SÚPER LIMPIO (NUNCA SE DESCUADRA) */}
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
          {isMobile && !placed && (
            isSelected ? <CheckCircleIcon sx={{ color, fontSize: 18 }} /> : <TouchAppIcon sx={{ color: 'text.disabled', fontSize: 16, opacity: 0.5 }} />
          )}
          
          <IconButton size="small" onClick={handleMenuClick} sx={{ p: 0.25 }}>
            <MoreVertIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          </IconButton>
        </Stack>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Chip
          icon={<StraightenIcon style={{ fontSize: 11 }} />}
          label={getExerciseSizeLabel(exercise)}
          size="small"
          variant="outlined"
          sx={{ fontSize: 10, height: 18, borderRadius: 1, borderColor: alpha(theme.palette.divider, 0.8) }}
        />
      </Stack>

      {/* Menú nativo desplegable que flota sobre la app */}
      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 120, boxShadow: theme.shadows[3] } }}
      >
        <MenuItem onClick={(e) => { handleMenuClose(e); onEdit?.(exercise); }} sx={{ fontSize: 13, gap: 1 }}>
          <EditIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> Editar
        </MenuItem>
        <MenuItem onClick={(e) => { handleMenuClose(e); onDelete?.(exercise); }} sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
          <DeleteIcon sx={{ fontSize: 16, color: 'error.main' }} /> Eliminar
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default ExerciseCard;