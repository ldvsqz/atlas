import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CYCLE_LABELS, normalizeFirestoreDate } from '../models/trainingModels';
import PlanningTimeline from './PlanningTimeline';
import { downloadCyclePdf } from '../utils/downloadCyclePdf';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';
import { getPublicCycleUrl } from '../public/publicCycleUtils';

function CycleCard({ cycle, exercises = [], onEdit, onDelete }) {
  const [downloading, setDownloading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const createdAt = normalizeFirestoreDate(cycle.createdAt);
  const publicUrl = getPublicCycleUrl(cycle.id);

  const copyPublicLink = async (e) => {
    e.preventDefault();
    if (cycle.public === false) {
      showSnackbar('Activa la vista pública del ciclo antes de compartirlo', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      showSnackbar('Link público copiado', 'success');
    } catch (error) {
      console.error('Error copying public cycle link:', error);
      showSnackbar('No se pudo copiar el link', 'error');
    }
  };

  const openPublicCycle = () => {
    if (cycle.public === false) {
      showSnackbar('Activa la vista pública del ciclo para verlo por link', 'warning');
      return;
    }

    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  };

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
        <Stack spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>
              {cycle.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {cycle.description || 'Sin descripción'}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            alignItems="center"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1,
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
            }}
          >
            <Chip label={CYCLE_LABELS[cycle.type]} size="small" />
            <Chip icon={<EventNoteIcon />} label={`${cycle.weeks} microciclo${cycle.weeks === 1 ? '' : 's'}`} size="small" variant="outlined" />
            {createdAt?.isValid() && (
              <Chip label={createdAt.format('DD/MM/YYYY')} size="small" variant="outlined" />
            )}

            <Box sx={{ flexGrow: 1, minWidth: 8 }} />

            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ flexShrink: 0 }}>
              <Tooltip title="Editar ciclo">
                <IconButton
                  aria-label="Editar ciclo"
                  onClick={() => onEdit(cycle)}
                  size="medium"
                  sx={{
                    width: 36,
                    height: 36,
                    border: '1px solid',
                    borderColor: 'primary.main',
                    bgcolor: 'background.paper',
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Ver ciclo">
                <IconButton
                  aria-label="Ver ciclo"
                  onClick={openPublicCycle}
                  size="medium"
                  sx={{
                    width: 36,
                    height: 36,
                    border: '1px solid',
                    borderColor: 'info.main',
                    bgcolor: 'background.paper',
                    color: 'info.main',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Compartir ciclo">
                <IconButton
                  aria-label="Compartir ciclo"
                  onClick={copyPublicLink}
                  size="medium"
                  sx={{
                    width: 36,
                    height: 36,
                    border: '1px solid',
                    borderColor: 'secondary.main',
                    bgcolor: 'background.paper',
                    color: 'secondary.main',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={downloading ? 'Generando PDF' : 'Descargar PDF'}>
                <span>
                  <IconButton
                    aria-label="Descargar PDF"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDownload();
                    }}
                    disabled={downloading}
                    size="medium"
                    sx={{
                      width: 36,
                      height: 36,
                      border: '1px solid',
                      borderColor: 'success.main',
                      bgcolor: 'background.paper',
                      color: 'success.main',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      '&.Mui-disabled': {
                        borderColor: 'action.disabled',
                      },
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Eliminar ciclo">
                <IconButton
                  aria-label="Eliminar ciclo"
                  onClick={() => onDelete(cycle.id)}
                  size="medium"
                  color="error"
                  sx={{
                    width: 36,
                    height: 36,
                    border: '1px solid',
                    borderColor: 'error.main',
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: 'error.main',
                      color: 'error.contrastText',
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>

      <Divider />

      <Box sx={{ p: 2 }}>
        <PlanningTimeline cycle={cycle} exercises={exercises} />
      </Box>
    </Card>
  );
}

export default CycleCard;
