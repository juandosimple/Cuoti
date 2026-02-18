import { useState, useEffect } from 'react';
import { fetch } from '@tauri-apps/plugin-http';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Sparkles, Loader2, ArrowRight, Plus } from 'lucide-react';
import { CreateTransactionDTO } from '../types';

interface SmartEntryProps {
    onParsed: (data: CreateTransactionDTO) => void;
}

export const SmartEntry = ({ onParsed }: SmartEntryProps) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');

    useEffect(() => {
        const getModels = async () => {
            try {
                const res = await fetch('http://localhost:11434/api/tags');
                if (res.ok) {
                    const data = await res.json();
                    const modelNames = data.models.map((m: any) => m.name);
                    setModels(modelNames);
                    if (modelNames.length > 0) setSelectedModel(modelNames[0]);
                }
            } catch (e) {
                console.error("Failed to fetch Ollama models", e);
            }
        };
        getModels();
    }, []);

    const handleParse = async () => {
        if (!input.trim() || !selectedModel) return;
        setLoading(true);

        // Updated prompt for Spanish input AND installments
        const prompt = `
            Actúa como un parser de datos financieros. Extrae los detalles de la transacción del texto: "${input}".
            
            Estructura JSON requerida:
            {
                "shopName": "string",
                "date": "YYYY-MM-DD",
                "totalAmount": number,
                "installments": number, // Default 1. Si dice "6 cuotas", "6 meses", "en cuotas", extraer el número.
                "items": [
                    { "name": "string", "price": number, "quantity": number, "isDebt": boolean }
                ]
            }
            
            Reglas:
            1. Si falta la fecha, usa hoy: ${new Date().toISOString().split('T')[0]}.
            2. "installments" es 1 por defecto salvo que se especifique claramente (ej. "en 12 cuotas", "a 3 meses").
            3. Devuelve SOLO el JSON sin markdown.
        `;

        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    prompt: prompt,
                    stream: false,
                    format: "json"
                })
            });

            const data = await response.json();
            const parsed = JSON.parse(data.response);

            const transaction: CreateTransactionDTO = {
                shopName: parsed.shopName || "Desconocido",
                date: new Date(parsed.date),
                totalAmount: parsed.totalAmount || 0,
                installments: parsed.installments || 1,
                items: parsed.items || [],
                isDebt: false,
                type: 'purchase',
                isRecurring: false,
                tagIds: []
            };

            onParsed(transaction);
            setInput('');
        } catch (error) {
            console.error("AI Parsing failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontWeight: 600, color: 'var(--foreground)' }}>Entrada Inteligente</h3>
                </div>

                <div style={{ position: 'relative' }}>
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        style={{
                            appearance: 'none',
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '0.25rem 2rem 0.25rem 0.75rem',
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                        {models.length === 0 && <option value="">Sin modelos</option>}
                    </select>
                    <div style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: 'var(--text-muted)'
                    }}>
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="ej. iPhone 15 en 12 cuotas de $100" // More descriptive placeholder
                    style={{ flex: 1 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                />
                <Button
                    onClick={handleParse}
                    disabled={loading || !selectedModel}
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> :
                        <>
                            <Plus size={16} style={{ marginRight: '0.5rem' }} />
                            Agregar
                        </>
                    }
                </Button>
            </div>
            {models.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
                    Ollama no detectado.
                </p>
            )}
        </div>
    );
};
