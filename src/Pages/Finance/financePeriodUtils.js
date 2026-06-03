import dayjs from 'dayjs';

export const CASHBOX_EXPENSE_CATEGORY = 'Caja de fin de mes';

export const isMonthParam = (value) => /^\d{4}-\d{2}$/.test(value || '');

export const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value.toDate) return value.toDate();
    if (value.seconds) return new Date(value.seconds * 1000);

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const getFinanceDate = (finance) => toDate(finance?.date);

export const getCashboxMonth = (cashbox) => (cashbox?.month || cashbox?.id || '').toString();

export const getDefaultCashboxMonth = (history = [], now = new Date()) => {
    const currentMonth = dayjs(now).format('YYYY-MM');
    const latestCashbox = [...history]
        .filter((cashbox) => getCashboxMonth(cashbox))
        .sort((a, b) => getCashboxMonth(b).localeCompare(getCashboxMonth(a)))[0];

    if (!latestCashbox) return currentMonth;

    const latestMonth = getCashboxMonth(latestCashbox);
    const isLatestClosed = Boolean(toDate(latestCashbox.closedAt) || toDate(latestCashbox.periodEnd));

    if (isLatestClosed && latestMonth >= currentMonth) {
        return dayjs(latestMonth, 'YYYY-MM').add(1, 'month').format('YYYY-MM');
    }

    return currentMonth;
};

export const startOfDay = (date) => dayjs(date).startOf('day').toDate();

export const endOfDay = (date) => dayjs(date).endOf('day').toDate();

export const getCashboxPeriodFallback = (month) => ({
    start: dayjs(month, 'YYYY-MM').startOf('month').toDate(),
    end: dayjs(month, 'YYYY-MM').endOf('month').toDate(),
});

export const getCashboxDisplayPeriod = (cashbox) => {
    const month = getCashboxMonth(cashbox);
    const savedPeriodStart = toDate(cashbox?.periodStart);
    const savedPeriodEnd = toDate(cashbox?.periodEnd);

    if (savedPeriodStart && savedPeriodEnd) {
        return {
            start: startOfDay(savedPeriodStart),
            end: endOfDay(savedPeriodEnd),
            isOpen: false,
        };
    }

    const fallback = getCashboxPeriodFallback(month);
    return {
        start: fallback.start,
        end: fallback.end,
        isOpen: false,
    };
};

export const formatPeriodLabel = (period, util) => {
    const startLabel = period?.start ? util.formatDateShort(period.start) : '-';
    const endLabel = period?.isOpen ? 'hoy' : period?.end ? util.formatDateShort(period.end) : '-';
    return `${startLabel} - ${endLabel}`;
};

export const resolveCashboxPeriod = (history = [], month, savedCashbox = null, now = new Date()) => {
    const selectedCashbox = savedCashbox || history.find((cashbox) => getCashboxMonth(cashbox) === month) || null;
    const fallback = getCashboxPeriodFallback(month);
    const savedPeriodStart = toDate(selectedCashbox?.periodStart);
    const savedPeriodEnd = toDate(selectedCashbox?.periodEnd);
    const closedAt = toDate(selectedCashbox?.closedAt);

    if (savedPeriodStart && savedPeriodEnd) {
        return {
            start: startOfDay(savedPeriodStart),
            end: endOfDay(savedPeriodEnd),
            isOpen: false,
        };
    }

    const previousCashboxes = history
        .filter((cashbox) => {
            const cashboxMonth = getCashboxMonth(cashbox);
            return cashboxMonth && cashboxMonth < month;
        })
        .sort((a, b) => getCashboxMonth(b).localeCompare(getCashboxMonth(a)));

    const previousCloseDate = previousCashboxes
        .map((cashbox) => toDate(cashbox.closedAt) || toDate(cashbox.periodEnd))
        .find(Boolean);

    const start = previousCloseDate
        ? dayjs(previousCloseDate).add(1, 'day').startOf('day').toDate()
        : fallback.start;
    const end = closedAt || savedPeriodEnd || now;

    return {
        start,
        end: endOfDay(end),
        isOpen: !closedAt && !savedPeriodEnd,
    };
};

export const isFinanceInPeriod = (finance, period) => {
    const date = getFinanceDate(finance);
    if (!date || !period?.start || !period?.end) return false;

    return date >= startOfDay(period.start) && date <= endOfDay(period.end);
};

export const isCashboxGeneratedMovement = (finance, generatedExpenseIds = {}) => {
    const generatedIds = new Set(Object.values(generatedExpenseIds).filter(Boolean));
    return finance?.category === CASHBOX_EXPENSE_CATEGORY || generatedIds.has(finance?.id);
};
