import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import { Transaction } from '../types';
import { TrendingUp, AlertTriangle, PiggyBank, Calendar, Filter, X } from 'lucide-react';

export const Reports = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all'); // 0-11 or 'all'

    useEffect(() => {
        const loadData = async () => {
            const data = await api.getTransactions();
            setTransactions(data);
            setLoading(false);
        };
        loadData();
    }, []);

    const years = useMemo(() => {
        const yearsSet = new Set<number>();
        yearsSet.add(new Date().getFullYear());
        transactions.forEach(tx => {
            const date = tx.paymentDate ? new Date(tx.paymentDate) : new Date(tx.date);
            yearsSet.add(date.getFullYear());
        });
        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [transactions]);

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Filtered Data for Calculations
    const filteredData = useMemo(() => {
        return transactions.filter(tx => {
            const date = tx.paymentDate ? new Date(tx.paymentDate) : new Date(tx.date);
            const yearMatch = date.getFullYear() === selectedYear;
            const monthMatch = selectedMonth === 'all' || date.getMonth() === selectedMonth;
            return yearMatch && monthMatch;
        });
    }, [transactions, selectedYear, selectedMonth]);

    // --- Calculation Logic based on Filtered Data ---

    // 1. Monthly Totals (For Chart) - Always show full year context if 'all' months selected, otherwise just that month?
    // Actually, usually charts show the whole year to compare. 
    // If a specific month is selected, maybe we show daily breakdown? 
    // Let's keep it simple: Chart always shows the 12 months of the selected YEAR.
    const yearMonthlyTotals: Record<number, number> = {};
    for (let i = 0; i < 12; i++) yearMonthlyTotals[i] = 0;

    transactions.forEach(tx => {
        const date = tx.paymentDate ? new Date(tx.paymentDate) : new Date(tx.date);
        if (date.getFullYear() === selectedYear) {
            yearMonthlyTotals[date.getMonth()] += (tx.totalAmount || 0);
        }
    });

    const chartData = Object.entries(yearMonthlyTotals).map(([monthIndex, value]) => ({
        month: months[parseInt(monthIndex)],
        value
    }));

    // 2. Stats Cards
    const totalExpense = filteredData.reduce((acc, tx) => acc + (tx.totalAmount || 0), 0);

    // Average Monthly (If 'all' selected, divide by 12 or current month? let's divide by 12 for annual view)
    // If specific month selected, average doesn't make sense, maybe "Daily Average"?
    const average = selectedMonth === 'all'
        ? totalExpense / 12
        : totalExpense / new Date(selectedYear, (selectedMonth as number) + 1, 0).getDate(); // Daily avg

    // 3. Insights
    // Savings: Active subscriptions in this period
    const subExpenses = filteredData
        .filter(t => t.type === 'subscription')
        .reduce((acc, t) => acc + (t.totalAmount || 0), 0);

    // Critical Months (Only relevant for Year view)
    const annualAverage = (Object.values(yearMonthlyTotals).reduce((a, b) => a + b, 0)) / 12;
    const criticalMonths = chartData.filter(m => m.value > annualAverage * 1.2);


    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando análisis...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Reportes</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Análisis de {selectedMonth === 'all' ? 'Año Completo' : months[selectedMonth]} {selectedYear}</p>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface)', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <Filter size={16} color="var(--text-muted)" />

                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            style={{ border: 'none', background: 'transparent', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>

                        <div style={{ width: '1px', height: '1.5rem', backgroundColor: 'var(--border)' }} />

                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none', minWidth: '100px' }}
                        >
                            <option value="all">Todo el Año</option>
                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>

                        {/* Reset Button if filtered */}
                        {(selectedMonth !== 'all' || selectedYear !== new Date().getFullYear()) && (
                            <button
                                onClick={() => { setSelectedYear(new Date().getFullYear()); setSelectedMonth('all'); }}
                                style={{ padding: '0.25rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'var(--hover)' }}
                                title="Restablecer filtros"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <Calendar size={20} style={{ color: '#3b82f6' }} />
                        <h3 style={{ fontWeight: 600 }}>Gasto {selectedMonth === 'all' ? 'Anual' : 'Mensual'}</h3>
                    </div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>${totalExpense.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {selectedMonth === 'all' ? 'Total acumulado del año' : `Total en ${months[selectedMonth as number]}`}
                    </p>
                </div>

                <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <PiggyBank size={20} style={{ color: '#10b981' }} />
                        <h3 style={{ fontWeight: 600 }}>En Suscripciones</h3>
                    </div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>${subExpenses.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Gastos fijos recurrentes en este periodo
                    </p>
                </div>

                {selectedMonth === 'all' && (
                    <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                            <h3 style={{ fontWeight: 600 }}>Meses Críticos</h3>
                        </div>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{criticalMonths.length}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Meses que superan el promedio anual</p>
                    </div>
                )}
            </div>

            {/* Annual Chart (Only visible if 'all' months selected or we want to keep context) */}
            {selectedMonth === 'all' && (
                <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={20} /> Flujo Anual ({selectedYear})
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '200px', paddingTop: '1rem' }}>
                        {chartData.map((d, i) => {
                            const maxValue = Math.max(...chartData.map(c => c.value));
                            const heightPercent = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
                            const isCritical = d.value > annualAverage * 1.2;

                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--background)',
                                        position: 'relative'
                                    }} title={`${d.month}: $${d.value.toLocaleString()}`}>
                                        <div style={{
                                            width: '100%',
                                            height: `${heightPercent}%`,
                                            backgroundColor: isCritical ? '#f87171' : '#60a5fa',
                                            borderRadius: '4px',
                                            transition: 'height 0.3s ease',
                                            minHeight: d.value > 0 ? '4px' : '0'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                                        {d.month.substring(0, 3)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* If Month Selected: Maybe show category breakdown? For now list top items? */}
            {selectedMonth !== 'all' && (
                <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Desglose de {months[selectedMonth]}</h3>
                    {filteredData.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No hay movimientos registrados para este mes.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {filteredData.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5).map(tx => (
                                <li key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{tx.shopName}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(tx.date).toLocaleDateString()}
                                            {tx.paymentDate && ` (Pago: ${new Date(tx.paymentDate).toLocaleDateString()})`}
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: 600 }}>${tx.totalAmount.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {filteredData.length > 5 && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
                            Mostrando los 5 mayores gastos
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
