import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { CYCLE_LABELS, normalizeFirestoreDate } from '../models/trainingModels';
import DayEditor from './DayEditor';
import { downloadCyclePdf } from '../utils/downloadCyclePdf';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';

function CycleCard({ cycle, exercises, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const createdAt = normalizeFirestoreDate(cycle.createdAt);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadCyclePdf(cycle, exercises);
      showSnackbar('Ciclo descargado correctamente', 'success');
    } catch (error) {
      console.error('Error downloading cycle:', error);
      showSnackbar('Error al descargar el ciclo', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 1, height: '100%' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'flex-start' }} justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>
              {cycle.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {cycle.description || 'Sin descripción'}
            </Typography>
          </Box>
          <Chip label={CYCLE_LABELS[cycle.type]} size="small" />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <Chip icon={<EventNoteIcon />} label={`${cycle.weeks} semana${cycle.weeks === 1 ? '' : 's'}`} size="small" variant="outlined" />
          {createdAt?.isValid() && (
            <Chip label={createdAt.format('DD/MM/YYYY')} size="small" variant="outlined" />
          )}
        </Stack>
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton aria-label="Editar ciclo" onClick={() => onEdit(cycle)}>
            <EditIcon />
          </IconButton>
          <IconButton aria-label="Eliminar ciclo" onClick={() => onDelete(cycle.id)}>
            <DeleteIcon />
          </IconButton>
          <IconButton aria-label="Descargar ciclo" onClick={handleDownload} disabled={downloading}>
            <DownloadIcon />
          </IconButton>
        </Box>
        <Button
          endIcon={<ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }} />}
          onClick={() => setExpanded((current) => !current)}
          sx={{ ml: { xs: 0, sm: 'auto' } }}
        >
          Días
        </Button>
      </CardActions>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2, pt: 0 }}>
          <DayEditor cycleId={cycle.id} weeks={cycle.weeks} exercises={exercises} />
        </Box>
      </Collapse>
    </Card>
  );
}

export default CycleCard;
