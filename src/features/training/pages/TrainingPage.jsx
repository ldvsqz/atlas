import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import CycleList from '../components/CycleList';

function TrainingPage({ menu }) {
  return (
    <Box>
      {menu}
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.5, sm: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: 28, sm: 34 } }}>
            Planificación
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Ciclos de entrenamiento, sesiones y circuitos.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 1, p: { xs: 1.5, md: 3 } }}>
          <CycleList />
        </Paper>
      </Container>
    </Box>
  );
}

export default TrainingPage;
