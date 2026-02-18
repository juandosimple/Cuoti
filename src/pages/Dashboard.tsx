import { useEffect, useState } from 'react';
import { CreditCard, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Transaction } from '../types';

const StatCard = ({ title, amount, icon: Icon, color, subtext }: { title: string, amount: string, icon: any, color: string, subtext?: string }) => (
    <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow)'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>{title}</span>
            <div style={{ padding: '0.5rem', borderRadius: '9999px', backgroundColor: `${color}20` }}>
                <Icon size={20} style={{ color: color }} />
            </div>
        </div>
        <div>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, display: 'block' }}>{amount}</span>
            {subtext && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    {subtext}
                </span>
            )}
        </div>
    </div>
);

export const Dashboard = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const [stats, setStats] = useState({
        monthlyExpenses: 0,
        pendingThisMonth: 0,
        totalDebt: 0
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await api.getTransactions();
                setTransactions(data);
                calculateStats(data);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            }
        };
        loadData();
    }, []);

    const calculateStats = (data: Transaction[]) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let monthlyExpenses = 0;
        let pendingThisMonth = 0;
        let totalDebt = 0;

        data.forEach(tx => {
            const effectiveDate = tx.paymentDate ? new Date(tx.paymentDate) : new Date(tx.date);
            const isThisMonth = effectiveDate.getMonth() === currentMonth && effectiveDate.getFullYear() === currentYear;

            // Monthly Expenses (Everything that falls in this month, paid or pending)
            if (isThisMonth) {
                monthlyExpenses += tx.totalAmount || 0;
            }

            // Pending amount for THIS month
            if (isThisMonth && tx.status === 'pending') {
                pendingThisMonth += tx.totalAmount || 0;
            }

            // Total Debt (All time pending transactions valid as debt)
            // Assuming 'isDebt' flag means "External Debt" or just unpaid debts?
            // User definition: "Deudas Activas". Let's assume it means ANY pending 'debt' type transaction OR jus any pending payment?
            // Usually 'isDebt' was specific. Let's start with: All Pending Transactions marked as 'isDebt'.
            if (tx.isDebt && tx.status === 'pending') {
                totalDebt += tx.totalAmount || 0;
            }
        });

        setStats({
            monthlyExpenses,
            pendingThisMonth,
            totalDebt
        });
    };

    // Filter upcoming pending transactions (sorted by payment date or date asc)
    const upcoming = transactions
        .filter(t => t.status === 'pending')
        .sort((a, b) => {
            const dateA = a.paymentDate ? new Date(a.paymentDate).getTime() : new Date(a.date).getTime();
            const dateB = b.paymentDate ? new Date(b.paymentDate).getTime() : new Date(b.date).getTime();
            return dateA - dateB;
        })
        .slice(0, 5);

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Inicio</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem'
            }}>
                <StatCard
                    title="Gastos del Mes"
                    amount={formatCurrency(stats.monthlyExpenses)}
                    icon={DollarSign}
                    color="#3b82f6" // Blue
                    subtext="Total procesado este mes"
                />
                <StatCard
                    title="Por Pagar (Este Mes)"
                    amount={formatCurrency(stats.pendingThisMonth)}
                    icon={Calendar}
                    color="#ef4444" // Red indicates urgency
                    subtext="Pendiente de pago"
                />
                <StatCard
                    title="Deudas Totales"
                    amount={formatCurrency(stats.totalDebt)}
                    icon={CreditCard}
                    color="#f59e0b" // Amber
                    subtext="Deudas activas acumuladas"
                />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '1.5rem'
            }}>
                <div style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow)'
                }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={18} /> Próximos Vencimientos
                    </h3>

                    {upcoming.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                            ¡Todo al día! No tienes pagos pendientes próximos.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {upcoming.map(tx => {
                                // Alert Logic
                                let alertLevel = 'none'; // none, warning, danger
                                if (tx.paymentDate) {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const payDate = new Date(tx.paymentDate);
                                    payDate.setHours(0, 0, 0, 0);

                                    const diffTime = payDate.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                    // Logic: 
                                    // Today or Past: Danger
                                    // <= 2 days: Danger
                                    // <= 5 days: Warning

                                    if (diffDays <= 2) alertLevel = 'danger';
                                    else if (diffDays <= 5) alertLevel = 'warning';
                                } else {
                                    // Fallback if no payment date (maybe treat purchase date as "due" if pending? for now, no alert)
                                }

                                const alertColor = alertLevel === 'danger' ? '#fee2e2' : alertLevel === 'warning' ? '#fef3c7' : 'var(--background)';
                                const alertBorder = alertLevel === 'danger' ? '#f87171' : alertLevel === 'warning' ? '#fbbf24' : 'var(--border)';

                                return (
                                    <div key={tx.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius)',
                                        backgroundColor: alertColor,
                                        border: `1px solid ${alertBorder}`,
                                        position: 'relative'
                                    }}>
                                        {/* Indicator Dot */}
                                        {alertLevel !== 'none' && (
                                            <div style={{
                                                position: 'absolute', top: '-5px', right: '-5px',
                                                width: '12px', height: '12px', borderRadius: '50%',
                                                backgroundColor: alertLevel === 'danger' ? '#ef4444' : '#f59e0b',
                                                border: '2px solid var(--surface)',
                                                boxShadow: '0 0 0 1px var(--surface)'
                                            }} title={alertLevel === 'danger' ? 'Vence pronto (2 días o menos)' : 'Vence esta semana'} />
                                        )}

                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 500 }}>{tx.shopName}</span>
                                            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                <span>
                                                    📅 Compra: {new Date(tx.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </span>
                                                {tx.paymentDate && (
                                                    <span style={{ fontWeight: 600, color: alertLevel === 'danger' ? '#991b1b' : 'inherit' }}>
                                                        🚨 Pagar: {new Date(tx.paymentDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                                            {formatCurrency(tx.totalAmount || 0)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
