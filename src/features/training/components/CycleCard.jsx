import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import EventNoteIcon from '@mui/icons-material/EventNote';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import { CYCLE_LABELS, normalizeFirestoreDate } from '../models/trainingModels';
import PlanningTimeline from './PlanningTimeline';
import { downloadCyclePdf } from '../utils/downloadCyclePdf';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';
import { getPublicCycleUrl } from '../public/publicCycleUtils';

function CycleCard({ cycle, exercises = [], onEdit, onDelete }) {
  const [downloading, setDownloading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [microcyclesOpen, setMicrocyclesOpen] = useState(false);
  const { showSnackbar } = useSnackbar();
  const createdAt = normalizeFirestoreDate(cycle.createdAt);
  const publicUrl = getPublicCycleUrl(cycle.id);
  const isPublic = cycle.public !== false;

  const openMenu = (e) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  const copyPublicLink = async (e) => {
    e?.preventDefault?.();
    if (!isPublic) {
      showSnackbar('Activa la vista pública del ciclo antes de compartirlo', 'warning');
      closeMenu();
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      showSnackbar('Link público copiado', 'success');
    } catch (error) {
      console.error('Error copying public cycle link:', error);
      showSnackbar('No se pudo copiar el link', 'error');
    } finally {
      closeMenu();
    }
  };

  const openPublicCycle = () => {
    if (!isPublic) {
      showSnackbar('Activa la vista pública del ciclo para verlo por link', 'warning');
      closeMenu();
      return;
    }

    window.open(publicUrl, '_blank', 'noopener,noreferrer');
    closeMenu();
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
      closeMenu();
    }
  };

  const handleDelete = () => {
    onDelete(cycle.id);
    closeMenu();
  };

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        minHeight: 'auto',
        borderRadius: 2.5,
        overflow: 'hidden',
        borderColor: 'divider',
        borderTop: '3px solid',
        borderTopColor: 'primary.main',
        background: (theme) => theme.palette.mode === 'dark' ? 'background.paper' : '#fff',
        boxShadow: (theme) => theme.palette.mode === 'dark'
          ? '0 8px 20px rgba(0,0,0,0.14)'
          : '0 4px 14px rgba(15,23,42,0.06)',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 10px 26px rgba(0,0,0,0.18)'
            : '0 10px 26px rgba(15,23,42,0.10)',
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 0.5 }}
          >
            <Box sx={{ minWidth: 0, flex: 1, pr: 0.5 }}>
              <Typography variant="h6" fontWeight={800} sx={{ overflowWrap: 'anywhere', lineHeight: 1.2 }}>
                {cycle.name}
              </Typography>

              <Tooltip title={cycle.description || 'Sin descripción'} arrow>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 0.25,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '0.82rem',
                    lineHeight: 1.35,
                  }}
                >
                  {cycle.description || 'Sin descripción'}
                </Typography>
              </Tooltip>
            </Box>

            <Chip
              label={CYCLE_LABELS[cycle.type]}
              size="small"
              color="primary"
              sx={{ fontWeight: 700, px: 1, minHeight: 28, flexShrink: 0 }}
            />
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            <Chip icon={<EventNoteIcon />} label={`${cycle.weeks} microciclo${cycle.weeks === 1 ? '' : 's'}`} size="small" variant="outlined" sx={{ minHeight: 28 }} />
            {createdAt?.isValid() && (
              <Chip icon={<CalendarMonthIcon />} label={createdAt.format('DD/MM/YYYY')} size="small" variant="outlined" sx={{ minHeight: 28 }} />
            )}
            <Chip label={isPublic ? 'Público' : 'Privado'} size="small" variant="outlined" color={isPublic ? 'success' : 'default'} sx={{ minHeight: 28 }} />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditCalendarIcon />}
              onClick={() => setMicrocyclesOpen(true)}
              sx={{ minHeight: 34, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Editar microciclos
            </Button>
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.75, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Tooltip title="Editar ciclo">
                <IconButton
                  aria-label="Editar ciclo"
                  onClick={() => onEdit(cycle)}
                  size="small"
                  sx={{ width: 34, height: 34, border: '1px solid', borderColor: 'primary.main', bgcolor: 'background.paper', color: 'primary.main', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Ver ciclo">
                <IconButton
                  aria-label="Ver ciclo"
                  onClick={openPublicCycle}
                  size="small"
                  sx={{ width: 34, height: 34, border: '1px solid', borderColor: 'info.main', bgcolor: 'background.paper', color: 'info.main', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Compartir ciclo">
                <IconButton
                  aria-label="Compartir ciclo"
                  onClick={copyPublicLink}
                  size="small"
                  sx={{ width: 34, height: 34, border: '1px solid', borderColor: 'secondary.main', bgcolor: 'background.paper', color: 'secondary.main', '&:hover': { bgcolor: 'action.hover' } }}
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
                    size="small"
                    sx={{ width: 34, height: 34, border: '1px solid', borderColor: 'success.main', bgcolor: 'background.paper', color: 'success.main', '&:hover': { bgcolor: 'action.hover' }, '&.Mui-disabled': { borderColor: 'action.disabled' } }}
                  >
                    {downloading ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Eliminar ciclo">
                <IconButton
                  aria-label="Eliminar ciclo"
                  onClick={() => onDelete(cycle.id)}
                  size="small"
                  color="error"
                  sx={{ width: 34, height: 34, border: '1px solid', borderColor: 'error.main', bgcolor: 'background.paper', '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
              <IconButton aria-label="Más acciones" onClick={openMenu} size="small" sx={{ width: 30, height: 30 }}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          </Stack>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={closeMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { onEdit(cycle); closeMenu(); }}>Editar</MenuItem>
            <MenuItem onClick={() => { openPublicCycle(); }}>Ver</MenuItem>
            <MenuItem onClick={() => { copyPublicLink(); }}>Compartir</MenuItem>
            <MenuItem onClick={() => { handleDownload(); }}>{downloading ? 'Generando...' : 'Descargar PDF'}</MenuItem>
            <MenuItem onClick={() => { handleDelete(); }}>Eliminar</MenuItem>
          </Menu>
        </Stack>
      </CardContent>

      <Divider sx={{ my: 0 }} />

      <Dialog
        open={microcyclesOpen}
        onClose={() => setMicrocyclesOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ p: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton
            aria-label="Cerrar edición de microciclos"
            onClick={() => setMicrocyclesOpen(false)}
            edge="end"
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 0.75, sm: 1.5 }, pt: 1, pb: 1.5 }}>
          <PlanningTimeline cycle={cycle} exercises={exercises} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default CycleCard;
