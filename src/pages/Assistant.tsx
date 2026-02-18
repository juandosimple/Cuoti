import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { ai, ChatMessage } from '../lib/ai';
import { Transaction } from '../types';

export const Assistant = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load financial context on mount
    useEffect(() => {
        const loadContext = async () => {
            try {
                const [txs, tags] = await Promise.all([
                    api.getTransactions(),
                    api.getTags()
                ]);

                // Import dynamically or assume imported.
                const { getFinancialContext } = await import('../lib/financial');
                const summaries = getFinancialContext(txs, 4); // Analyze 4 months (Current + 3)

                const pendingTotal = txs
                    .filter(t => t.status === 'pending')
                    .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

                const debtTotal = txs
                    .filter(t => t.isDebt && t.status === 'pending')
                    .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

                // --- Subscriptions Identification ---
                // Find tag resembling 'Suscripciones'
                const subTag = tags.find(t => t.name.toLowerCase().includes('suscri'));

                // Get unique active subscriptions
                // Logic: Look for Recurring items OR Items with "Subscription" tag.
                // We process list (descending date) to get the latest amount.
                const activeSubs = new Map<string, Transaction>();

                txs.forEach(t => {
                    const isSubTag = subTag && t.tagIds?.includes(subTag.id);
                    // Treat as subscription if it's explicitly recurring OR tagged as subscription
                    if (t.isRecurring || isSubTag) {
                        // Use group ID to deduplicate, or Shop Name if no group ID
                        const key = t.groupId || t.shopName;
                        // Since we iterate date DESC, the first one we see is the latest/current one.
                        if (!activeSubs.has(key)) {
                            activeSubs.set(key, t);
                        }
                    }
                });

                const subsArray = Array.from(activeSubs.values());
                const subsTotal = subsArray.reduce((sum, t) => sum + t.totalAmount, 0);

                const formatCurrency = (amount: number) => {
                    return '$' + amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                };

                const subsList = subsArray
                    .map(t => `- ${t.shopName}: ${formatCurrency(t.totalAmount)} (Mensual)`)
                    .join('\n');

                const subsSection = subsArray.length > 0
                    ? `${subsList}\n\n**TOTAL MENSUAL DETECTADO (Suscripciones): ${formatCurrency(subsTotal)}**`
                    : 'No se detectaron suscripciones activas.';

                // --- End Subscriptions ---

                // Format monthly summaries
                const monthlyProjections = summaries.map(s =>
                    `- ${s.month}: Total ${formatCurrency(s.total)} (Pendiente: ${formatCurrency(s.pending)})\n  Principales gastos: ${s.topExpenses}`
                ).join('\n');

                const summary = `
                RESUMEN DE USUARIO:
                
                SUSCRIPCIONES DETECTADAS (Costos Fijos):
                ${subsSection}

                PROYECCIÓN DE GASTOS (Incluye suscripciones y cuotas):
                ${monthlyProjections}

                ESTADO GLOBAL:
                - Total pendiente de pago (global real): ${formatCurrency(pendingTotal)}
                - Deuda total acumulada: ${formatCurrency(debtTotal)}
                
                NOTA: LOS PRECIOS ESTÁN EN PESOS ARGENTINOS.
                FORMATO: "$1.000,00" (PUNTO para miles, COMA para decimales).
                NO CAMBIES ESTE FORMATO EN TU RESPUESTA.
                RESPETA EL TOTAL PRE-CALCULADO DE SUSCRIPCIONES.
                `;

                setContext(summary);

                // Initial greeting
                setMessages([{
                    role: 'assistant',
                    content: 'Hola 👋 Soy tu asistente financiero. He analizado tus gastos y proyecciones para los próximos meses. ¿Qué quieres saber?'
                }]);

            } catch (e) {
                console.error("Failed to load context", e);
            }
        };
        loadContext();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Keep simplified history for context window (last 10 messages)
            const history = [...messages, userMsg].slice(-10);
            const responseText = await ai.chatWithFinance(history, context);

            setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, tuve un error al procesar tu solicitud.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', gap: '1rem' }}>
            <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Sparkles style={{ color: '#8b5cf6' }} /> Asistente IA
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>Pregunta sobre tus gastos, proyecciones o pide consejos.</p>
            </div>

            <div style={{
                flex: 1,
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Messages Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.map((msg, idx) => {
                        const isUser = msg.role === 'user';
                        return (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: isUser ? 'flex-end' : 'flex-start',
                                gap: '0.75rem'
                            }}>
                                {!isUser && (
                                    <div style={{
                                        width: '32px', height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: '#8b5cf6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', flexShrink: 0
                                    }}>
                                        <Bot size={18} />
                                    </div>
                                )}

                                <div style={{
                                    maxWidth: '80%',
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    borderTopLeftRadius: isUser ? '1rem' : '0',
                                    borderTopRightRadius: isUser ? '0' : '1rem',
                                    backgroundColor: isUser ? 'var(--primary)' : 'var(--background)',
                                    color: isUser ? 'white' : 'var(--text-main)',
                                    border: isUser ? 'none' : '1px solid var(--border)',
                                    lineHeight: '1.5',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {msg.content}
                                </div>

                                {isUser && (
                                    <div style={{
                                        width: '32px', height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', flexShrink: 0
                                    }}>
                                        <UserIcon size={18} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginLeft: '3rem' }}>
                            <Loader2 size={16} className="animate-spin" />
                            <span style={{ fontSize: '0.875rem' }}>Escribiendo...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{
                    padding: '1rem',
                    borderTop: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    display: 'flex',
                    gap: '0.75rem'
                }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe tu pregunta... (ej: ¿Cuánto gasté este mes?)"
                        style={{
                            flex: 1,
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface)',
                            color: 'var(--text-main)',
                            outline: 'none',
                            fontSize: '0.9375rem'
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '48px',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
