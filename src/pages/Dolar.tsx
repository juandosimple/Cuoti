import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, RefreshCcw, Calculator } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';

// Helper for Argentine Currency Formatting
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

// Helper for formatting crypto/USD amount
const formatAmount = (value: number, currency: string) => {
    return `${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

export const Dolar = () => {
    const [loading, setLoading] = useState(true);
    const [quotes, setQuotes] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);

    // Calculator State
    const [calcAmount, setCalcAmount] = useState<string>('1');
    const [calcType, setCalcType] = useState<'usd_oficial_to_ars' | 'usdc_to_ars' | 'ars_to_usd_oficial' | 'ars_to_usdc'>('usdc_to_ars');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [data, chartData] = await Promise.all([
                api.getDolarQuotes(),
                api.getCryptoChartData(30)
            ]);
            setQuotes(data);

            if (chartData && chartData.prices) {
                // The API returns multiple points per day (usually hourly for 30 days).
                // We want to reduce this to roughly 1 point per day to keep the chart clean like before.
                // Grouping by date string keeps the last price of the day.
                const dailyPrices = new Map();

                chartData.prices.forEach(([timestamp, price]: [number, number]) => {
                    const dateObj = new Date(timestamp);
                    const dateStr = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                    // Map will overwrite earlier entries for the same day, storing the latest price of the day
                    dailyPrices.set(dateStr, price);
                });

                const formattedHistory = Array.from(dailyPrices.entries()).map(([dateStr, price]) => ({
                    date: dateStr,
                    price: Math.round(price)
                }));

                setHistory(formattedHistory);
            }
        } catch (error) {
            console.error("Error fetching dolar data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !quotes) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando cotizaciones...</div>;
    }

    // Calculations for Widgets
    const usdcPrice = quotes?.cripto?.usdc?.ask || 0;
    const officialPrice = quotes?.oficial?.price || 0;
    const usdcVariation = quotes?.cripto?.usdc?.variation || 0;
    const officialVariation = quotes?.oficial?.variation || 0;

    // Calculate "Previous" price based on variation
    // Current = Previous * (1 + var/100)  =>  Previous = Current / (1 + var/100)
    const previousPrice = usdcPrice / (1 + (usdcVariation / 100));

    // Calculator Logic
    const parseInput = (input: string) => {
        // Remove dots (thousand separators) and replace comma with dot for decimal
        const cleanInput = input.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanInput) || 0;
    };

    const amount = parseInput(calcAmount);
    let conversionResult = 0;
    let resultCurrency = 'ARS';

    switch (calcType) {
        case 'usd_oficial_to_ars':
            conversionResult = amount * officialPrice;
            resultCurrency = 'ARS';
            break;
        case 'usdc_to_ars':
            conversionResult = amount * usdcPrice;
            resultCurrency = 'ARS';
            break;
        case 'ars_to_usd_oficial':
            conversionResult = amount / officialPrice;
            resultCurrency = 'USD';
            break;
        case 'ars_to_usdc':
            conversionResult = amount / usdcPrice;
            resultCurrency = 'USDC';
            break;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Mercado Dólar</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Cotización en tiempo real (Base CriptoYa)</p>
                </div>
                <button
                    onClick={fetchData}
                    style={{
                        padding: '0.5rem',
                        borderRadius: '50%',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        cursor: 'pointer'
                    }}
                >
                    <RefreshCcw size={20} />
                </button>
            </div>

            {/* Widgets Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>

                {/* Previous Price (Left) */}
                <div style={cardStyle}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        USDC Ayer (Est.)
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {formatCurrency(previousPrice)}
                    </div>
                    {/* 100k Equivalent */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', opacity: 0.8 }}>
                        100k ARS = {formatAmount(100000 / previousPrice, 'USDC')}
                    </div>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.7 }}>
                        Calculado por variación
                    </div>
                </div>

                {/* Current Price (Center) - Highlighted */}
                <div style={{ ...cardStyle, border: '2px solid var(--primary)', backgroundColor: 'var(--surface-active)' }}>
                    <div style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={16} /> USDC (Cripto)
                    </div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800 }}>
                        {formatCurrency(usdcPrice)}
                    </div>

                    {/* 100k Equivalent */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 500 }}>
                        100k ARS = {formatAmount(100000 / usdcPrice, 'USDC')}
                    </div>

                    <div style={{
                        fontSize: '0.875rem',
                        marginTop: '0.5rem',
                        color: usdcVariation >= 0 ? '#10b981' : '#ef4444',
                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                    }}>
                        {usdcVariation >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {usdcVariation > 0 ? '+' : ''}{usdcVariation}% (24h)
                    </div>
                </div>

                {/* Official Price (Right) */}
                <div style={cardStyle}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        Dólar Oficial
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {formatCurrency(officialPrice)}
                    </div>
                    {/* 100k Equivalent */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', opacity: 0.8 }}>
                        100k ARS = {formatAmount(100000 / officialPrice, 'USD')}
                    </div>
                    <div style={{
                        fontSize: '0.875rem',
                        marginTop: '0.5rem',
                        color: officialVariation === 0 ? 'var(--text-muted)' : (officialVariation > 0 ? '#10b981' : '#ef4444'),
                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                    }}>
                        {officialVariation !== 0 && (officialVariation > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />)}
                        {officialVariation > 0 ? '+' : ''}{officialVariation}% (24h)
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Evolución Mensual USDC a ARS</h3>
                <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                itemStyle={{ color: 'var(--text-main)' }}
                                formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Precio'] as [string, string]}
                            />
                            <Area
                                type="monotone"
                                dataKey="price"
                                stroke="var(--primary)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Calculator Section */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calculator size={20} /> Conversor Rápido
                </h3>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Cantidad
                        </label>
                        <input
                            type="text"
                            value={calcAmount}
                            onChange={(e) => setCalcAmount(e.target.value)}
                            placeholder="Ej: 1.000,50"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--text-main)',
                                fontSize: '1.125rem'
                            }}
                        />
                    </div>

                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Dirección
                        </label>
                        <select
                            value={calcType}
                            onChange={(e) => setCalcType(e.target.value as any)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--text-main)',
                                fontSize: '1rem'
                            }}
                        >
                            <option value="usdc_to_ars">USDC a ARS</option>
                            <option value="usd_oficial_to_ars">USD Oficial a ARS</option>
                            <option value="ars_to_usdc">ARS a USDC</option>
                            <option value="ars_to_usd_oficial">ARS a USD Oficial</option>
                        </select>
                    </div>

                    <div style={{ flex: 2, textAlign: 'right', paddingBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Resultado:</span>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                            {resultCurrency === 'ARS'
                                ? formatCurrency(conversionResult)
                                : formatAmount(conversionResult, resultCurrency)
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const cardStyle = {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    boxShadow: 'var(--shadow)'
};
