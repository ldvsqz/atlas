import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
  alpha // Importación corregida aquí
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

function LayoutToolbar({
  layout,
  placedCount = 0,
  saving = false,
  onChange,
  onSave,
  onNew,
  onClear,
  onDownloadPdf,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        borderRadius: isMobile ? 2 : 3, 
        p: 1.5, 
        borderColor: isMobile ? alpha(theme.palette.divider, 0.5) : 'divider'
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant={isMobile ? 'body1' : 'h5'} fontWeight={900} sx={{ lineHeight: 1.2 }}>
            {layout.name || 'Circuito sin nombre'}
          </Typography>
        </Box>

        <Stack direction="column" spacing={1} sx={{ width: { xs: '100%', md: 460 } }}>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Renombrar"
              value={layout.name || ''}
              onChange={(event) => onChange({ ...layout, name: event.target.value })}
              fullWidth
            />
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
            {isMobile ? (
              <>
                <IconButton 
                  color="primary" 
                  onClick={onNew} 
                  disabled={saving}
                  sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 1.5, p: 1, flex: 1 }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>

                <IconButton 
                  color="inherit" 
                  onClick={onClear} 
                  disabled={saving || !placedCount} 
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1, flex: 1 }}
                >
                  <RestartAltIcon fontSize="small" />
                </IconButton>

                <IconButton 
                  color="inherit" 
                  onClick={onDownloadPdf} 
                  disabled={!placedCount} 
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1, flex: 1 }}
                >
                  <PictureAsPdfIcon fontSize="small" />
                </IconButton>

                <IconButton 
                  color="primary" 
                  variant="contained"
                  onClick={onSave} 
                  disabled={saving}
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    borderRadius: 1.5, 
                    p: 1, 
                    flex: 1,
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
                  }}
                >
                  {saving ? <CircularProgress color="inherit" size={18} /> : <SaveIcon fontSize="small" />}
                </IconButton>
              </>
            ) : (
              <>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={onNew} disabled={saving} sx={{ borderRadius: 1.5, textTransform: 'none' }}>
                  Nuevo
                </Button>
                <Button color="inherit" variant="outlined" startIcon={<RestartAltIcon />} onClick={onClear} disabled={saving || !placedCount} sx={{ borderRadius: 1.5, textTransform: 'none' }}>
                  Limpiar
                </Button>
                <Button color="inherit" variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={onDownloadPdf} disabled={!placedCount} sx={{ borderRadius: 1.5, textTransform: 'none' }}>
                  PDF
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress color="inherit" size={16} /> : <SaveIcon />}
                  onClick={onSave}
                  disabled={saving}
                  sx={{ borderRadius: 1.5, textTransform: 'none', boxShadow: 'none' }}
                >
                  Guardar
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default LayoutToolbar;
