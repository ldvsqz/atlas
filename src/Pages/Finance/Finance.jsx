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
    IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FinanceService from '../../../Firebase/financeService';
import Util from '../../assets/Util';
import FinanceModel from '../../models/FinanceModel';
import './Finance.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import dayjs from 'dayjs';

import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';



const today = dayjs();

function Finance({ menu }) {

    const [finances, setFinances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(new FinanceModel());
    const [user, setUser] = useState(null);
    const [currentRol, setRol] = useState(localStorage.getItem("ROL"));
    const [currentUid, setCurrentUid] = useState(localStorage.getItem("UID"));
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const util = new Util();

    const incomeCategories = ['Membresías', 'Productos', 'Servicios', 'Otro'];
    const expenseCategories = ['Renta', 'Servicios', 'Equipo', 'Suministros', 'Otro'];

    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        fetchFinances();
    }, []);

    const fetchFinances = async () => {
        try {
            setLoading(true);
            const data = await FinanceService.getAll();
            const sortedData = data.sort((a, b) => {
                const dateA = a.date instanceof Date ? a.date : new Date(a.date.seconds * 1000);
                const dateB = b.date instanceof Date ? b.date : new Date(b.date.seconds * 1000);
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
        const filteredData = getFilteredFinances();
        const totalIncome = filteredData
            .filter(f => f.type === 'income')
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        const totalExpense = filteredData
            .filter(f => f.type === 'expense')
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
    };

    const getFilteredFinances = () => {
        if (!startDate && !endDate) return finances;

        return finances.filter(f => {
            const financeDate = f.date instanceof Date ? f.date : new Date(f.date.seconds * 1000);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-12-31');

            return financeDate >= start && financeDate <= end;
        });
    };

    const downloadPDF = () => {
        const filteredData = getFilteredFinances();
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text('Reporte de Finanzas', 14, 15);

        doc.setFontSize(10);
        doc.text(`Desde: ${startDate || 'Inicio'} | Hasta: ${endDate || 'Fin'}`, 14, 25);
        doc.text(`Generado: ${util.formatDate(new Date())}`, 14, 32);

        const tableData = filteredData.map(f => [
            f.date instanceof Date ? util.formatDateShort(f.date) : util.formatDateShort(new Date(f.date.seconds * 1000)),
            f.type === 'income' ? 'Ingreso' : 'Gasto',
            f.category,
            f.description,
            `₡${parseFloat(f.amount).toFixed(2)}`
        ]);

        doc.autoTable({
            head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
            body: tableData,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Add totals
        const { totalIncome, totalExpense, balance } = calculateTotals();
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Ingresos: ₡${totalIncome.toFixed(2)}`, 14, finalY);
        doc.text(`Total Gastos: ₡${totalExpense.toFixed(2)}`, 14, finalY + 7);
        doc.text(`Balance: ₡${balance.toFixed(2)}`, 14, finalY + 14);

        doc.save('reporte-finanzas.pdf');
    };

    const { totalIncome, totalExpense, balance } = calculateTotals();

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
                    <Grid item xs={12} sm={4}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={downloadPDF}
                        >
                            PDF
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => {
                                setStartDate('');
                                setEndDate('');
                            }}
                        >
                            Limpiar
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={4}>
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
                </Grid>
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
                                {getFilteredFinances().length > 0 ? (
                                    getFilteredFinances().map((finance) => (
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