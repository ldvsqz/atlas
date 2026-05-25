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

function DayPrintCard({ day }) {
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
      </Stack>
    </Box>
  );
}

export default DayPrintCard;
