import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, 
    Box, 
    Card, 
    CardContent, 
    Grid, 
    Typography, 
    Button, 
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead,
    TableRow, 
    Paper, 
    CircularProgress, 
    Stack,
    Alert as MuiAlert,
    Divider
} from '@mui/material';
import Menu from '../../Components/Menu/Menu';
import FinanceService from '../../../Firebase/financeService'; 
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import Util from '../../assets/Util';
import FinanceModel from '../../models/FinanceModel';
import {
    CASHBOX_EXPENSE_CATEGORY,
    formatPeriodLabel,
    getCashboxDisplayPeriod,
    getCashboxMonth,
    getFinanceDate,
    isCashboxGeneratedMovement,
    isFinanceInPeriod,
    isMonthParam,
    resolveCashboxPeriod,
    toDate,
} from './financePeriodUtils';

const util = new Util();
const formatCurrency = (amount) => `₡${Number(amount || 0).toFixed(2)}`;
const formatMonth = (month) => (month ? dayjs(month, 'YYYY-MM').format('MMMM YYYY') : '-');

function CashboxHistoryDialog({ open, onClose, history, loading, onDownloadHistoryPDF }) {
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
                                    <TableCell>Periodo</TableCell>
                                    <TableCell>Ingresos del periodo</TableCell>
                                    <TableCell>Gastos del periodo</TableCell>
                                    <TableCell>Balance total</TableCell>
                                    <TableCell>Deudas</TableCell>
                                    <TableCell>Distribuible</TableCell>
                                    <TableCell>Mantenimiento</TableCell>
                                    <TableCell>Cerrada</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {history.map((cashbox) => {
                                    const summary = cashbox.summary || {};
                                    const month = getCashboxMonth(cashbox);
                                    const period = getCashboxDisplayPeriod(cashbox);
                                    const closedAt = toDate(cashbox.closedAt);

                                    return (
                                        <TableRow key={cashbox.id}>
                                            <TableCell>{formatMonth(month)}</TableCell>
                                            <TableCell>{formatPeriodLabel(period, util)}</TableCell>
                                            <TableCell>{formatCurrency(summary.monthlyIncome ?? cashbox.monthlyIncome)}</TableCell>
                                            <TableCell>{formatCurrency(summary.monthlyExpense ?? cashbox.monthlyExpense)}</TableCell>
                                            <TableCell>{formatCurrency(summary.totalBalance ?? cashbox.totalBalance)}</TableCell>
                                            <TableCell>{formatCurrency(summary.debts ?? cashbox.debts)}</TableCell>
                                            <TableCell>{formatCurrency(summary.distributableBalance ?? cashbox.distributableBalance)}</TableCell>
                                            <TableCell>{formatCurrency(summary.maintenanceFund ?? cashbox.maintenanceFund)}</TableCell>
                                            <TableCell>{closedAt ? util.formatDate(closedAt) : '-'}</TableCell>
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

function CashboxPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialMonth = searchParams.get('month');
    const [loading, setLoading] = useState(true);
    const [finances, setFinances] = useState([]);
    const [history, setHistory] = useState([]);
    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [cashboxMonth, setCashboxMonth] = useState(isMonthParam(initialMonth) ? initialMonth : dayjs().format('YYYY-MM'));
    const [debtAmount, setDebtAmount] = useState(120000);
    const [distributionPercentages, setDistributionPercentages] = useState({
        first: 40,
        second: 40,
        third: 20,
    });
    const [savedCashbox, setSavedCashbox] = useState(null);
    const [cashboxLoading, setCashboxLoading] = useState(false);
    const [cashboxSaving, setCashboxSaving] = useState(false);
    const { showSnackbar } = useSnackbar();

    const fetchFinances = useCallback(async () => {
        try {
            setLoading(true);
            const data = await FinanceService.getAll();
            const sortedData = (data || []).sort((a, b) => (getFinanceDate(b) || new Date(0)) - (getFinanceDate(a) || new Date(0)));
            setFinances(sortedData);
        } catch (error) {
            console.error('Error fetching finances:', error);
            setFinances([]);
            showSnackbar('Error al obtener los registros financieros', 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    const fetchCashboxHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const data = await FinanceService.getAllMonthlyCashboxes();
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching cashbox history:', error);
            showSnackbar('Error al cargar el historial de cajas', 'error');
        } finally {
            setHistoryLoading(false);
        }
    }, [showSnackbar]);

    const fetchMonthlyCashbox = useCallback(async () => {
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
    }, [cashboxMonth, showSnackbar]);

    useEffect(() => {
        fetchFinances();
        fetchCashboxHistory();
    }, [fetchFinances, fetchCashboxHistory]);

    useEffect(() => {
        const month = searchParams.get('month');
        if (isMonthParam(month) && month !== cashboxMonth) {
            setCashboxMonth(month);
        }
    }, [searchParams, cashboxMonth]);

    useEffect(() => {
        fetchMonthlyCashbox();
    }, [fetchMonthlyCashbox]);

    const selectedPeriod = resolveCashboxPeriod(history, cashboxMonth, savedCashbox);

    const getMonthlyFinances = (period = selectedPeriod) => {
        return finances.filter((finance) => (
            isFinanceInPeriod(finance, period)
            && !isCashboxGeneratedMovement(finance, savedCashbox?.generatedExpenseIds)
        ));
    };

    const handleCashboxMonthChange = (month) => {
        setCashboxMonth(month);
        setSearchParams({ month }, { replace: true });
    };

    const calculateCashbox = (period = selectedPeriod) => {
        const monthlyFinances = getMonthlyFinances(period);
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
            period,
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
        const periodLabel = formatPeriodLabel(cashbox.period, util);

        doc.setFontSize(16);
        doc.text('Reporte de Caja de Fin de Mes', 14, 15);

        doc.setFontSize(10);
        doc.text(`Caja: ${monthLabel}`, 14, 25);
        doc.text(`Periodo: ${periodLabel}`, 14, 32);
        doc.text(`Generado: ${util.formatDate(new Date())}`, 14, 39);

        autoTable(doc, {
            startY: 47,
            theme: 'grid',
            head: [['Concepto', 'Monto']],
            body: [
                ['Ingresos del periodo', formatCurrency(cashbox.monthlyIncome)],
                ['Gastos del periodo', formatCurrency(cashbox.monthlyExpense)],
                ['Balance total', formatCurrency(cashbox.totalBalance)],
                ['Deudas', formatCurrency(cashbox.debts)],
                ['Balance después de deudas', formatCurrency(cashbox.balanceAfterDebts)],
                ['M - Fondo de mantenimiento 20%', formatCurrency(cashbox.maintenanceFund)],
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

    const downloadCashboxHistoryPDF = () => {
        const doc = new jsPDF();
        const generatedAt = util.formatDate(new Date());

        if (!history || history.length === 0) {
            doc.text('No hay registros de historial disponibles.', 14, 20);
            doc.save('historial-cajas.pdf');
            return;
        }

        history.forEach((cashbox, index) => {
            const summary = cashbox.summary || {};
            const distributions = summary.distributions || cashbox.distributions || {};
            const month = getCashboxMonth(cashbox);
            const monthLabel = formatMonth(month);
            const period = getCashboxDisplayPeriod(cashbox);

            if (index > 0) doc.addPage();

            doc.setFontSize(16);
            doc.text(`Caja de Fin de Mes - ${monthLabel}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Periodo: ${formatPeriodLabel(period, util)}`, 14, 28);
            doc.text(`Generado: ${generatedAt}`, 14, 35);

            autoTable(doc, {
                startY: 43,
                theme: 'grid',
                head: [['Concepto', 'Monto']],
                body: [
                    ['Ingresos del periodo', formatCurrency(summary.monthlyIncome ?? cashbox.monthlyIncome)],
                    ['Gastos del periodo', formatCurrency(summary.monthlyExpense ?? cashbox.monthlyExpense)],
                    ['Balance total', formatCurrency(summary.totalBalance ?? cashbox.totalBalance)],
                    ['Deudas', formatCurrency(summary.debts ?? cashbox.debts)],
                    ['Balance después de deudas', formatCurrency(summary.balanceAfterDebts ?? cashbox.balanceAfterDebts)],
                    ['M - Fondo de mantenimiento 20%', formatCurrency(summary.maintenanceFund ?? cashbox.maintenanceFund)],
                    ['Balance distribuible', formatCurrency(summary.distributableBalance ?? cashbox.distributableBalance)],
                ],
                styles: { fontSize: 10 },
                headStyles: { fillColor: [69, 90, 100] },
            });

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 8,
                theme: 'grid',
                head: [['Distribución', 'Porcentaje', 'Monto']],
                body: [
                    ['Parte 1', `${cashbox.distributionPercentages?.first ?? 0}%`, formatCurrency(distributions.first ?? 0)],
                    ['Parte 2', `${cashbox.distributionPercentages?.second ?? 0}%`, formatCurrency(distributions.second ?? 0)],
                    ['Parte 3', `${cashbox.distributionPercentages?.third ?? 0}%`, formatCurrency(distributions.third ?? 0)],
                ],
                styles: { fontSize: 10 },
                headStyles: { fillColor: [69, 90, 100] },
            });
        });

        doc.save('historial-cajas.pdf');
    };

    const saveCashbox = async () => {
        try {
            setCashboxSaving(true);
            const closedAt = new Date();
            const closingPeriod = {
                ...selectedPeriod,
                end: closedAt,
                isOpen: false,
            };
            const currentCashbox = calculateCashbox(closingPeriod);
            const generatedExpenseIds = { ...(savedCashbox?.generatedExpenseIds || {}) };
            const cashboxExpenseDate = currentCashbox.period.end;

            const debtExpense = new FinanceModel(
                generatedExpenseIds.debts || '',
                'expense',
                currentCashbox.debts,
                `Caja ${cashboxMonth} - Deudas`,
                cashboxExpenseDate,
                CASHBOX_EXPENSE_CATEGORY
            );

            const distributableExpense = new FinanceModel(
                generatedExpenseIds.distributable || '',
                'expense',
                currentCashbox.distributableBalance,
                `Caja ${cashboxMonth} - Monto distribuible`,
                cashboxExpenseDate,
                CASHBOX_EXPENSE_CATEGORY
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
                periodStart: currentCashbox.period.start,
                periodEnd: currentCashbox.period.end,
                closedAt,
            };

            const saved = await FinanceService.saveMonthlyCashbox(cashboxMonth, payload);
            setSavedCashbox(saved);
            await fetchFinances();
            await fetchCashboxHistory();
            showSnackbar('Caja mensual guardada correctamente', 'success');
        } catch (error) {
            console.error('Error saving monthly cashbox:', error);
            showSnackbar('Error al guardar la caja mensual', 'error');
        } finally {
            setCashboxSaving(false);
        }
    };

    const cashbox = calculateCashbox();

    return (
        <div className="finance-container">
            <Menu title="Arqueo de caja" />
            <Container maxWidth="lg" sx={{ mt: 11, mb: 4 }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    sx={{ mb: 3 }}
                >
                    <Button variant="outlined" onClick={() => navigate(`/finance?month=${cashboxMonth}`)}>
                        Volver a Flujos
                    </Button>
                    <Button variant="contained" onClick={() => setOpenHistoryModal(true)}>
                        Historial de Cajas
                    </Button>
                </Stack>

                {loading || cashboxLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
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
                                        Balance del periodo, deudas, fondo de mantenimiento y distribución.
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        Periodo: {formatPeriodLabel(cashbox.period, util)}
                                    </Typography>
                                </Box>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <Button variant="outlined" onClick={saveCashbox} disabled={cashboxSaving}>
                                        Guardar Caja
                                    </Button>
                                    <Button variant="outlined" onClick={downloadCashboxPDF}>
                                        PDF Caja
                                    </Button>
                                </Stack>
                            </Stack>

                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Mes de caja"
                                        type="month"
                                        value={cashboxMonth}
                                        onChange={(event) => handleCashboxMonthChange(event.target.value)}
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
                                            <Typography variant="body2" color="text.secondary">Distribuible</Typography>
                                            <Typography variant="h6">{formatCurrency(cashbox.distributableBalance)}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="body2" color="text.secondary">Mantenimiento 20% (M)</Typography>
                                            <Typography variant="h6">{formatCurrency(cashbox.maintenanceFund)}</Typography>
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

                    </>
                )}
                
                <CashboxHistoryDialog 
                    open={openHistoryModal} 
                    onClose={() => setOpenHistoryModal(false)} 
                    history={history} 
                    loading={historyLoading} 
                    onDownloadHistoryPDF={downloadCashboxHistoryPDF}
                />
            </Container>
        </div>
    );
}

export default CashboxPage;
