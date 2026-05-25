import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputBase,
  Paper,
  Skeleton,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';

const getLayoutStations = (layout, exercisesById) => {
  const placedIds = layout.items?.map((item) => String(item.exerciseId)) || [];
  const order = [
    ...(layout.exerciseOrder || []).filter((exerciseId) => placedIds.includes(String(exerciseId))),
    ...placedIds.filter((exerciseId) => !(layout.exerciseOrder || []).includes(exerciseId)),
  ];

  return order
    .map((exerciseId) => exercisesById.get(String(exerciseId)))
    .filter(Boolean);
};

function LayoutCatalogCard({ layout, stations, onOpen, onDelete }) {
  const visibleStations = stations.slice(0, 8);
  const remainingStations = Math.max(stations.length - visibleStations.length, 0);

  return (
    <Paper
      component="article"
      role="button"
      tabIndex={0}
      variant="outlined"
      onClick={() => onOpen(layout)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(layout);
        }
      }}
      sx={{
        width: '100%',
        minHeight: 184,
        borderRadius: 2,
        p: 0,
        overflow: 'hidden',
        textAlign: 'left',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, background-color 160ms ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: 'primary.main',
        },
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',
          transform: 'translateY(-2px)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      <Box
        sx={{
          px: 1.75,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? alpha(theme.palette.primary.main, 0.16)
            : alpha(theme.palette.primary.main, 0.07),
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'background.paper',
              color: 'primary.main',
              flexShrink: 0,
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
            }}
          >
            <MapIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={900} sx={{ overflowWrap: 'anywhere', lineHeight: 1.15 }}>
              {layout.name || 'Circuito sin nombre'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <IconButton
              aria-label="Eliminar circuito"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(layout);
              }}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                  borderColor: 'error.main',
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
            <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 18, alignSelf: 'center' }} />
          </Stack>
        </Stack>
      </Box>

      <Stack
        component="ol"
        spacing={0.75}
        sx={{
          m: 0,
          px: 1.75,
          py: 1.5,
          listStyle: 'none',
          counterReset: 'station',
        }}
      >
        {visibleStations.length ? visibleStations.map((station) => (
          <Box
            key={station.id}
            component="li"
            sx={{
              counterIncrement: 'station',
              display: 'grid',
              gridTemplateColumns: '24px 1fr',
              gap: 1,
              alignItems: 'start',
              color: 'text.secondary',
              minWidth: 0,
              '&::before': {
                content: 'counter(station)',
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
                fontWeight: 900,
                color: 'primary.main',
                bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
              },
            }}
          >
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere', lineHeight: 1.35 }}>
              {station.name}
            </Typography>
          </Box>
        )) : (
          <Box
            component="li"
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              px: 1.25,
              py: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Sin estaciones colocadas
            </Typography>
          </Box>
        )}
        {remainingStations > 0 && (
          <Typography component="li" variant="body2" color="primary.main" fontWeight={900} sx={{ pl: 4 }}>
            +{remainingStations} más
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

function LayoutCatalog({
  layouts = [],
  exercises = [],
  loading = false,
  onOpen,
  onCreate,
  onDelete,
}) {
  const [search, setSearch] = useState('');
  const exercisesById = useMemo(
    () => new Map(exercises.map((exercise) => [String(exercise.id), exercise])),
    [exercises]
  );

  const catalogItems = useMemo(() => {
    const value = search.trim().toLowerCase();

    return layouts
      .map((layout) => ({
        layout,
        stations: getLayoutStations(layout, exercisesById),
      }))
      .filter(({ layout, stations }) => {
        if (!value) return true;

        return [
          layout.name,
          layout.listNotes,
          ...stations.map((station) => station.name),
          ...stations.map((station) => station.category),
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(value));
      });
  }, [exercisesById, layouts, search]);

  return (
    <Stack spacing={2.5}>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          p: { xs: 1.25, sm: 1.5 },
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.82)
            : 'background.paper',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={900}>
                Buscar circuitos
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Filtra por nombre o estación.
              </Typography>
            </Box>
            {search.trim() && (
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {catalogItems.length} resultado{catalogItems.length === 1 ? '' : 's'}
              </Typography>
            )}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                minWidth: 0,
                height: { xs: 58, sm: 48 },
                borderRadius: 2,
                px: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.05)
                  : '#f8fafc',
                borderColor: 'divider',
                transition: 'box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease',
                '&:focus-within': {
                  borderColor: 'primary.main',
                  boxShadow: (theme) => `0 0 0 3px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12)}`,
                  bgcolor: 'background.paper',
                },
                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
            >
              <Box
                sx={{
                  width: { xs: 42, sm: 36 },
                  height: { xs: 42, sm: 36 },
                  borderRadius: 1.25,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                <SearchIcon fontSize="small" />
              </Box>
              <InputBase
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por circuito o estación"
                fullWidth
                inputProps={{ 'aria-label': 'Buscar circuitos' }}
                sx={{
                  minWidth: 0,
                  flex: 1,
                  fontSize: { xs: 16, sm: 14 },
                  fontWeight: 700,
                  '& input::placeholder': {
                    color: 'text.secondary',
                    opacity: 0.8,
                    fontWeight: 600,
                  },
                }}
              />
              {search && (
                <IconButton
                  aria-label="Limpiar búsqueda"
                  size="small"
                  onClick={() => setSearch('')}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    flexShrink: 0,
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Paper>

            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={onCreate}
              sx={{
                flexShrink: 0,
                width: { xs: '100%', sm: 'auto' },
                minWidth: { sm: 96 },
                minHeight: { xs: 44, sm: 38 },
                px: { xs: 2, sm: 1.5 },
                alignSelf: { xs: 'stretch', sm: 'center' },
              }}
            >
              Nuevo
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {loading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
            gap: 1.5,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Skeleton key={item} variant="rounded" height={184} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : catalogItems.length ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
            gap: 1.5,
          }}
        >
          {catalogItems.map(({ layout, stations }) => (
            <LayoutCatalogCard
              key={layout.id}
              layout={layout}
              stations={stations}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </Box>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            py: 5,
            px: 2,
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="subtitle1" fontWeight={900}>
            {layouts.length ? 'No hay circuitos para esa búsqueda.' : 'Todavía no hay circuitos guardados.'}
          </Typography>
          <Divider sx={{ maxWidth: 80, mx: 'auto', my: 1.5 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {layouts.length ? 'Prueba con otro nombre o estación.' : 'Crea un circuito para empezar a organizar el gimnasio.'}
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}

export default LayoutCatalog;
