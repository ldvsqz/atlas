import React, { forwardRef } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { CYCLE_LABELS, TRAINING_WEEK_DAYS } from '../models/trainingModels';
import { formatTrainingTotal, getMicrocycleDayTotals, getMicrocycleTotal } from '../utils/microcycleWorksheet';
import { getMicrocycleDate } from './publicCycleUtils';

const CyclePrintLayout = forwardRef(function CyclePrintLayout({ cycle, showHeader = true }, ref) {
  const weekCount = Math.max(Number(cycle?.weeks) || 1, 1);

  return (
    <Box
      ref={ref}
      className="cycle-print-document"
      sx={{
        color: 'text.primary',
        bgcolor: 'background.default',
        minHeight: '100vh',
        px: { xs: 1, sm: 1.5, md: 2 },
        py: { xs: 1, md: 1.5 },
        '@media print': { bgcolor: '#fff', color: '#111827', px: 0, py: 0, minHeight: 'auto' },
      }}
    >
      <Box
        sx={{
          maxWidth: 1080,
          mx: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.12)',
          '@media print': { maxWidth: 'none', boxShadow: 'none', borderRadius: 0 },
        }}
      >
        {showHeader && (
          <Box component="header" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', '@media print': { p: '6mm 8mm' } }}>
            <Typography variant="h5" component="h1" fontWeight={900}>{cycle.name || 'Ciclo de entrenamiento'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {CYCLE_LABELS[cycle.type] || cycle.type || 'Ciclo'} · {weekCount} microciclo{weekCount === 1 ? '' : 's'}
            </Typography>
            {cycle.description && <Typography variant="body2" sx={{ mt: 0.75 }}>{cycle.description}</Typography>}
          </Box>
        )}

        <Box sx={{ p: { xs: 1, sm: 2 }, '@media print': { p: '5mm 8mm' } }}>
          <Box sx={{ display: 'grid', gap: 2, '@media print': { gap: '5mm' } }}>
            {Array.from({ length: weekCount }, (_, index) => {
              const weekIndex = index + 1;
              const plan = cycle.microcyclePlans?.[String(weekIndex)] || {};
              const rows = Array.isArray(plan.rows) ? plan.rows : [];
              const dayTotals = getMicrocycleDayTotals(rows);
              const weeklyTotal = getMicrocycleTotal(rows);
              const cycleDate = getMicrocycleDate(cycle, weekIndex);

              return (
                <Paper
                  key={weekIndex}
                  component="section"
                  variant="outlined"
                  sx={{
                    p: { xs: 1, sm: 1.5 },
                    borderRadius: 1.5,
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                    '@media print': { p: '3mm', borderColor: '#cbd5e1', boxShadow: 'none' },
                  }}
                >
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="h6" fontWeight={900}>
                      Microciclo {weekIndex}
                      {cycleDate?.isValid() ? ` · ${cycleDate.format('DD/MM/YYYY')}` : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                      Ciclo: {cycle.name || 'Ciclo de entrenamiento'} · {CYCLE_LABELS[cycle.type] || cycle.type || 'Ciclo'}
                    </Typography>
                    {cycle.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {cycle.description}
                      </Typography>
                    )}
                    {plan.description && (
                      <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                        {plan.description}
                      </Typography>
                    )}
                  </Box>
                  <TableContainer sx={{ overflowX: 'auto', '@media print': { overflow: 'visible' } }}>
                    <Table
                      size="small"
                      aria-label={`Tabla del microciclo ${weekIndex}`}
                      sx={{
                        minWidth: 760,
                        tableLayout: 'fixed',
                        '& th, & td': { border: '1px solid', borderColor: 'divider', p: 0.75, verticalAlign: 'top' },
                        '@media print': {
                          minWidth: 0,
                          '& th, & td': { p: '1.5mm', fontSize: '7pt', borderColor: '#cbd5e1' },
                        },
                      }}
                    >
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover', '@media print': { bgcolor: '#f1f5f9' } }}>
                          <TableCell sx={{ width: '19%', fontWeight: 900 }}>Ejercicio</TableCell>
                          {TRAINING_WEEK_DAYS.map((day) => (
                            <TableCell key={day} align="center" sx={{ fontWeight: 900 }}>{day}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.length ? rows.map((row, rowIndex) => (
                          <TableRow key={row.id || `${weekIndex}-${rowIndex}`}>
                            <TableCell sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{row.exercise || '—'}</TableCell>
                            {TRAINING_WEEK_DAYS.map((day, dayIndex) => (
                              <TableCell key={day} align="center" sx={{ overflowWrap: 'anywhere' }}>
                                {row.cells?.[dayIndex + 1] || '—'}
                              </TableCell>
                            ))}
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>
                              Sin ejercicios registrados.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow sx={{ bgcolor: 'action.selected', '@media print': { bgcolor: '#f1f5f9' } }}>
                          <TableCell sx={{ fontWeight: 900 }}>
                            Total
                            <Typography variant="caption" display="block" color="text.secondary">
                              {formatTrainingTotal(weeklyTotal)}
                            </Typography>
                          </TableCell>
                          {dayTotals.map((total, dayIndex) => (
                            <TableCell key={TRAINING_WEEK_DAYS[dayIndex]} align="center" sx={{ fontWeight: 800 }}>
                              {formatTrainingTotal(total)}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </TableContainer>
                </Paper>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
});

export default CyclePrintLayout;
