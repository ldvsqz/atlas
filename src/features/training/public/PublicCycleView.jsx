import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Skeleton,
  Snackbar,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate, useParams } from 'react-router-dom';
import { CYCLE_LABELS, normalizeFirestoreDate } from '../models/trainingModels';
import TrainingService from '../../../../Firebase/trainingService';
import CyclePrintLayout from './CyclePrintLayout';
import PdfDownloadButton from './PdfDownloadButton';
import {
  collectExerciseIdsFromDays,
  getPublicCycleUrl,
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

function PublicCycleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState(null);
  const [days, setDays] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => getPublicCycleUrl(id), [id]);
  const headerDate = normalizeFirestoreDate(cycle?.createdAt);
  const plannedExercises = useMemo(
    () =>
      days.reduce(
        (total, day) =>
          total
          + (day.mainBlock?.exerciseIds?.length || 0)
          + (day.shadowBlock?.exerciseIds?.length || 0)
          + (day.extraBlock?.exerciseIds?.length || 0),
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
          setExercises([]);
          setError('Este ciclo no existe o no está marcado como público.');
          return;
        }

        const cycleDays = await TrainingService.getPublicCycleDays(publicCycle.id);
        const exerciseIds = collectExerciseIdsFromDays(cycleDays);
        const referencedExercises = await TrainingService.getExercisesByIds(exerciseIds);

        if (mounted) {
          setCycle(publicCycle);
          setDays(cycleDays);
          setExercises(referencedExercises);
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
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
            <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleCopyLink} disabled={!id}>
              Link
            </Button>
            <PdfDownloadButton
              cycle={cycle}
              exercises={exercises}
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
              {cycle?.name || 'Vista pública del ciclo'}
            </Typography>
          </Box>
          {cycle && (
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ display: { xs: 'none', md: 'flex' } }}>
              <Chip label={CYCLE_LABELS[cycle.type] || cycle.type || 'Ciclo'} size="small" color="primary" />
              <Chip label={`${days.length} días`} size="small" variant="outlined" />
              <Chip label={`${plannedExercises} ejercicios`} size="small" variant="outlined" />
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
        <CyclePrintLayout cycle={cycle} days={days} exercises={exercises} />
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
