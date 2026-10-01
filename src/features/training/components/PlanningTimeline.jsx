import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { normalizeCycleDay } from '../models/trainingModels';
import { useMicrocycleDays } from '../hooks/useMicrocycleDays';
import MicrocycleWorksheet from './MicrocycleWorksheet';

const buildWeekGroups = (days, weeks) => {
  const weekMap = days.map(normalizeCycleDay).reduce((groups, day) => ({
    ...groups,
    [day.weekIndex]: [...(groups[day.weekIndex] || []), day],
  }), {});

  return Array.from({ length: Math.max(Number(weeks) || 1, 1) }, (_, index) => ({
    weekIndex: index + 1,
    days: weekMap[index + 1] || [],
  }));
};

function PlanningTimeline({ cycle }) {
  const { days } = useMicrocycleDays(cycle.id, cycle.weeks);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedMesocycle, setSelectedMesocycle] = useState(0);
  const weekCount = Math.max(Number(cycle.weeks) || 1, 1);
  const mesocycleCount = Math.ceil(weekCount / 4);
  const weekGroups = useMemo(() => buildWeekGroups(days, weekCount), [days, weekCount]);
  const firstWeekOfMesocycle = selectedMesocycle * 4 + 1;
  const lastWeekOfMesocycle = Math.min(firstWeekOfMesocycle + 3, weekCount);
  const visibleWeekGroups = weekGroups.slice(firstWeekOfMesocycle - 1, lastWeekOfMesocycle);

  useEffect(() => {
    if (!weekGroups.some((group) => group.weekIndex === selectedWeek)) {
      setSelectedWeek(weekGroups[0]?.weekIndex || 1);
    }
  }, [selectedWeek, weekGroups]);

  useEffect(() => {
    const weekMesocycle = Math.floor((selectedWeek - 1) / 4);
    if (weekMesocycle !== selectedMesocycle) setSelectedMesocycle(weekMesocycle);
  }, [selectedMesocycle, selectedWeek]);

  const handleMesocycleChange = (event) => {
    const nextMesocycle = Number(event.target.value);
    setSelectedMesocycle(nextMesocycle);
    setSelectedWeek(nextMesocycle * 4 + 1);
  };

  return (
    <Stack spacing={1}>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Stack spacing={1} sx={{ p: { xs: 1, sm: 1.5 } }}>
          <FormControl size="small" fullWidth>
            <InputLabel id="mesocycle-select-label">Mesociclo</InputLabel>
            <Select
              labelId="mesocycle-select-label"
              id="mesocycle-select"
              value={selectedMesocycle}
              label="Mesociclo"
              onChange={handleMesocycleChange}
            >
              {Array.from({ length: mesocycleCount }, (_, index) => {
                const startWeek = index * 4 + 1;
                const endWeek = Math.min(startWeek + 3, weekCount);
                return (
                  <MenuItem key={index} value={index}>
                    Mesociclo {index + 1} · microciclos {startWeek}-{endWeek}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={selectedWeek}
            onChange={(_, value) => {
              if (value !== null) setSelectedWeek(value);
            }}
            aria-label={`Seleccionar microciclo del mesociclo ${selectedMesocycle + 1}`}
            sx={{
              '& .MuiToggleButton-root': {
                minWidth: 0,
                px: 0.5,
                py: 0.75,
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'none',
              },
            }}
          >
            {visibleWeekGroups.map((group) => {
              const dayCount = group.days.length;
              return (
                <ToggleButton
                  key={group.weekIndex}
                  value={group.weekIndex}
                  aria-label={`Microciclo ${group.weekIndex}, ${dayCount} sesiones`}
                >
                  {group.weekIndex}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Stack>
      </Box>
      <MicrocycleWorksheet
        key={`${cycle.id}-${selectedWeek}`}
        cycleId={cycle.id}
        weekIndex={selectedWeek}
      />
    </Stack>
  );
}

export default PlanningTimeline;
