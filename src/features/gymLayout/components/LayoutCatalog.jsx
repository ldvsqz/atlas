import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
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
  const stationAccentColor = stations[0]?.color || '#2563EB';

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
        minHeight: 128,
        borderRadius: 2,
        p: 0,
        overflow: 'hidden',
        textAlign: 'left',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        position: 'relative',
        borderColor: (theme) => alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.72 : 0.9),
        transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, background-color 160ms ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          height: 3,
          bgcolor: 'primary.main',
        },
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 10px 22px rgba(0, 0, 0, 0.22)'
            : `0 10px 22px ${alpha(theme.palette.primary.main, 0.12)}`,
          transform: 'translateY(-1px)',
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
          px: 1.1,
          pt: 1.1,
          pb: 0.9,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.82)
            : 'background.paper',
        }}
      >
        <Stack direction="row" spacing={0.85} alignItems="center">
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
              color: 'primary.main',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.07)',
            }}
          >
            <MapIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle2"
              fontWeight={900}
              sx={{
                lineHeight: 1.1,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                overflowWrap: 'anywhere',
              }}
            >
              {layout.name || 'Circuito sin nombre'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, lineHeight: 1 }}>
              {stations.length} estación{stations.length === 1 ? '' : 'es'}
            </Typography>
          </Box>
          <IconButton
            aria-label="Eliminar circuito"
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(layout);
            }}
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'error.main',
              flexShrink: 0,
              '&:hover': {
                bgcolor: 'error.main',
                color: 'error.contrastText',
                borderColor: 'error.main',
              },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Box
        sx={{
          px: 1.1,
          py: 0.85,
          minHeight: 54,
        }}
      >
        {stations.length ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 0.45,
            }}
          >
            {stations.map((station, index) => (
              <Chip
                key={station.id}
                size="small"
                variant="outlined"
                label={`${index + 1}. ${station.name}`}
                sx={{
                  maxWidth: '100%',
                  height: 21,
                  borderRadius: 1,
                  justifyContent: 'flex-start',
                  minWidth: 0,
                  borderColor: alpha(station.color || stationAccentColor, 0.42),
                  bgcolor: (theme) => alpha(station.color || stationAccentColor, theme.palette.mode === 'dark' ? 0.12 : 0.055),
                  '& .MuiChip-label': {
                    minWidth: 0,
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 800,
                    fontSize: 10.5,
                    px: 0.7,
                  },
                }}
              />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              px: 1.25,
              py: 0.75,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Sin estaciones colocadas
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          px: 1.1,
          py: 0.65,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          color: 'primary.main',
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.018)
            : alpha(theme.palette.common.black, 0.012),
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" fontWeight={900}>
            Abrir circuito
          </Typography>
          <ArrowForwardIcon sx={{ fontSize: 15 }} />
        </Stack>
      </Box>
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
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
            gap: 1.25,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Skeleton key={item} variant="rounded" height={140} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : catalogItems.length ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
            gap: 1.25,
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
