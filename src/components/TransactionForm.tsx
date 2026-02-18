import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Trash2, X, ShoppingBag, CalendarClock, Zap, Tag as TagIcon } from 'lucide-react';
import { api } from '../lib/api';
import { CreateTransactionDTO, TransactionType, Tag } from '../types';
import './TransactionForm.css';

// Schema
const itemSchema = z.object({
    name: z.string().min(1, "El nombre del item es requerido"),
    price: z.number().min(0, "El precio debe ser positivo"),
    quantity: z.number().min(1, "La cantidad debe ser al menos 1"),
    link: z.string().optional(),
    imageUrl: z.string().optional(),
});

const transactionSchema = z.object({
    shopName: z.string().min(1, "El nombre es requerido"),
    date: z.string(),
    type: z.enum(['purchase', 'subscription', 'service'] as const).default('purchase'),
    installments: z.number().min(1, "Mínimo 1 cuota").default(1),
    isRecurring: z.boolean().default(false),
    items: z.array(itemSchema).min(1, "Se requiere al menos un item"),
    isDebt: z.boolean().default(false),
    debtTo: z.string().optional(),
    tagIds: z.array(z.number()).default([]),
    paymentDate: z.string().optional(),
    recurrenceEndDate: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

// Currency Input Component
const CurrencyInput = ({ value, onChange, placeholder }: { value: number, onChange: (val: number) => void, placeholder?: string }) => {
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        if (value !== undefined && value !== null) {
            const formatted = new Intl.NumberFormat('es-AR').format(value);
            setInputValue(formatted);
        } else {
            setInputValue("");
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const digits = raw.replace(/[^\d]/g, '');
        const intVal = digits ? parseInt(digits, 10) : 0;
        onChange(intVal);
    };

    return (
        <Input
            value={inputValue}
            onChange={handleChange}
            placeholder={placeholder}
            style={{ textAlign: 'right' }}
        />
    );
};

interface TransactionFormProps {
    initialData?: Partial<CreateTransactionDTO>;
    editingTransactionId?: number;
    onClose: () => void;
    onSuccess: () => void;
}

export const TransactionForm = ({ initialData, editingTransactionId, onClose, onSuccess }: TransactionFormProps) => {
    const { register, control, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            type: 'purchase',
            installments: 1,
            isRecurring: false,
            items: [{ name: '', price: 0, quantity: 1 }],
            isDebt: false,
            debtTo: '',
            paymentDate: '',
            recurrenceEndDate: '',
            tagIds: [],
        }
    });

    const [tags, setTags] = useState<Tag[]>([]);

    useEffect(() => {
        const loadTags = async () => {
            try {
                const data = await api.getTags();
                setTags(data);
            } catch (e) {
                console.error("Failed to load tags", e);
            }
        };
        loadTags();
    }, []);

    useEffect(() => {
        if (initialData) {
            reset({
                shopName: initialData.shopName || '',
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                type: initialData.type || 'purchase',
                installments: initialData.installments || 1,
                isRecurring: initialData.isRecurring || false,
                isDebt: initialData.isDebt || false,
                debtTo: initialData.debtTo || '',
                tagIds: initialData.tagIds || [],
                paymentDate: initialData.paymentDate ? new Date(initialData.paymentDate).toISOString().split('T')[0] : '',
                recurrenceEndDate: initialData.recurrenceEndDate ? new Date(initialData.recurrenceEndDate).toISOString().split('T')[0] : '',
                items: initialData.items && initialData.items.length > 0
                    ? initialData.items.map(i => ({
                        name: i.name,
                        price: i.price,
                        quantity: i.quantity,
                        link: i.link || '',
                        imageUrl: i.imageUrl || ''
                    }))
                    : [{ name: '', price: 0, quantity: 1 }]
            });
        }
    }, [initialData, reset]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const items = watch('items');
    const transactionType = watch('type');
    const shopName = watch('shopName');
    const selectedTagIds = watch('tagIds') || [];

    // Calculate total amount here, before onSubmit
    const totalAmount = items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0;

    // Auto-update first item name for Subscription/Service to match shop name
    useEffect(() => {
    }, [shopName, transactionType]);

    const onSubmit = async (data: TransactionFormValues) => {
        try {
            // Refine data based on Type
            const finalItems = data.items.map(item => ({ ...item }));

            // If Sub/Service, ensure item name matches shop name if empty
            if (data.type !== 'purchase') {
                finalItems[0].name = data.shopName; // Force single item name to match
                // We only take the first item
                finalItems.splice(1);
            }

            const payload: CreateTransactionDTO = {
                date: new Date(data.date),
                shopName: data.shopName,
                totalAmount: data.type === 'purchase' ? (editingTransactionId ? totalAmount : totalAmount) : finalItems[0].price,
                type: data.type,
                installments: data.type === 'purchase' ? data.installments : 1,
                isRecurring: (data.type === 'subscription' || data.type === 'service') ? data.isRecurring : false,
                isDebt: data.type === 'purchase' ? data.isDebt : false,
                debtTo: data.type === 'purchase' ? data.debtTo : undefined,
                tagIds: data.tagIds,
                paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
                recurrenceEndDate: data.isRecurring && data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : undefined,
                items: finalItems,
            };

            if (editingTransactionId) {
                // When editing, we treat it as a single update, not re-generating installments
                await api.updateTransaction(editingTransactionId, payload);
            } else {
                await api.addTransaction(payload);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to save transaction", error);
        }
    };

    return (
        <div className="transaction-form-overlay">
            <div className="transaction-form">
                <div className="transaction-form__header">
                    <h2 className="transaction-form__title">
                        {editingTransactionId ? 'Editar Transacción' : (initialData ? 'Confirmar Transacción' : 'Nueva Transacción')}
                    </h2>
                    <button type="button" onClick={onClose} className="transaction-form__close">
                        <X size={24} />
                    </button>
                </div>

                <form className="transaction-form__body">

                    {/* Header: Date & Type Selection */}
                    <div className="transaction-form__section-grid transaction-form__section-grid--3-cols" style={{ gridTemplateColumns: '1fr 1fr 1.5fr', display: 'grid', gap: '1rem' }}>
                        <div className="transaction-form__field">
                            <label className="transaction-form__label">Fecha de Compra</label>
                            <Input type="date" {...register('date')} />
                        </div>

                        <div className="transaction-form__field">
                            <label className="transaction-form__label" title="Fecha límite de pago, cierre de tarjeta, etc.">
                                📅 Pagar El:
                            </label>
                            <Input type="date" {...register('paymentDate')} />
                        </div>

                        <div className="transaction-form__field">
                            <label className="transaction-form__label">Tipo de Gasto</label>
                            <div className="transaction-form__type-toggle">
                                {[
                                    { id: 'purchase', label: 'Compra', icon: ShoppingBag },
                                    { id: 'subscription', label: 'Suscripción', icon: CalendarClock },
                                    { id: 'service', label: 'Servicio', icon: Zap }
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setValue('type', type.id as any)}
                                        className={`transaction-form__type-btn ${transactionType === type.id ? 'transaction-form__type-btn--active' : ''}`}
                                    >
                                        <type.icon size={14} />
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Common Fields: Name & (Installments or Price depending on type) */}
                    <div className={`transaction-form__section-grid ${transactionType === 'purchase' ? 'transaction-form__section-grid--3-1' : ''}`}>
                        <div className="transaction-form__field">
                            <label className="transaction-form__label">Nombre</label>
                            <Input {...register('shopName')} placeholder="ej. Supermercado o Netflix" autoFocus />
                            {errors.shopName && <span className="transaction-form__error">{errors.shopName.message}</span>}
                        </div>

                        {/* Installments - Only for Purchase, and NOT when editing (complex to re-calculate) */}
                        {transactionType === 'purchase' && !editingTransactionId && (
                            <div className="transaction-form__field">
                                <label className="transaction-form__label">Cuotas</label>
                                <Input
                                    type="number"
                                    {...register('installments', { valueAsNumber: true })}
                                    min={1}
                                    placeholder="1"
                                />
                            </div>
                        )}
                    </div>

                    {/* Tags Selection */}
                    <div className="transaction-form__field">
                        <label className="transaction-form__label">
                            <TagIcon size={14} /> Etiquetas
                        </label>
                        <div className="transaction-form__tags">
                            {tags.length === 0 ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No hay etiquetas creadas. Ve a Configuración para crear una.</span>
                            ) : (
                                tags.map(tag => {
                                    const isSelected = selectedTagIds?.includes(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => {
                                                const currentIds = selectedTagIds || [];
                                                if (isSelected) {
                                                    setValue('tagIds', currentIds.filter(id => id !== tag.id));
                                                } else {
                                                    setValue('tagIds', [...currentIds, tag.id]);
                                                }
                                            }}
                                            className="transaction-form__tag-btn"
                                            style={{
                                                backgroundColor: isSelected ? tag.color : 'transparent',
                                                color: isSelected ? 'white' : tag.color,
                                                border: `1px solid ${tag.color}`,
                                                opacity: isSelected ? 1 : 0.6 // Slightly higher opacity for unselected
                                            }}
                                        >
                                            {tag.name}
                                            {isSelected && <X size={12} />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* === PURCHASE MODE: ITEMS & DEBT === */}
                    {transactionType === 'purchase' && (
                        <div className="transaction-form__field">
                            <div className="transaction-form__items-header">
                                <h3 className="transaction-form__items-title">Items</h3>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price: 0, quantity: 1 })} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Plus size={14} /> Agregar Item
                                </Button>
                            </div>

                            {/* List Headers */}
                            <div className="transaction-form__items-grid-header">
                                <div>Item / Link</div>
                                <div>Precio</div>
                                <div style={{ textAlign: 'center' }}>Cant.</div>
                                <div></div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="transaction-form__item-row">
                                        {/* Name & Link */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <Input {...register(`items.${index}.name`)} placeholder="Nombre del item" />
                                            <Input {...register(`items.${index}.link`)} placeholder="Link (opcional)" style={{ fontSize: '0.75rem', height: '2rem' }} />
                                        </div>

                                        {/* Price */}
                                        <div>
                                            <Controller
                                                control={control}
                                                name={`items.${index}.price`}
                                                render={({ field: { onChange, value } }) => (
                                                    <CurrencyInput
                                                        value={value}
                                                        onChange={onChange}
                                                        placeholder="Precio"
                                                    />
                                                )}
                                            />
                                        </div>

                                        {/* Quantity */}
                                        <div>
                                            <Input
                                                type="number"
                                                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                                placeholder="Cant"
                                                min={1}
                                                style={{ textAlign: 'center' }}
                                            />
                                        </div>

                                        {/* Delete */}
                                        <button type="button" onClick={() => remove(index)} className="transaction-form__delete-item">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* === SUBSCRIPTION / SERVICE MODE: SINGLE PRICE === */}
                    {transactionType !== 'purchase' && (
                        <div className="transaction-form__field">
                            <label className="transaction-form__label">Precio</label>
                            <Controller
                                control={control}
                                name={`items.0.price`}
                                render={({ field: { onChange, value } }) => (
                                    <CurrencyInput
                                        value={value}
                                        onChange={onChange}
                                        placeholder="0.00"
                                    />
                                )}
                            />
                            {/* Hidden quantity input to ensure it defaults to 1 */}
                            <input type="hidden" {...register(`items.0.quantity`, { valueAsNumber: true })} value={1} />
                            {/* Hidden name input, we populate it on submit */}
                            <input type="hidden" {...register(`items.0.name`)} value={shopName} />
                        </div>
                    )}

                </form>

                <div className="transaction-form__footer">
                    {/* Debt Checkbox Section (Only for Purchase) */}
                    {transactionType === 'purchase' && (
                        <div className="transaction-form__checkbox-wrapper" style={{ backgroundColor: '#fdf2f8', borderColor: '#fce7f3', borderStyle: 'solid', borderWidth: '1px' }}>
                            <label className="transaction-form__checkbox-label" style={{ color: '#be185d' }}>
                                <input type="checkbox" {...register('isDebt')} style={{ width: '1rem', height: '1rem' }} />
                                ¿Es una Deuda?
                            </label>
                            {watch('isDebt') && (
                                <Input
                                    {...register('debtTo')}
                                    placeholder="¿A quién le debes? (Opcional)"
                                    style={{ flex: 1, backgroundColor: 'white', borderColor: '#fbcfe8' }}
                                />
                            )}
                        </div>
                    )}

                    {/* Recurring Checkbox (For Subscription AND Service) */}
                    {(transactionType === 'subscription' || transactionType === 'service') && (
                        <div className="transaction-form__checkbox-wrapper" style={{ backgroundColor: 'var(--secondary)' }}>
                            <label className="transaction-form__checkbox-label">
                                <input type="checkbox" {...register('isRecurring')} style={{ width: '1rem', height: '1rem' }} />
                                Transacción Recurrente (Mensual)
                            </label>
                            {watch('isRecurring') && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <label className="transaction-form__label" style={{ fontSize: '0.75rem' }}>Hasta (Opcional):</label>
                                    <Input type="date" {...register('recurrenceEndDate')} style={{ backgroundColor: 'white' }} />
                                </div>
                            )}
                        </div>
                    )}


                    <div className="transaction-form__total">
                        <div style={{ fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Monto Total:</span>
                            <span className="transaction-form__total-amount">
                                ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                {watch('type') === 'purchase' && watch('installments') > 1 && (
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>
                                        (${(totalAmount / watch('installments')).toLocaleString('es-AR', { minimumFractionDigits: 2 })} / mes)
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="transaction-form__actions">
                            <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
                            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                                {isSubmitting ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
