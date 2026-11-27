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
    LinearProgress,
    Stack,
    Alert as MuiAlert,
    Divider
} from '@mui/material';
import Menu from '../../Components/Menu/Menu';
import FinanceService from '../../../Firebase/financeService';
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import Util from '../../assets/Util';
import FinanceModel from '../../models/FinanceModel';
import moduleSettings from '../../config/moduleSettings';
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
const formatPdfAmount = (amount) => Number(amount || 0).toFixed(2);
const formatMonth = (month) => (month ? dayjs(month, 'YYYY-MM').format('MMMM YYYY') : '-');
const DEFAULT_DISTRIBUTION_PERCENTAGES = {
    part1: 40,
    part2: 40,
    part3: 20,
};

const getCashboxSettings = () => moduleSettings.getSettings('cashbox');

function getDistributionKeys(percentages = {}, partsCount = 0) {
    const configuredCount = Number(partsCount || 0);
    const keys = Object.keys(percentages || {});

    if (configuredCount > 0) {
        return Array.from({ length: configuredCount }, (_, index) => `part${index + 1}`);
    }

    if (keys.length === 0) return [];

    const numberedKeys = keys.filter((key) => /^part\d+$/.test(key));
    if (numberedKeys.length > 0) {
        return numberedKeys.sort((a, b) => {
            const aNum = Number(a.replace('part', ''));
            const bNum = Number(b.replace('part', ''));
            return aNum - bNum;
        });
    }

    const fallbackKeys = ['first', 'second', 'third'];
    return fallbackKeys.filter((key) => keys.includes(key));
}

