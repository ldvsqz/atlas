import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
  Fab,
  alpha // <--- Importación corregida aquí
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ExerciseCard from './ExerciseCard';

function ExercisePalette({
  exercises,
  placedExerciseIds = [],
  loading = false,
  onCreate,
  onEdit,
  onDelete,
  selectedExercise,
  onSelectExercise,
}) {
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const placedIds = useMemo(() => new Set(placedExerciseIds), [placedExerciseIds]);

  const availableExercises = useMemo(() => {
    const value = search.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (placedIds.has(exercise.id)) return false;
      return !value || [exercise.name, exercise.description, exercise.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(value));
    });
  }, [exercises, placedIds, search]);

  const renderContent = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.5px' }}>
            Estaciones
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={onCreate}
            size="small"
            sx={{ borderRadius: 1.5, textTransform: 'none', boxShadow: 'none', fontWeight: 800 }}
          >
            Nueva
          </Button>
        </Stack>
        
        {isMobile && selectedExercise && (
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, mt: 1, display: 'block', bgcolor: alpha(theme.palette.primary.main, 0.05), p: 1, borderRadius: 1 }}>
            Seleccionado: "{selectedExercise.name}". Toca una celda vacía en el plano.
          </Typography>
        )}

        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          label="Buscar equipamiento..."
          size="small"
          fullWidth
          sx={{ mt: isMobile ? 1.5 : 2 }}
        />
      </Box>
      <Divider />
      
      <Stack 
        spacing={1.25} 
        sx={{ 
          p: 2, 
          overflowY: 'auto', 
          flex: 1, 
          maxHeight: isMobile ? '60vh' : 'none',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        {loading ? (
          <>
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={80} />
          </>
        ) : availableExercises.length ? (
          availableExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onEdit={onEdit}
              onDelete={onDelete}
              isSelected={selectedExercise?.id === exercise.id}
              onSelect={(ex) => {
                onSelectExercise(ex);
                if (isMobile) setMobileOpen(false); 
              }}
            />
          ))
        ) : (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4, bgcolor: alpha(theme.palette.divider, 0.03), borderRadius: 2 }}>
            No hay elementos disponibles para agregar.
          </Typography>
        )}
      </Stack>
    </Box>
  );

  if (isMobile) {
    return (
      <>
        <Fab
          color="primary"
          variant="extended"
          onClick={() => setMobileOpen(true)}
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16, 
            zIndex: 1200, 
            fontWeight: 800, 
            textTransform: 'none', 
            gap: 1,
            boxShadow: theme.shadows[4]
          }}
        >
          <FitnessCenterIcon />
          {selectedExercise ? `Listo: ${selectedExercise.name}` : ""}
        </Fab>

        <SwipeableDrawer
          anchor="bottom"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onOpen={() => setMobileOpen(true)}
          PaperProps={{ 
            sx: { 
              borderTopLeftRadius: 20, 
              borderTopRightRadius: 20, 
              overflow: 'hidden',
              maxHeight: '80vh'
            } 
          }}
        >
          <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mt: 1.5, mb: 0.5 }} />
          {renderContent()}
        </SwipeableDrawer>
      </>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, height: '100%', overflow: 'hidden' }}>
      {renderContent()}
    </Paper>
  );
}

export default ExercisePalette;