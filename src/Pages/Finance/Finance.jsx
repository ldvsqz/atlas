import React, { useState, useEffect } from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Timestamp } from 'firebase/firestore';
import {
    Container,
    Box,
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
    IconButton,
    Alert as MuiAlert,
    Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import FinanceService from '../../../Firebase/financeService';
import Util from '../../assets/Util';
import FinanceModel from '../../models/FinanceModel';
import './Finance.css';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

import dayjs from 'dayjs';

import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';



const today = dayjs();

const CURRENCY_SYMBOL = '';

const formatCurrency = (amount) => `${CURRENCY_SYMBOL}${Number(amount || 0).toFixed(2)}`;

const getFinanceDate = (finance) => {
    if (finance.date instanceof Date) return finance.date;
    if (finance.date?.seconds) return new Date(finance.date.seconds * 1000);
    return new Date(finance.date);
};

function Finance({ menu }) {

    const [finances, setFinances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(new FinanceModel());
    const [user, setUser] = useState(null);
    const [currentRol, setRol] = useState(localStorage.getItem("ROL"));
    const [currentUid, setCurrentUid] = useState(localStorage.getItem("UID"));
    const [cashboxMonth, setCashboxMonth] = useState(today.format('YYYY-MM'));
    const [debtAmount, setDebtAmount] = useState(120000);
    const [distributionPercentages, setDistributionPercentages] = useState({
        first: 40,
        second: 40,
        third: 20,
    });
    const [savedCashbox, setSavedCashbox] = useState(null);
    const [cashboxLoading, setCashboxLoading] = useState(false);
    const [cashboxSaving, setCashboxSaving] = useState(false);
    const util = new Util();

    const incomeCategories = ['Membresías', 'Productos', 'Servicios', 'Otro'];
    const expenseCategories = ['Renta', 'Servicios', 'Equipo', 'Suministros', 'Otro'];

    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        fetchFinances();
    }, []);

    useEffect(() => {
        fetchMonthlyCashbox();
    }, [cashboxMonth]);

    const fetchFinances = async () => {
        try {
            setLoading(true);
            const data = await FinanceService.getAll();
            const sortedData = data.sort((a, b) => {
                const dateA = getFinanceDate(a);
                const dateB = getFinanceDate(b);
                return dateB - dateA;
            });
            setFinances(sortedData);
        } catch (error) {
            console.error('Error fetching finances:', error);
            setFinances([]);
            showSnackbar('Error al obtener los registros financieros', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyCashbox = async () => {
        try {
            setCashboxLoading(true);
            const cashbox = await FinanceService.getMonthlyCashbox(cashboxMonth);
            setSavedCashbox(cashbox);

            if (cashbox) {
                setDebtAmount(cashbox.debts || 0);
                setDistributionPercentages({
                    first: cashbox.distributionPercentages?.first ?? 40,
                    second: cashbox.distributionPercentages?.second ?? 40,
                    third: cashbox.distributionPercentages?.third ?? 20,
                });
            } else {
                setDebtAmount(120000);
                setDistributionPercentages({ first: 40, second: 40, third: 20 });
            }
        } catch (error) {
            console.error('Error fetching monthly cashbox:', error);
            showSnackbar('Error al cargar la caja mensual', 'error');
        } finally {
            setCashboxLoading(false);
        }
    };

    const handleOpen = () => setOpen(true);
    const handleClose = () => {
        setOpen(false);
        setEditingId(null);
        setFormData(new FinanceModel());
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async () => {
        try {
            if (editingId) {
                await FinanceService.update(editingId, formData);
            } else {
                await FinanceService.add(formData);
            }
            fetchFinances();
            handleClose();
        } catch (error) {
            console.error('Error saving finance:', error);
            showSnackbar('Error al guardar el registro financiero', 'error');
        }
    };

    const handleEdit = (finance) => {
        setFormData(finance);
        setEditingId(finance.id);
        handleOpen();
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Está seguro de que desea eliminar este registro?')) {
            try {
                await FinanceService.delete(id);
                fetchFinances();
            } catch (error) {
                console.error('Error deleting finance:', error);
                showSnackbar('Error al eliminar el registro financiero', 'error');
            }
        }
    };

    const calculateTotals = () => {
        const filteredData = finances;
        const totalIncome = filteredData
            .filter(f => f.type === 'income')
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        const totalExpense = filteredData
            .filter(f => f.type === 'expense')
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
    };

    const getMonthlyFinances = () => {
        const selectedMonth = dayjs(cashboxMonth);
        return finances.filter((finance) => dayjs(getFinanceDate(finance)).isSame(selectedMonth, 'month'));
    };

    const calculateCashbox = () => {
        const monthlyFinances = getMonthlyFinances();
        const monthlyIncome = monthlyFinances
            .filter(f => f.type === 'income')
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        const monthlyExpense = monthlyFinances
            .filter(f => f.type === 'expense')
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        const totalBalance = monthlyIncome - monthlyExpense;
        const debts = Math.max(parseFloat(debtAmount || 0), 0);
        const balanceAfterDebts = totalBalance - debts;
        const maintenanceFund = balanceAfterDebts > 0 ? balanceAfterDebts * 0.2 : 0;
        const distributableBalance = balanceAfterDebts - maintenanceFund;
        const safeDistributableBalance = distributableBalance > 0 ? distributableBalance : 0;

        return {
            monthlyFinances,
            monthlyIncome,
            monthlyExpense,
            totalBalance,
            debts,
            balanceAfterDebts,
            maintenanceFund,
            distributableBalance: safeDistributableBalance,
            distributions: {
                first: safeDistributableBalance * (Number(distributionPercentages.first || 0) / 100),
                second: safeDistributableBalance * (Number(distributionPercentages.second || 0) / 100),
                third: safeDistributableBalance * (Number(distributionPercentages.third || 0) / 100),
            },
            distributionTotalPercentage:
                Number(distributionPercentages.first || 0)
                + Number(distributionPercentages.second || 0)
                + Number(distributionPercentages.third || 0),
        };
    };


    const downloadCashboxPDF = () => {
        const cashbox = calculateCashbox();
        const doc = new jsPDF();
        const monthLabel = dayjs(cashboxMonth).format('MMMM YYYY');

        doc.setFontSize(16);
        doc.text('Reporte de Caja de Fin de Mes', 14, 15);

        doc.setFontSize(10);
        doc.text(`Periodo: ${monthLabel}`, 14, 25);
        doc.text(`Generado: ${util.formatDate(new Date())}`, 14, 32);

        autoTable(doc, {
            startY: 40,
            theme: 'grid',
            head: [['Concepto', 'Monto']],
            body: [
                ['Ingresos del mes', formatCurrency(cashbox.monthlyIncome)],
                ['Gastos del mes', formatCurrency(cashbox.monthlyExpense)],
                ['Balance total', formatCurrency(cashbox.totalBalance)],
                ['Deudas', formatCurrency(cashbox.debts)],
                ['Balance después de deudas', formatCurrency(cashbox.balanceAfterDebts)],
                ['Fondo de mantenimiento 20%', formatCurrency(cashbox.maintenanceFund)],
                ['Balance distribuible', formatCurrency(cashbox.distributableBalance)],
            ],
            styles: { fontSize: 10 },
            headStyles: { fillColor: [69, 90, 100] },
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            theme: 'grid',
            head: [['Distribución', 'Porcentaje', 'Monto']],
            body: [
                ['Parte 1', `${distributionPercentages.first}%`, formatCurrency(cashbox.distributions.first)],
                ['Parte 2', `${distributionPercentages.second}%`, formatCurrency(cashbox.distributions.second)],
                ['Parte 3', `${distributionPercentages.third}%`, formatCurrency(cashbox.distributions.third)],
            ],
            styles: { fontSize: 10 },
            headStyles: { fillColor: [69, 90, 100] },
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            theme: 'grid',
            head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
            body: cashbox.monthlyFinances.map((finance) => [
                util.formatDateShort(getFinanceDate(finance)),
                finance.type === 'income' ? 'Ingreso' : 'Gasto',
                finance.category,
                finance.description,
                `${finance.type === 'income' ? '+' : '-'}${formatCurrency(finance.amount)}`,
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [69, 90, 100] },
        });

        doc.save(`caja-fin-de-mes-${cashboxMonth}.pdf`);
    };

    const saveCashbox = async () => {
        try {
            setCashboxSaving(true);
            const currentCashbox = calculateCashbox();
            const generatedExpenseIds = { ...(savedCashbox?.generatedExpenseIds || {}) };
            const cashboxExpenseDate = dayjs(cashboxMonth).endOf('month').toDate();

            const debtExpense = new FinanceModel(
                generatedExpenseIds.debts || '',
                'expense',
                currentCashbox.debts,
                `Caja ${cashboxMonth} - Deudas`,
                cashboxExpenseDate,
                'Caja de fin de mes'
            );

            const distributableExpense = new FinanceModel(
                generatedExpenseIds.distributable || '',
                'expense',
                currentCashbox.distributableBalance,
                `Caja ${cashboxMonth} - Monto distribuible`,
                cashboxExpenseDate,
                'Caja de fin de mes'
            );

            if (currentCashbox.debts > 0) {
                if (generatedExpenseIds.debts) {
                    await FinanceService.update(generatedExpenseIds.debts, debtExpense);
                } else {
                    const createdDebtExpense = await FinanceService.add(debtExpense);
                    generatedExpenseIds.debts = createdDebtExpense.id;
                }
            }

            if (currentCashbox.distributableBalance > 0) {
                if (generatedExpenseIds.distributable) {
                    await FinanceService.update(generatedExpenseIds.distributable, distributableExpense);
                } else {
                    const createdDistributableExpense = await FinanceService.add(distributableExpense);
                    generatedExpenseIds.distributable = createdDistributableExpense.id;
                }
            }

            const payload = {
                month: cashboxMonth,
                debts: currentCashbox.debts,
                distributionPercentages: {
                    first: Number(distributionPercentages.first || 0),
                    second: Number(distributionPercentages.second || 0),
                    third: Number(distributionPercentages.third || 0),
                },
                summary: {
                    monthlyIncome: currentCashbox.monthlyIncome,
                    monthlyExpense: currentCashbox.monthlyExpense,
                    totalBalance: currentCashbox.totalBalance,
                    balanceAfterDebts: currentCashbox.balanceAfterDebts,
                    maintenanceFund: currentCashbox.maintenanceFund,
                    distributableBalance: currentCashbox.distributableBalance,
                    distributions: currentCashbox.distributions,
                    distributionTotalPercentage: currentCashbox.distributionTotalPercentage,
                },
                movementIds: [
                    ...currentCashbox.monthlyFinances.map((finance) => finance.id),
                    ...Object.values(generatedExpenseIds),
                ].filter(Boolean),
                generatedExpenseIds,
                closedAt: new Date(),
            };

            const saved = await FinanceService.saveMonthlyCashbox(cashboxMonth, payload);
            setSavedCashbox(saved);
            await fetchFinances();
            showSnackbar('Caja mensual guardada correctamente', 'success');
        } catch (error) {
            console.error('Error saving monthly cashbox:', error);
            showSnackbar('Error al guardar la caja mensual', 'error');
        } finally {
            setCashboxSaving(false);
        }
    };

    const { totalIncome, totalExpense, balance } = calculateTotals();
    const cashbox = calculateCashbox();

    return (
        <div>
            {menu}
            <Container fixed className="finance-container">
                <Typography variant="h4" gutterBottom className="finance-title">
                    Finanzas
                </Typography>

                {/* Summary Cards */}
                <Grid container spacing={2} className="summary-grid">
                    <Grid item xs={12} sm={6} md={4}>
                        <Card className="income-card">
                            <CardContent className="card-content">
                                <Typography className="card-title" gutterBottom>
                                    Ingresos
                                </Typography>
                                <Typography variant="h5" className="card-amount">
                                    ₡{totalIncome.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card className="expense-card">
                            <CardContent className="card-content">
                                <Typography className="card-title" gutterBottom>
                                    Gastos
                                </Typography>
                                <Typography variant="h5" className="card-amount">
                                    ₡{totalExpense.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card className={balance >= 0 ? 'balance-card-positive' : 'balance-card-negative'}>
                            <CardContent className="card-content">
                                <Typography className="card-title" gutterBottom>
                                    Balance
                                </Typography>
                                <Typography variant="h5" className="card-amount">
                                    ₡{balance.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <Grid container spacing={2} sx={{ px: 2, mb: 4 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpen}
                        fullWidth
                        className="add-button"
                    >
                        Agregar Movimiento
                    </Button>
                </Grid>

                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 1 }}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ xs: 'stretch', md: 'center' }}
                        sx={{ mb: 2 }}
                    >
                        <Box>
                            <Typography variant="h5" fontWeight={800}>
                                Caja de fin de mes
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Balance mensual, deudas, fondo de mantenimiento y distribución.
                            </Typography>
                        </Box>
                        <Button variant="outlined" onClick={saveCashbox} disabled={cashboxSaving}>
                            Guardar Caja
                        </Button>
                        <Button variant="outlined" onClick={downloadCashboxPDF}>
                            PDF Caja
                        </Button>
                    </Stack>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="Mes"
                                type="month"
                                value={cashboxMonth}
                                onChange={(event) => setCashboxMonth(event.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="Deudas"
                                type="number"
                                value={debtAmount}
                                onChange={(event) => setDebtAmount(event.target.value)}
                                inputProps={{ min: 0, step: '0.01' }}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                label="Parte 1 %"
                                type="number"
                                value={distributionPercentages.first}
                                onChange={(event) => setDistributionPercentages({
                                    ...distributionPercentages,
                                    first: event.target.value,
                                })}
                                inputProps={{ min: 0, step: '1' }}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                label="Parte 2 %"
                                type="number"
                                value={distributionPercentages.second}
                                onChange={(event) => setDistributionPercentages({
                                    ...distributionPercentages,
                                    second: event.target.value,
                                })}
                                inputProps={{ min: 0, step: '1' }}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                label="Parte 3 %"
                                type="number"
                                value={distributionPercentages.third}
                                onChange={(event) => setDistributionPercentages({
                                    ...distributionPercentages,
                                    third: event.target.value,
                                })}
                                inputProps={{ min: 0, step: '1' }}
                            />
                        </Grid>
                    </Grid>

                    {cashbox.distributionTotalPercentage !== 100 && (
                        <MuiAlert severity="warning" sx={{ mb: 2 }}>
                            Los porcentajes de distribución suman {cashbox.distributionTotalPercentage}%. Lo recomendado es 100%.
                        </MuiAlert>
                    )}

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">Balance total</Typography>
                                    <Typography variant="h6">{formatCurrency(cashbox.totalBalance)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">Después de deudas</Typography>
                                    <Typography variant="h6">{formatCurrency(cashbox.balanceAfterDebts)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">Mantenimiento 20%</Typography>
                                    <Typography variant="h6">{formatCurrency(cashbox.maintenanceFund)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">Distribuible</Typography>
                                    <Typography variant="h6">{formatCurrency(cashbox.distributableBalance)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <Typography variant="body2" color="text.secondary">Parte 1 ({distributionPercentages.first}%)</Typography>
                            <Typography variant="h6">{formatCurrency(cashbox.distributions.first)}</Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Typography variant="body2" color="text.secondary">Parte 2 ({distributionPercentages.second}%)</Typography>
                            <Typography variant="h6">{formatCurrency(cashbox.distributions.second)}</Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Typography variant="body2" color="text.secondary">Parte 3 ({distributionPercentages.third}%)</Typography>
                            <Typography variant="h6">{formatCurrency(cashbox.distributions.third)}</Typography>
                        </Grid>
                    </Grid>
                </Paper>
                {/* Date Filters *

<Grid container spacing={2} sx={{ px: 2, mb: 4 }}>
<Grid item xs={12} sm={6}>
<LocalizationProvider
                            fullWidth
                            adapterLocale="es-ES"
                            dateAdapter={AdapterDayjs}>
                            <DatePicker
                                fullWidth
                                format="LL"
                                label="desde"
                                maxDate={today}
                                onChange={(date) => setEndDate(new Date(date))} />
                        </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                        <LocalizationProvider
                        adapterLocale="es-ES"
                        dateAdapter={AdapterDayjs}>
                        <DatePicker
                        format="LL"
                        label="hasta"
                        maxDate={today}
                        onChange={(date) => setEndDate(new Date(date))} />
                        </LocalizationProvider>
                        </Grid>
                        </Grid>
                        */}
                <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        {editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}
                    </DialogTitle>
                    <DialogContent className="dialog-content">
                        <FormControl fullWidth className="form-field">
                            <InputLabel>Tipo</InputLabel>
                            <Select
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                label="Tipo"
                            >
                                <MenuItem value="income">Ingreso</MenuItem>
                                <MenuItem value="expense">Gasto</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Monto"
                            name="amount"
                            type="number"
                            value={formData.amount}
                            onChange={handleInputChange}
                            className="form-field"
                            inputProps={{ step: '0.01' }}
                        />

                        <FormControl fullWidth className="form-field">
                            <InputLabel>Categoría</InputLabel>
                            <Select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                label="Categoría"
                            >
                                {(formData.type === 'income' ? incomeCategories : expenseCategories).map(
                                    (cat) => (
                                        <MenuItem key={cat} value={cat}>
                                            {cat}
                                        </MenuItem>
                                    )
                                )}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Descripción"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            multiline
                            rows={3}
                            className="form-field"
                        />

                        <TextField
                            fullWidth
                            label="Fecha"
                            name="date"
                            type="date"
                            value={formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : ''}
                            onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                            InputLabelProps={{ shrink: true }}
                            className="date-input"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancelar</Button>
                        <Button onClick={handleSubmit} variant="contained">
                            Guardar
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Table */}
                {loading ? (
                    <Stack spacing={1}>
                        <Skeleton variant="rounded" height={40} className="loading-skeleton" />
                        <Skeleton variant="rounded" height={40} className="loading-skeleton" />
                        <Skeleton variant="rounded" height={40} className="loading-skeleton" />
                    </Stack>
                ) : (
                    <TableContainer component={Paper} sx={{ mt: 4 }}>
                        <Table sx={{ minWidth: '100%' }} aria-label="simple table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Fecha</TableCell>
                                    <TableCell>Descripción</TableCell>
                                    <TableCell align="right">Monto</TableCell>
                                    <TableCell align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {finances.length > 0 ? (
                                    finances.map((finance) => (
                                        <TableRow key={finance.id}>
                                            <TableCell>
                                                {finance.date instanceof Date
                                                    ? util.formatDateShort(finance.date)
                                                    : util.formatDateShort(new Date(finance.date.seconds * 1000))}
                                            </TableCell>
                                            <TableCell>{finance.description}</TableCell>
                                            <TableCell
                                                align="right"
                                                className={finance.type === 'income' ? 'income-row amount-cell' : 'expense-row amount-cell'}
                                            >
                                                {finance.type === 'income' ? '+' : '-'}₡
                                                {parseFloat(finance.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell align="center" className="action-cell">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEdit(finance)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDelete(finance.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" className="no-data-cell">
                                            No hay movimientos registrados
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Container>
        </div>
    );
}

export default Finance;