function getDistributionLabel(key) {
    const match = key.match(/^part(\d+)$/);
    return match ? `Parte ${match[1]}` : key;
}

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
    const [cashboxSettings, setCashboxSettings] = useState(getCashboxSettings);
    const [partsCount, setPartsCount] = useState(() => getCashboxSettings().partsCount ?? 3);
    const [debtAmount, setDebtAmount] = useState(() => getCashboxSettings().fixedDebtAmount ?? 0);
    const [distributionPercentages, setDistributionPercentages] = useState(
        () => getCashboxSettings().distributionPercentages || DEFAULT_DISTRIBUTION_PERCENTAGES,
    );
    const [maintenancePercentage, setMaintenancePercentage] = useState(() => getCashboxSettings().maintenancePercentage ?? 20);
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
                setPartsCount(Number(cashbox.partsCount ?? cashboxSettings.partsCount ?? 3));
                setDebtAmount(cashbox.debts ?? cashboxSettings.fixedDebtAmount ?? 0);
                setDistributionPercentages(
                    cashbox.distributionPercentages || cashboxSettings.distributionPercentages || {
                        part1: 40,
                        part2: 40,
                        part3: 20,
                    }
                );
                setMaintenancePercentage(cashbox.maintenancePercentage ?? cashboxSettings.maintenancePercentage ?? 20);
            } else {
                setPartsCount(Number(cashboxSettings.partsCount ?? 3));
                setDebtAmount(cashboxSettings.fixedDebtAmount ?? 0);
                setDistributionPercentages(cashboxSettings.distributionPercentages || DEFAULT_DISTRIBUTION_PERCENTAGES);
                setMaintenancePercentage(cashboxSettings.maintenancePercentage ?? 20);
            }
        } catch (error) {
            console.error('Error fetching monthly cashbox:', error);
            showSnackbar('Error al cargar la caja mensual', 'error');
        } finally {
            setCashboxLoading(false);
        }
    }, [cashboxMonth, showSnackbar, cashboxSettings]);

    useEffect(() => {
        fetchFinances();
        fetchCashboxHistory();
    }, [fetchFinances, fetchCashboxHistory]);

    useEffect(() => {
        const unsubscribe = moduleSettings.subscribe('cashbox', (settings) => {
            setCashboxSettings(settings);
            setPartsCount(Number(settings.partsCount || 3));
            setDebtAmount(settings.fixedDebtAmount ?? 0);
            setDistributionPercentages(settings.distributionPercentages || DEFAULT_DISTRIBUTION_PERCENTAGES);
            setMaintenancePercentage(settings.maintenancePercentage ?? 20);
        });
        return unsubscribe;
    }, []);

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
            .filter((f) => f.type === 'income')
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        const monthlyExpense = monthlyFinances
            .filter((f) => f.type === 'expense')
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        const totalBalance = monthlyIncome - monthlyExpense;
        const debts = Math.max(parseFloat(debtAmount || 0), 0);
        const balanceAfterDebts = totalBalance - debts;
        const maintenanceFund = balanceAfterDebts > 0 ? balanceAfterDebts * (Number(maintenancePercentage || 20) / 100) : 0;
        const distributableBalance = balanceAfterDebts - maintenanceFund;
        const safeDistributableBalance = distributableBalance > 0 ? distributableBalance : 0;

        const distributionKeys = getDistributionKeys(distributionPercentages, partsCount);
        const distributions = distributionKeys.reduce((acc, key) => {
            const percentage = Number(distributionPercentages[key] ?? 0);
            acc[key] = safeDistributableBalance * (percentage / 100);
            return acc;
        }, {});

        const distributionTotalPercentage = distributionKeys.reduce((sum, key) => sum + Number(distributionPercentages[key] || 0), 0);

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
            distributions,
            distributionTotalPercentage,
            distributionKeys,
        };
    };

    const loadPdfTools = async () => {
        const [{ default: jsPDF }, { autoTable }] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable'),
        ]);

        return { jsPDF, autoTable };
    };

    const downloadCashboxPDF = async () => {
        const { jsPDF, autoTable } = await loadPdfTools();
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
                ['Ingresos del periodo', formatPdfAmount(cashbox.monthlyIncome)],
                ['Gastos del periodo', formatPdfAmount(cashbox.monthlyExpense)],
                ['Balance total', formatPdfAmount(cashbox.totalBalance)],
                ['Deudas', formatPdfAmount(cashbox.debts)],
                ['Balance después de deudas', formatPdfAmount(cashbox.balanceAfterDebts)],
                ['M - Fondo de mantenimiento 20%', formatPdfAmount(cashbox.maintenanceFund)],
                ['Balance distribuible', formatPdfAmount(cashbox.distributableBalance)],
            ],
            styles: { fontSize: 10 },
            headStyles: { fillColor: [69, 90, 100] },
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            theme: 'grid',
            head: [['Distribución', 'Porcentaje', 'Monto']],
            body: [
                ...getDistributionKeys(distributionPercentages, partsCount).map((key) => [
                    getDistributionLabel(key),
                    `${distributionPercentages[key] ?? 0}%`,
                    formatPdfAmount(cashbox.distributions[key] ?? 0),
                ]),
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
                `${finance.type === 'income' ? '+' : '-'}${formatPdfAmount(finance.amount)}`,
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [69, 90, 100] },
        });

        doc.save(`caja-fin-de-mes-${cashboxMonth}.pdf`);
    };

    const downloadCashboxHistoryPDF = async () => {
        const { jsPDF, autoTable } = await loadPdfTools();
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
                    ['Ingresos del periodo', formatPdfAmount(summary.monthlyIncome ?? cashbox.monthlyIncome)],
                    ['Gastos del periodo', formatPdfAmount(summary.monthlyExpense ?? cashbox.monthlyExpense)],
                    ['Balance total', formatPdfAmount(summary.totalBalance ?? cashbox.totalBalance)],
                    ['Deudas', formatPdfAmount(summary.debts ?? cashbox.debts)],
                    ['Después de deudas', formatPdfAmount(summary.balanceAfterDebts ?? cashbox.balanceAfterDebts)],
                    ['M - Fondo de mantenimiento 20%', formatPdfAmount(summary.maintenanceFund ?? cashbox.maintenanceFund)],
                    ['Balance distribuible', formatPdfAmount(summary.distributableBalance ?? cashbox.distributableBalance)],
                ],
                styles: { fontSize: 10 },
                headStyles: { fillColor: [69, 90, 100] },
            });

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 8,
                theme: 'grid',
                head: [['Distribución', 'Porcentaje', 'Monto']],
                body: [
                    ...getDistributionKeys(cashbox.distributionPercentages || {}, cashbox.partsCount || partsCount).map((key) => [
                        getDistributionLabel(key),
                        `${cashbox.distributionPercentages?.[key] ?? 0}%`,
                        formatPdfAmount(distributions[key] ?? 0),
                    ]),
                ],
                styles: { fontSize: 10 },
                headStyles: { fillColor: [69, 90, 100] },
            });
        });

        doc.save('historial-cajas.pdf');
    };

    const saveCashbox = async () => {
        if (cashbox.distributionTotalPercentage !== 100) {
            showSnackbar('La suma de los porcentajes del monto distribuible debe ser 100% y no incluye el fondo de mantenimiento.', 'warning');
            return;
        }

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
                partsCount: Number(partsCount || cashboxSettings.partsCount || 3),
                debts: currentCashbox.debts,
                distributionPercentages: getDistributionKeys(distributionPercentages, partsCount).reduce((acc, key) => ({
                    ...acc,
                    [key]: Number(distributionPercentages[key] || 0),
                }), {}),
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
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        Periodo: {formatPeriodLabel(cashbox.period, util)}
                                    </Typography>
                                </Box>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <Button
                                        variant="outlined"
                                        onClick={saveCashbox}
                                        disabled={cashboxSaving || cashbox.distributionTotalPercentage !== 100}
                                    >
                                        Guardar Caja
                                    </Button>
                                    <Button variant="outlined" onClick={downloadCashboxPDF}>
                                        PDF Caja
                                    </Button>
                                </Stack>
                            </Stack>

                            <Paper variant="outlined" sx={{ p: 2, mb: 2, maxWidth: 560 }}>
                                <Stack spacing={1}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                        <Typography>Balance total</Typography>
                                        <Typography>{formatCurrency(cashbox.totalBalance)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                        <Typography>Deudas</Typography>
                                        <Typography color="error.main">- {formatCurrency(cashbox.debts)}</Typography>
                                    </Box>
                                    <Divider />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                        <Typography fontWeight={600}>Después de deudas</Typography>
                                        <Typography fontWeight={600}>{formatCurrency(cashbox.balanceAfterDebts)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                        <Typography>Mantenimiento ({maintenancePercentage}%)</Typography>
                                        <Typography color="error.main">- {formatCurrency(cashbox.maintenanceFund)}</Typography>
                                    </Box>
                                    <Divider />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                        <Typography variant="h6" fontWeight={700}>Distribuible</Typography>
                                        <Typography variant="h6" fontWeight={700}>
                                            {formatCurrency(cashbox.distributableBalance)}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>

                            <Divider sx={{ my: 2 }} />

                            <Stack spacing={1.5} sx={{ mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>
                                        Distribución
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Monto a distribuir: {formatCurrency(cashbox.distributableBalance)}
                                    </Typography>
                                </Box>
                                {cashbox.distributionTotalPercentage !== 100 && (
                                    <MuiAlert severity="warning">
                                        Porcentajes asignados: {cashbox.distributionTotalPercentage}%.
                                        Deben sumar 100% y no incluyen el fondo de mantenimiento.
                                    </MuiAlert>
                                )}
                            </Stack>

                            <Grid container spacing={2}>
                                {getDistributionKeys(distributionPercentages, partsCount).map((key) => {
                                    const percentage = Number(distributionPercentages[key] ?? 0);
                                    const progressValue = Number.isFinite(percentage)
                                        ? Math.min(Math.max(percentage, 0), 100)
                                        : 0;

                                    return (
                                        <Grid item xs={12} md={4} key={key}>
                                            <Box sx={{ mb: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {getDistributionLabel(key)}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {distributionPercentages[key] ?? 0}%
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={progressValue}
                                                    aria-label={`${getDistributionLabel(key)}: ${percentage}%`}
                                                    sx={{ height: 8, borderRadius: 4 }}
                                                />
                                            </Box>
                                            <Typography variant="h6">
                                                {formatCurrency(cashbox.distributions[key] ?? 0)}
                                            </Typography>
                                        </Grid>
                                    );
                                })}
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
