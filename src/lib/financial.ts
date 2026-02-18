
import { Transaction } from '../types';

export const setMonthAndYear = (date: Date, month: number, year: number) => {
    const newDate = new Date(year, month, date.getDate());
    // If the day changed (e.g. 31 Jan -> 2/3 March), set it to last day of month
    if (newDate.getMonth() !== month) {
        return new Date(year, month + 1, 0);
    }
    return newDate;
};

/**
 * Expands transactions for a specific month, projecting recurring subscriptions
 * and creating virtual transaction instances.
 */
export const getMonthlyTransactions = (
    allTransactions: Transaction[],
    targetDate: Date
): Transaction[] => {
    const currentMonthTransactions: Transaction[] = [];
    const month = targetDate.getMonth();
    const year = targetDate.getFullYear();

    // 1. Identify "Real" payments for recurring groups in this month to avoid duplicates
    // Map group_id -> boolean (exists in this month)
    const existingRecurringPayments = new Set<string>();

    allTransactions.forEach(t => {
        const date = t.paymentDate ? new Date(t.paymentDate) : new Date(t.date);
        if (t.groupId && date.getMonth() === month && date.getFullYear() === year) {
            existingRecurringPayments.add(t.groupId);
        }
    });

    allTransactions.forEach(t => {
        const effectiveDate = t.paymentDate ? new Date(t.paymentDate) : new Date(t.date);

        // 1. Direct Match (Real Transactions)
        const matchesMonth = effectiveDate.getMonth() === month &&
            effectiveDate.getFullYear() === year;

        if (matchesMonth) {
            currentMonthTransactions.push(t);
        }

        // 2. Recurring Logic (Virtual Projections)
        if (t.isRecurring && t.groupId) {

            // If we already have a real transaction for this group in this month, SKIP virtual
            // But if matchesMonth is true, we already added it above.
            // If matchesMonth is false, but existingRecurringPayments has it, it means there is a SEPARATE real payment transaction.
            if (existingRecurringPayments.has(t.groupId) && !matchesMonth) {
                return;
            }

            // If matchesMonth is true, we already added the REAL one. We don't want a duplicate virtual one.
            if (matchesMonth) return;

            const startOfSelectedMonth = new Date(year, month, 1);
            const endOfSelectedMonth = new Date(year, month + 1, 0);

            if (effectiveDate <= endOfSelectedMonth) {
                // Check End Date
                const recurrenceEndDate = t.recurrenceEndDate ? new Date(t.recurrenceEndDate) : null;
                if (!recurrenceEndDate || recurrenceEndDate >= startOfSelectedMonth) {

                    // Create Virtual Transaction for this month
                    const virtualDate = setMonthAndYear(effectiveDate, month, year);

                    let virtualPaymentDate = undefined;
                    if (t.paymentDate) {
                        const originalPaymentDate = new Date(t.paymentDate);
                        virtualPaymentDate = setMonthAndYear(originalPaymentDate, month, year);
                    }

                    // Virtual transactions are always 'pending' by default logic unless a real payment exists (handled above)
                    currentMonthTransactions.push({
                        ...t,
                        // We use a negative ID to easily identify virtuals if needed, or just keep unique
                        // But strictly speaking, for read-only analysis, reusing ID is confusing but acceptable if we don't assume uniqueness of ID in a list of projected impacts.
                        // However, React keys need uniqueness.
                        id: -Math.abs(t.id + month + year * 12),
                        date: virtualDate,
                        paymentDate: virtualPaymentDate,
                        status: 'pending',
                        isVirtual: true // Helpful flag if we add it to type, otherwise ignored or casted
                    } as Transaction & { isVirtual?: boolean });
                }
            }
        }
    });

    return currentMonthTransactions;
};

/**
 * Calculates financial summaries for a range of months
 */
export const getFinancialContext = (
    allTransactions: Transaction[],
    monthsToAnalyze: number = 3
) => {
    const now = new Date();
    const summaries = [];

    for (let i = 0; i < monthsToAnalyze; i++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthlyTx = getMonthlyTransactions(allTransactions, targetDate);

        const total = monthlyTx.reduce((sum, t) => sum + t.totalAmount, 0);
        const pending = monthlyTx.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.totalAmount, 0);

        // Identify top 3 largest expenses for this month to give context on WHY the total is high/low
        const topExpenses = monthlyTx
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5)
            .map(t => `${t.shopName}: $${t.totalAmount.toFixed(0)}`)
            .join(', ');

        summaries.push({
            month: targetDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
            total,
            pending,
            topExpenses
        });
    }

    return summaries;
};
