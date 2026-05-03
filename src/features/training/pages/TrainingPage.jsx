import React, { useState } from 'react';
import { Box, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import TimelineIcon from '@mui/icons-material/Timeline';
import CycleList from '../components/CycleList';
import { ExerciseCatalog } from '../components/ExerciseCatalog';
import { useExercises } from '../hooks/useExercises';

const CYCLES_TAB = 'cycles';
const EXERCISES_TAB = 'exercises';

function TrainingPage({ menu }) {
  const [activeTab, setActiveTab] = useState(CYCLES_TAB);
  const exerciseState = useExercises();

  return (
    <Box>
      {menu}
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.5, sm: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: 28, sm: 34 } }}>
            Planificación
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Ciclos de entrenamiento y catálogo de ejercicios.
          </Typography>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 1,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="fullWidth"
            sx={{
              minHeight: { xs: 48, sm: 56 },
              '& .MuiTab-root': {
                minHeight: { xs: 48, sm: 56 },
                px: { xs: 1, sm: 2 },
              },
            }}
          >
            <Tab
              icon={<TimelineIcon />}
              iconPosition="start"
              label="Ciclos"
              value={CYCLES_TAB}
            />
            <Tab
              icon={<FitnessCenterIcon />}
              iconPosition="start"
              label="Ejercicios"
              value={EXERCISES_TAB}
            />
          </Tabs>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 1, p: { xs: 1.5, md: 3 } }}>
          {activeTab === CYCLES_TAB && (
            <CycleList exercises={exerciseState.exercises} />
          )}

          {activeTab === EXERCISES_TAB && (
            <ExerciseCatalog {...exerciseState} />
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default TrainingPage;
