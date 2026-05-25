import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Toolbar,
  Typography,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LayersIcon from '@mui/icons-material/Layers';
import MapIcon from '@mui/icons-material/Map';
import NotesIcon from '@mui/icons-material/Notes';
import TodayIcon from '@mui/icons-material/Today';
import { useParams } from 'react-router-dom';
import { CYCLE_LABELS, normalizeFirestoreDate } from '../models/trainingModels';
import TrainingService from '../../../../Firebase/trainingService';
import CyclePrintLayout from './CyclePrintLayout';
import PdfDownloadButton from './PdfDownloadButton';
import {
  getPublicCycleUrl,
  groupDaysByWeek,
} from './publicCycleUtils';

function PublicCycleSkeleton() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Skeleton variant="rounded" height={220} sx={{ mb: 2 }} />
      <Stack spacing={2}>
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} variant="rounded" height={180} />
        ))}
      </Stack>
    </Container>
  );
}

function StatTile({ icon, label, value }) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        p: 1.25,
        minWidth: 0,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
            color: 'primary.main',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

function PublicCycleHeader({
  cycle,
  days,
  groupedDays,
  headerDate,
  planningStats,
  onCopyLink,
  pdfDisabled,
  onPdfError,
}) {
  return (
    <Container maxWidth="lg" className="no-print" sx={{ pt: { xs: 2, md: 3 }, pb: 1 }}>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          boxShadow: '0 18px 55px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 2.5, md: 3 },
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'grey.50',
          }}
        >
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'flex-start' }}>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                  <Chip icon={<LayersIcon />} label={CYCLE_LABELS[cycle.type] || cycle.type || 'Ciclo'} color="primary" size="small" />
                  <Chip icon={<CalendarMonthIcon />} label={`${Object.keys(groupedDays).length || 1} microciclo${Object.keys(groupedDays).length === 1 ? '' : 's'}`} size="small" variant="outlined" />
                  {headerDate?.isValid() && (
                    <Chip icon={<TodayIcon />} label={headerDate.format('DD/MM/YYYY')} size="small" variant="outlined" />
                  )}
                </Stack>
                <Typography variant="h4" component="h1" fontWeight={900} sx={{ fontSize: { xs: 26, sm: 32, md: 38 }, lineHeight: 1.05, overflowWrap: 'anywhere' }}>
                  {cycle.name || 'Ciclo de entrenamiento'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 820, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {cycle.description || 'Planificación disponible para consulta.'}
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1} sx={{ width: { xs: '100%', md: 180 }, flexShrink: 0 }}>
                <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={onCopyLink} fullWidth>
                  Copiar link
                </Button>
                <PdfDownloadButton
                  cycle={cycle}
                  days={days}
                  disabled={pdfDisabled}
                  onError={onPdfError}
                />
              </Stack>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                gap: 1,
              }}
            >
              <StatTile icon={<CalendarMonthIcon fontSize="small" />} label="Microciclos" value={Object.keys(groupedDays).length || 1} />
              <StatTile icon={<TodayIcon fontSize="small" />} label="Sesiones" value={days.length} />
              <StatTile icon={<NotesIcon fontSize="small" />} label="Notas" value={planningStats.notes} />
              <StatTile icon={<MapIcon fontSize="small" />} label="Circuitos" value={planningStats.layouts} />
            </Box>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.25, overflowX: 'auto' }}>
          <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
            {Object.entries(groupedDays).map(([weekIndex, weekDays]) => (
              <Chip
                key={weekIndex}
                label={`Microciclo ${weekIndex} · ${weekDays.length}`}
                clickable
                variant="outlined"
                onClick={() => {
                  if (typeof document === 'undefined') return;
                  document.getElementById(`public-week-${weekIndex}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
              />
            ))}
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}

function PublicCycleView() {
  const { id } = useParams();
  const [cycle, setCycle] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => getPublicCycleUrl(id), [id]);
  const headerDate = normalizeFirestoreDate(cycle?.createdAt);
  const groupedDays = useMemo(() => groupDaysByWeek(days), [days]);
  const planningStats = useMemo(
    () =>
      days.reduce(
        (stats, day) => ({
          notes:
            stats.notes
            + (day.mainBlock?.notes?.trim() ? 1 : 0)
            + (day.shadowBlock?.notes?.trim() ? 1 : 0),
          layouts: stats.layouts + (day.mainBlock?.gymLayoutId || day.mainBlock?.gymLayoutName ? 1 : 0),
        }),
        { notes: 0, layouts: 0 }
      ),
    [days]
  );

  const plannedSessions = useMemo(
    () =>
      days.reduce(
        (total, day) =>
          total + (day.mainBlock?.notes?.trim() || day.shadowBlock?.notes?.trim() || day.mainBlock?.gymLayoutId || day.mainBlock?.gymLayoutName ? 1 : 0),
        0
      ),
    [days]
  );

  useEffect(() => {
    let mounted = true;

    const fetchCycle = async () => {
      try {
        setLoading(true);
        setError('');

        const publicCycle = await TrainingService.getPublicCycle(id);
        if (!publicCycle) {
          setCycle(null);
          setDays([]);
          setError('Este ciclo no existe o no está marcado como público.');
          return;
        }

        const cycleDays = await TrainingService.getPublicCycleDays(publicCycle.id);

        if (mounted) {
          setCycle(publicCycle);
          setDays(cycleDays);
        }
      } catch (fetchError) {
        console.error('Error loading public cycle:', fetchError);
        if (mounted) {
          setError('No pudimos cargar el ciclo público. Verifica el link o intenta de nuevo.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCycle();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const input = document.createElement('input');
        input.value = publicUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
    } catch (copyError) {
      console.error('Error copying public cycle link:', copyError);
      setError('No pudimos copiar el link automáticamente.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'background.default' : '#f8fafc',
      }}
    >
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        className="no-print"
        sx={{ borderBottom: '1px solid', borderColor: 'divider', backdropFilter: 'blur(10px)' }}
      >
        <Toolbar
          variant="dense"
          sx={{
            position: 'relative',
            minHeight: 40,
            gap: 0.75,
            flexWrap: 'nowrap',
            py: 0.25,
            px: { xs: 0.75, sm: 1.25 },
            '& .MuiButton-root': {
              minHeight: 28,
              px: 1,
              fontSize: 12,
            },
            '& .MuiChip-root': { height: 24 },
          }}
        >
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }} className="no-print">
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.close();
                }
              }}
            >
              Volver
            </Button>
            <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleCopyLink} disabled={!id} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              Link
            </Button>
            <PdfDownloadButton
              cycle={cycle}
              days={days}
              disabled={loading || Boolean(error) || !cycle}
              onError={setError}
              compact
            />
          </Stack>
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={800} noWrap>
              {headerDate?.isValid() ? headerDate.format('DD/MM/YYYY') : ''}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, ml: { xs: 0.5, sm: 1 }, textAlign: 'right' }}>
            <Typography variant="body2" fontWeight={900} noWrap>
              {cycle?.name || 'Planificación pública'}
            </Typography>
          </Box>
          {cycle && (
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ display: { xs: 'none', md: 'flex' } }}>
              <Chip label={CYCLE_LABELS[cycle.type] || cycle.type || 'Ciclo'} size="small" color="primary" />
              <Chip label={`${days.length} sesiones`} size="small" variant="outlined" />
              <Chip label={`${plannedSessions} planificadas`} size="small" variant="outlined" />
              <Chip label={`${planningStats.layouts} circuitos`} size="small" variant="outlined" />
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {loading ? (
        <PublicCycleSkeleton />
      ) : error ? (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="warning" sx={{ borderRadius: 1 }}>
            {error}
          </Alert>
        </Container>
      ) : (
        <>
          <PublicCycleHeader
            cycle={cycle}
            days={days}
            groupedDays={groupedDays}
            headerDate={headerDate}
            planningStats={planningStats}
            onCopyLink={handleCopyLink}
            pdfDisabled={loading || Boolean(error) || !cycle}
            onPdfError={setError}
          />
          <CyclePrintLayout cycle={cycle} days={days} showHeader={false} />
        </>
      )}

      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        message="Link copiado"
        className="no-print"
      />
    </Box>
  );
}

export default PublicCycleView;
