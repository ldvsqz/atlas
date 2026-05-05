import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Typography,
    Box
} from '@mui/material';
import Util from '../../assets/Util';
import dayjs from 'dayjs';

const util = new Util();

const formatCurrency = (amount) => `₡${Number(amount || 0).toFixed(2)}`;
const formatMonth = (month) => (month ? dayjs(month, 'YYYY-MM').format('MMMM YYYY') : '-');

function CashboxHistory({ open, onClose, history, loading, onDownloadHistoryPDF }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Historial de cajas</DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : history.length === 0 ? (
                    <Typography sx={{ py: 4 }} align="center">
                        No hay cajas guardadas.
                    </Typography>
                ) : (
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Mes</TableCell>
                                    <TableCell>Balance total</TableCell>
                                    <TableCell>Deudas</TableCell>
                                    <TableCell>Distribuible</TableCell>
                                    <TableCell>Fondo de mantenimiento</TableCell>
                                    <TableCell>Cerrada</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {history.map((cashbox) => {
                                    const summary = cashbox.summary || {};
                                    const closedAt = cashbox.closedAt ? util.formatDate(new Date(cashbox.closedAt.seconds ? cashbox.closedAt.seconds * 1000 : cashbox.closedAt)) : '-';
                                    return (
                                        <TableRow key={cashbox.id}>
                                            <TableCell>{formatMonth(cashbox.month || cashbox.id)}</TableCell>
                                            <TableCell>{formatCurrency(summary.monthlyIncome ?? cashbox.monthlyIncome)}</TableCell>
                                            <TableCell>{formatCurrency(summary.debts ?? cashbox.debts)}</TableCell>
                                            <TableCell>{formatCurrency(summary.distributableBalance ?? cashbox.distributableBalance)}</TableCell>
                                            <TableCell>{formatCurrency(summary.maintenanceFund ?? cashbox.maintenanceFund)}</TableCell>
                                            <TableCell>{closedAt}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onDownloadHistoryPDF} disabled={loading || !history?.length}>
                    Descargar PDF
                </Button>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
}

export default CashboxHistory;
