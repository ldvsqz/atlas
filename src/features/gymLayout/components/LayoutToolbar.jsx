import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

function LayoutToolbar({
  layout,
  layouts = [],
  placedCount = 0,
  saving = false,
  onChange,
  onLoad,
  onSave,
  onNew,
  onClear,
  onDownloadPdf,
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, p: 1.5 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h6" fontWeight={900}>
            {layout.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Grid fijo 3 columnas x 6 filas · {placedCount} ejercicios colocados
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            select
            size="small"
            label="Planos guardados"
            value={layout.id}
            onChange={(event) => onLoad?.(event.target.value)}
            sx={{ minWidth: { sm: 210 } }}
          >
            <MenuItem value={layout.id}>{layout.name || 'Plano actual'}</MenuItem>
            {layouts
              .filter((savedLayout) => savedLayout.id !== layout.id)
              .map((savedLayout) => (
                <MenuItem key={savedLayout.id} value={savedLayout.id}>
                  {savedLayout.name}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            size="small"
            label="Nombre"
            value={layout.name}
            onChange={(event) => onChange({ ...layout, name: event.target.value })}
            sx={{ minWidth: { sm: 180 } }}
          />

          <Button color="inherit" variant="outlined" startIcon={<AddIcon />} onClick={onNew} disabled={saving}>
            Nuevo
          </Button>

          <Tooltip title="Vaciar plano">
            <Button
              color="inherit"
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={onClear}
              disabled={saving || !placedCount}
            >
              Limpiar
            </Button>
          </Tooltip>
          <Button
            color="inherit"
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            onClick={onDownloadPdf}
            disabled={!placedCount}
          >
            PDF
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress color="inherit" size={16} /> : <SaveIcon />}
            onClick={onSave}
            disabled={saving}
          >
            Guardar
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default LayoutToolbar;
