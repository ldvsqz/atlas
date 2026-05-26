import React, { useState, useEffect } from 'react';
import {
    Container,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Stack,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Skeleton,
    Grid,
    Card,
    CardContent,
    IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import Menu from '../../Components/Menu/Menu';
import FinanceService from '../../../Firebase/financeService';
import Util from '../../assets/Util';
import FinanceModel from '../../models/FinanceModel';
import './Finance.css';
import dayjs from 'dayjs';
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';
import { useNavigate, useSearchParams } from 'react-router-dom';

const isMonthParam = (value) => /^\d{4}-\d{2}$/.test(value || '');

const getMovementDate = (movement) => {
    if (!movement?.date) return null;
    if (movement.date.toDate) return movement.date.toDate();
    if (movement.date.seconds) return new Date(movement.date.seconds * 1000);
    const parsedDate = new Date(movement.date);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getMovementMonth = (movement) => {
    const date = getMovementDate(movement);
    return date ? dayjs(date).format('YYYY-MM') : '';
};

function Finance() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialMonth = searchParams.get('month');
    const util = new Util();
    const [loading, setLoading] = useState(true);
    const [allFinances, setAllFinances] = useState([]); 
    const [finances, setFinances] = useState([]);       
    const [selectedMonth, setSelectedMonth] = useState(isMonthParam(initialMonth) ? initialMonth : dayjs().format('YYYY-MM'));
    const [openModal, setOpenModal] = useState(false);
    const [currentMovement, setCurrentMovement] = useState(new FinanceModel());
    const [isEditing, setIsEditing] = useState(false);
    const { showSnackbar } = useSnackbar();

    const [totalIncomes, setTotalIncomes] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [netBalance, setNetBalance] = useState(0);

    const incomeCategories = ['Membresías', 'Productos', 'Servicios', 'Otro'];
    const expenseCategories = ['Renta', 'Servicios', 'Equipo', 'Suministros', 'Otro'];

    const loadAllMovements = async () => {
        setLoading(true);
        try {
            const data = await FinanceService.getAll();
            setAllFinances(data || []);
        } catch (error) {
            console.error(error);
            showSnackbar("Error al recuperar los movimientos", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllMovements();
    }, []);

    useEffect(() => {
        const month = searchParams.get('month');
        if (isMonthParam(month) && month !== selectedMonth) {
            setSelectedMonth(month);
        }
    }, [searchParams, selectedMonth]);

    useEffect(() => {
        const filtered = allFinances.filter(mov => {
            return getMovementMonth(mov) === selectedMonth;
        });

        // Ordenar por fecha descendente
        filtered.sort((a, b) => {
            const dateA = getMovementDate(a) || new Date(0);
            const dateB = getMovementDate(b) || new Date(0);
            return dateB - dateA;
        });

        setFinances(filtered);

        let incomes = 0;
        let expenses = 0;
        filtered.forEach(mov => {
            const amount = Number(mov.amount || 0);
            if (mov.type === 'income') incomes += amount;
            else if (mov.type === 'expense') expenses += amount;
        });

        setTotalIncomes(incomes);
        setTotalExpenses(expenses);
        setNetBalance(incomes - expenses);
    }, [allFinances, selectedMonth]);

    const handleOpenCreate = () => {
        const newMov = new FinanceModel();
        newMov.date = dayjs(selectedMonth).isSame(dayjs(), 'month')
            ? new Date()
            : dayjs(selectedMonth).startOf('month').toDate();
        setCurrentMovement(newMov);
        setIsEditing(false);
        setOpenModal(true);
    };

    const handleSelectedMonthChange = (month) => {
        setSelectedMonth(month);
        setSearchParams({ month }, { replace: true });
    };

    const handleClose = () => {
        setOpenModal(false);
        setCurrentMovement(new FinanceModel());
        setIsEditing(false);
    };

    const handleEdit = (movement) => {
        let normalizedDate = movement.date;
        if (movement.date?.seconds) {
            normalizedDate = new Date(movement.date.seconds * 1000);
        } else if (typeof movement.date === 'string') {
            normalizedDate = new Date(movement.date);
        }
        
        setCurrentMovement({ 
            ...movement,
            date: normalizedDate
        });
        setIsEditing(true);
        setOpenModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Está seguro de eliminar este movimiento?")) {
            try {
                await FinanceService.delete(id);
                showSnackbar("Movimiento eliminado", "success");
                loadAllMovements();
            } catch (error) {
                showSnackbar("Error al eliminar", "error");
            }
        }
    };

    const handleSave = async () => {
        if (!currentMovement.description || !currentMovement.amount || !currentMovement.category) {
            showSnackbar("Por favor rellene los campos obligatorios", "warning");
            return;
        }
        try {
            const payload = {
                ...currentMovement,
                amount: Number(currentMovement.amount),
                date: currentMovement.date instanceof Date ? currentMovement.date : new Date(currentMovement.date)
            };

            if (isEditing) {
                await FinanceService.update(payload.id, payload);
                showSnackbar("Movimiento actualizado", "success");
            } else {
                await FinanceService.add(payload);
                showSnackbar("Movimiento registrado con éxito", "success");
            }
            handleClose();
            loadAllMovements();
        } catch (error) {
            showSnackbar("Error al guardar", "error");
        }
    };

    return (
        <div className="finance-container">
            <Menu title="Control de Finanzas" />
            <Container maxWidth="lg" sx={{ mt: 11, mb: 4 }}>
                <Grid container spacing={3} sx={{ mb: 3 }} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Filtrar por Mes"
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => handleSelectedMonthChange(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                        <Stack direction="row" spacing={2} justifyContent="flex-end">
                            <Button 
                                variant="outlined" 
                                color="primary" 
                                startIcon={<PointOfSaleIcon />}
                                onClick={() => navigate(`/cashbox?month=${selectedMonth}`)}
                            >
                                Ir al Arqueo de Caja
                            </Button>
                            <Button variant="contained" color="primary" onClick={handleOpenCreate}>
                                Agregar Movimiento
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={4}>
                        <Card><CardContent><Typography color="text.secondary" variant="body2">INGRESOS</Typography><Typography variant="h5" color="success.main" fontWeight={700}>₡{totalIncomes.toFixed(2)}</Typography></CardContent></Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card><CardContent><Typography color="text.secondary" variant="body2">GASTOS</Typography><Typography variant="h5" color="error.main" fontWeight={700}>₡{totalExpenses.toFixed(2)}</Typography></CardContent></Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card><CardContent><Typography color="text.secondary" variant="body2">BALANCE NETO</Typography><Typography variant="h5" fontWeight={700} color={netBalance >= 0 ? 'success.dark' : 'error.main'}>₡{netBalance.toFixed(2)}</Typography></CardContent></Card>
                    </Grid>
                </Grid>

                {loading ? (
                    <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                ) : (
                    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell><b>Movimiento</b></TableCell>
                                    <TableCell align="right"><b>Monto</b></TableCell>
                                    <TableCell align="center"><b>Acciones</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {finances.length > 0 ? (
                                    finances.map((mov) => {
                                        const dateObj = getMovementDate(mov);
                                        return (
                                            <TableRow key={mov.id}>
                                                <TableCell>
                                                    <Stack spacing={0.5}>
                                                        <Typography variant="body2" fontWeight={700}>
                                                            {mov.description}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {util.formatDateShort(dateObj)} · {mov.category || 'General'}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="right" style={{ color: mov.type === 'income' ? '#2e7d32' : '#d32f2f', fontWeight: 'bold' }}>
                                                    ₡{Number(mov.amount).toFixed(2)}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={() => handleEdit(mov)}><EditIcon fontSize="small" /></IconButton>
                                                    <IconButton size="small" onClick={() => handleDelete(mov.id)}><DeleteIcon fontSize="small" /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center">No hay movimientos registrados en este periodo.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Container>

            <Dialog open={openModal} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>{isEditing ? 'Editar Movimiento' : 'Nuevo Movimiento'}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Tipo</InputLabel>
                            <Select
                                name="type"
                                value={currentMovement.type || 'income'}
                                onChange={(e) => setCurrentMovement({...currentMovement, type: e.target.value, category: ''})}
                                label="Tipo"
                            >
                                <MenuItem value="income">Ingreso</MenuItem>
                                <MenuItem value="expense">Gasto</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Monto"
                            type="number"
                            value={currentMovement.amount || ''}
                            onChange={(e) => setCurrentMovement({...currentMovement, amount: e.target.value})}
                        />

                        <FormControl fullWidth>
                            <InputLabel>Categoría</InputLabel>
                            <Select
                                value={currentMovement.category || ''}
                                onChange={(e) => setCurrentMovement({...currentMovement, category: e.target.value})}
                                label="Categoría"
                            >
                                {(currentMovement.type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Descripción"
                            value={currentMovement.description || ''}
                            onChange={(e) => setCurrentMovement({...currentMovement, description: e.target.value})}
                            multiline
                            rows={2}
                        />

                        <TextField
                            fullWidth
                            label="Fecha"
                            type="date"
                            value={currentMovement.date instanceof Date ? currentMovement.date.toISOString().split('T')[0] : currentMovement.date ? new Date(currentMovement.date).toISOString().split('T')[0] : ''}
                            onChange={(e) => setCurrentMovement({ ...currentMovement, date: new Date(e.target.value + 'T00:00:00') })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>Guardar</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Finance;
