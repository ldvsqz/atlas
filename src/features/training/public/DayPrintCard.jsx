import React from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import { getBlockTitle } from './publicCycleUtils';

const BLOCKS = ['shadowBlock', 'mainBlock'];

function TrainingBlock({ blockKey, block }) {
  const hasNotes = Boolean(block?.notes?.trim());
  const hasLinkedLayout = blockKey === 'mainBlock' && Boolean(block?.gymLayoutId || block?.gymLayoutName);

  return (
    <Box
      sx={{
        borderLeft: '4px solid',
        borderColor: blockKey === 'mainBlock' ? 'primary.main' : 'divider',
        pl: { xs: 1.5, sm: 2 },
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} justifyContent="space-between" sx={{ mb: 1.25 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={900}>
          {getBlockTitle(blockKey)}
        </Typography>
        {hasLinkedLayout && (
          <Chip
            icon={<MapIcon />}
            label={block.gymLayoutName || 'Circuito vinculado'}
            size="small"
            variant="outlined"
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          />
        )}
      </Stack>

      <Stack spacing={1}>
        {hasNotes && (
          <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>
              Notas del bloque
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {block.notes}
            </Typography>
          </Box>
        )}

        {!hasNotes && !hasLinkedLayout && (
          <Typography variant="body2" color="text.secondary">
            Sin notas registradas.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function CircuitSummary({ block, circuitDetails }) {
  const layout = circuitDetails?.layout;
  const stations = circuitDetails?.stations || [];
  const circuitName = block?.gymLayoutName || layout?.name || 'Circuito vinculado';

  if (!block?.gymLayoutId && !block?.gymLayoutName) return null;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: { xs: 1.25, sm: 1.5 },
        bgcolor: 'action.hover',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <MapIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>
          {circuitName}
        </Typography>
      </Stack>

      {stations.length ? (
        <Stack
          component="ol"
          spacing={0.5}
          sx={{
            pl: 2.5,
            my: 0,
            '& li::marker': { fontWeight: 800 },
          }}
        >
          {stations.map((station) => (
            <Typography component="li" variant="body2" key={station.id} sx={{ overflowWrap: 'anywhere' }}>
              {station.name}
            </Typography>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Circuito vinculado sin estaciones disponibles.
        </Typography>
      )}

      {layout?.listNotes && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, whiteSpace: 'pre-wrap' }}>
          {layout.listNotes}
        </Typography>
      )}
    </Box>
  );
}

function DayPrintCard({ day, circuitDetails }) {
  return (
    <Box
      component="article"
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 2.5 },
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            Día {day.dayOfWeek || day.dayIndex}
          </Typography>
          <Typography variant="h6" fontWeight={900}>
            {day.name || `Día ${day.dayIndex}`}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
          Microciclo {day.weekIndex || 1}
        </Typography>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={2.25}>
        {BLOCKS.map((blockKey) => (
          <TrainingBlock
            key={blockKey}
            blockKey={blockKey}
            block={day[blockKey]}
          />
        ))}
        <CircuitSummary block={day.mainBlock} circuitDetails={circuitDetails} />
      </Stack>
    </Box>
  );
}

export default DayPrintCard;
