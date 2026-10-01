import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import TrainingService from '../../../../Firebase/trainingService';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';
import { TRAINING_WEEK_DAYS } from '../models/trainingModels';
import {
  createMicrocycleWorksheetRow,
  formatTrainingTotal,
  getMicrocycleDayTotals,
  MICROCYCLE_EXERCISES,
  formatTrainingLoadInput,
  parseTrainingLoad,
} from '../utils/microcycleWorksheet';

const createInitialRows = (savedRows) => (
  Array.isArray(savedRows) && savedRows.length
    ? savedRows.map((row) => ({
      ...row,
      id: String(row.id || createMicrocycleWorksheetRow().id),
      exercise: String(row.exercise || ''),
      cells: row.cells && typeof row.cells === 'object' ? row.cells : {},
    }))
    : [createMicrocycleWorksheetRow()]
);

function MicrocycleWorksheet({ cycleId, weekIndex }) {
  const [rows, setRows] = useState([createMicrocycleWorksheetRow()]);
  const [description, setDescription] = useState('');
  const [customOptions, setCustomOptions] = useState([]);
  const [newExercise, setNewExercise] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [mobileDay, setMobileDay] = useState(1);
  const { showSnackbar } = useSnackbar();
  const exerciseOptions = useMemo(
    () => [...new Set([...MICROCYCLE_EXERCISES, ...customOptions])],
    [customOptions]
  );
  const dayTotals = useMemo(() => getMicrocycleDayTotals(rows), [rows]);
  const weeklyTotal = useMemo(() => dayTotals.reduce((total, dayTotal) => ({
    minutes: total.minutes + dayTotal.minutes,
    meters: total.meters + dayTotal.meters,
    invalid: total.invalid + dayTotal.invalid,
  }), { minutes: 0, meters: 0, invalid: 0 }), [dayTotals]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      TrainingService.getMicrocyclePlan(cycleId, weekIndex),
      TrainingService.getMicrocycleExerciseOptions(),
    ]).then(([plan, options]) => {
      if (!active) return;
      setRows(createInitialRows(plan?.rows));
      setDescription(String(plan?.description || ''));
      setCustomOptions(options);
    }).catch((error) => {
      console.error('Error loading microcycle worksheet:', error);
      if (active) showSnackbar('No se pudo cargar la tabla del microciclo.', 'error');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [cycleId, showSnackbar, weekIndex]);

  const updateRow = (rowId, update) => {
    setRows((current) => current.map((row) => (
      row.id === rowId ? { ...row, ...update } : row
    )));
  };

  const updateCell = (rowId, dayIndex, value) => {
    setRows((current) => current.map((row) => (
      row.id === rowId
        ? { ...row, cells: { ...row.cells, [dayIndex]: value } }
        : row
    )));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await TrainingService.saveMicrocyclePlan(cycleId, weekIndex, { rows, description });
      showSnackbar(`Microciclo ${weekIndex} guardado correctamente.`, 'success');
    } catch (error) {
      console.error('Error saving microcycle worksheet:', error);
      showSnackbar('No se pudo guardar la tabla del microciclo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExercise = async () => {
    const name = newExercise.trim();
    if (!name) return;
    if (exerciseOptions.some((option) => option.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      showSnackbar('Ese ejercicio ya está en la lista.', 'info');
      return;
    }

    try {
      setAddingExercise(true);
      const savedOption = await TrainingService.addMicrocycleExerciseOption(name);
      setCustomOptions((current) => [...current, savedOption]);
      setNewExercise('');
      showSnackbar('Ejercicio agregado a la lista del gimnasio.', 'success');
    } catch (error) {
      console.error('Error adding microcycle exercise option:', error);
      showSnackbar(error.message || 'No se pudo agregar el ejercicio.', 'error');
    } finally {
      setAddingExercise(false);
    }
  };

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 3, display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={24} />
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 0.75, sm: 1.25 }, borderRadius: 1.5 }}>
      <Stack
        direction="row"
        spacing={0.75}
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        sx={{ mb: 0.75 }}
      >
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ minHeight: 30, px: 1 }}
            onClick={() => setRows((current) => [...current, createMicrocycleWorksheetRow()])}
          >
            Agregar fila
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            sx={{ minHeight: 30, px: 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            Guardar
          </Button>
        </Stack>
      </Stack>

      <TextField
        label='Objetivo del microciclo'
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        multiline
        minRows={1}
        fullWidth
        size="small"
        sx={{ mb: 0.75 }}
      />

      <Stack spacing={0.75} sx={{ display: { xs: 'flex', xl: 'none' } }}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={mobileDay}
          onChange={(_, value) => {
            if (value !== null) setMobileDay(value);
          }}
          aria-label="Seleccionar día de entrenamiento"
          sx={{
            '& .MuiToggleButton-root': {
              minWidth: 0,
              px: 0.25,
              py: 0.5,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
            },
          }}
        >
          {TRAINING_WEEK_DAYS.map((day, index) => (
            <ToggleButton key={day} value={index + 1} aria-label={day}>
              {day.slice(0, 3)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Table
            size="small"
            aria-label={`Ejercicios del ${TRAINING_WEEK_DAYS[mobileDay - 1]}`}
            sx={{
              width: '100%',
              tableLayout: 'fixed',
              '& th, & td': { px: 0.75, py: 0.5, borderBottomColor: 'divider' },
            }}
          >
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ width: '48%', fontWeight: 800 }}>Ejercicio</TableCell>
                <TableCell sx={{ width: '42%', fontWeight: 800 }}>
                  {TRAINING_WEEK_DAYS[mobileDay - 1]}
                </TableCell>
                <TableCell sx={{ width: 36 }} aria-label="Acciones" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, rowIndex) => {
                const value = row.cells?.[mobileDay] || '';
                const parsedValue = parseTrainingLoad(value);
                return (
                  <TableRow key={row.id} sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={row.exercise}
                        SelectProps={{
                          displayEmpty: true,
                          renderValue: (selected) => (
                            <Box
                              component="span"
                              title={selected || 'Seleccionar ejercicio'}
                              sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {selected || 'Ejercicio...'}
                            </Box>
                          ),
                        }}
                        inputProps={{ 'aria-label': `Ejercicio, fila ${rowIndex + 1}` }}
                        onChange={(event) => updateRow(row.id, { exercise: event.target.value })}
                      >
                        <MenuItem value=""><em>Seleccionar ejercicio</em></MenuItem>
                        {exerciseOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={value}
                        placeholder="Ej. 4x3'x1'"
                        inputProps={{ 'aria-label': `${row.exercise || 'Ejercicio'}, ${TRAINING_WEEK_DAYS[mobileDay - 1]}` }}
                        error={parsedValue.kind === 'invalid'}
                        onChange={(event) => updateCell(
                          row.id,
                          mobileDay,
                          formatTrainingLoadInput(event.target.value)
                        )}
                        onBlur={(event) => updateCell(
                          row.id,
                          mobileDay,
                          formatTrainingLoadInput(event.target.value, true)
                        )}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        aria-label={`Eliminar fila ${rowIndex + 1}`}
                        disabled={rows.length === 1}
                        onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow sx={{ bgcolor: 'action.selected' }}>
                <TableCell sx={{ fontWeight: 800 }}>Total del día</TableCell>
                <TableCell colSpan={2} sx={{ fontWeight: 800 }}>
                  {formatTrainingTotal(dayTotals[mobileDay - 1])}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary" sx={{ px: 0.25 }}>
          Total semanal: {formatTrainingTotal(weeklyTotal)}
        </Typography>
      </Stack>

      <TableContainer
        sx={{
          display: { xs: 'none', xl: 'block' },
          overflowX: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Table
          size="small"
          sx={{
            width: 1030,
            minWidth: 1030,
            tableLayout: 'fixed',
            '& th, & td': { px: 0.75, py: 0.5 },
          }}
          aria-label={`Tabla de planificación del microciclo ${weekIndex}`}
        >
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ width: 178, minWidth: 178, fontWeight: 800 }}>Ejercicio</TableCell>
              {TRAINING_WEEK_DAYS.map((day) => (
                <TableCell key={day} align="center" sx={{ width: 136, fontWeight: 800, whiteSpace: 'nowrap' }}>{day}</TableCell>
              ))}
              <TableCell align="center" sx={{ width: 44 }} aria-label="Acciones" />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={row.id}>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={row.exercise}
                    SelectProps={{ displayEmpty: true }}
                    onChange={(event) => updateRow(row.id, { exercise: event.target.value })}
                  >
                    <MenuItem value=""><em>Ejercicio...</em></MenuItem>
                    {exerciseOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                  </TextField>
                </TableCell>
                {TRAINING_WEEK_DAYS.map((day, dayIndex) => {
                  const value = row.cells?.[dayIndex + 1] || '';
                  const parsedValue = parseTrainingLoad(value);
                  return (
                    <TableCell key={day}>
                      <TextField
                        size="small"
                        fullWidth
                        value={value}
                        placeholder="Ej. 4x3'x1'"
                        inputProps={{ 'aria-label': `${row.exercise || 'Ejercicio'}, ${day}` }}
                        error={parsedValue.kind === 'invalid'}
                        helperText={parsedValue.kind === 'invalid' ? 'Formato no reconocido' : ' '}
                        FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.62rem', whiteSpace: 'nowrap' } }}
                        onChange={(event) => updateCell(
                          row.id,
                          dayIndex + 1,
                          formatTrainingLoadInput(event.target.value)
                        )}
                        onBlur={(event) => updateCell(
                          row.id,
                          dayIndex + 1,
                          formatTrainingLoadInput(event.target.value, true)
                        )}
                      />
                    </TableCell>
                  );
                })}
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label={`Eliminar fila ${rowIndex + 1}`}
                    disabled={rows.length === 1}
                    onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ bgcolor: 'action.selected' }}>
              <TableCell sx={{ fontWeight: 900, verticalAlign: 'top' }}>
                Total semanal
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {formatTrainingTotal(weeklyTotal)}
                </Typography>
              </TableCell>
              {dayTotals.map((total, dayIndex) => (
                <TableCell key={TRAINING_WEEK_DAYS[dayIndex]} align="center" sx={{ fontWeight: 800, verticalAlign: 'top' }}>
                  {formatTrainingTotal(total)}
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>

      {weeklyTotal.invalid > 0 && (
        <Alert severity="warning" sx={{ mt: 0.75, py: 0 }}>
          {weeklyTotal.invalid} celda{weeklyTotal.invalid === 1 ? '' : 's'} tiene un formato que no se puede calcular; revisa los valores marcados.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} sx={{ mt: 1 }}>
        <TextField
          size="small"
          label="Agregar ejercicio"
          value={newExercise}
          onChange={(event) => setNewExercise(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAddExercise();
            }
          }}
          disabled={addingExercise}
          fullWidth
        />
        <Button
          variant="outlined"
          startIcon={addingExercise ? <CircularProgress size={16} /> : <AddIcon />}
          onClick={handleAddExercise}
          disabled={addingExercise || !newExercise.trim()}
          sx={{ flexShrink: 0, minHeight: 34 }}
        >
          Agregar ejercicio
        </Button>
      </Stack>
    </Paper>
  );
}

export default MicrocycleWorksheet;
