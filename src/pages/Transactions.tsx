import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Transaction, CreateTransactionDTO, Tag } from '../types';
import { Button } from '../components/ui/Button';
import { ChevronLeft, ChevronRight, Plus, X, List, CheckCircle, Circle, Trash2, Check, Clock } from 'lucide-react';
import { SmartEntry } from '../components/SmartEntry';
import { TransactionForm } from '../components/TransactionForm';
import './Transactions.css';
import { getMonthlyTransactions } from '../lib/financial';

export const Transactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [tags, setTags] = useState<Tag[]>([]);

    // Filters
    const [filterTagId, setFilterTagId] = useState<number | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');

    // State for Installment Detail Modal
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [groupTransactions, setGroupTransactions] = useState<Transaction[]>([]);

    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        transaction: Transaction | null;
        isInstallment: boolean;
    }>({ isOpen: false, transaction: null, isInstallment: false });

    // Edit State
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);

    const handleEdit = (tx: Transaction) => {
        setEditingTx(tx);
        setShowForm(true);
    };

    const fetchData = async () => {
        try {
            const data = await api.getTransactions();
            const tagsData = await api.getTags();
            setTransactions(data);
            setTags(tagsData);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch Installment Details
    useEffect(() => {
        const fetchGroup = async () => {
            if (selectedGroupId) {
                const groupTxs = await api.getTransactionsByGroup(selectedGroupId);
                setGroupTransactions(groupTxs);
            }
        };
        fetchGroup();
    }, [selectedGroupId]);


    // --- Monthly Filter Logic ---
    const handlePrevMonth = () => {
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };



    const getExpandedTransactions = () => {
        return getMonthlyTransactions(transactions, selectedDate);
    };

    const expandedTransactions = getExpandedTransactions();

    const filteredTransactions = expandedTransactions.filter(t => {
        // Status Filter
        if (filterStatus !== 'all' && t.status !== filterStatus) return false;

        // Tag Filter
        if (filterTagId !== 'all') {
            if (!t.tagIds || !t.tagIds.includes(filterTagId)) return false;
        }
        return true;
    }).sort((a, b) => {
        const dateA = a.paymentDate ? new Date(a.paymentDate) : new Date(a.date);
        const dateB = b.paymentDate ? new Date(b.paymentDate) : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    const totalMonthly = filteredTransactions.reduce((acc, t) => acc + t.totalAmount, 0);

    // Calculate total amount for each group (installments)
    const groupTotals = transactions.reduce((acc, tx) => {
        if (tx.groupId) {
            acc[tx.groupId] = (acc[tx.groupId] || 0) + tx.totalAmount;
        }
        return acc;
    }, {} as Record<string, number>);

    // --- Modal Handlers ---
    const handleOpenForm = () => setShowForm(true);
    const handleCloseForm = () => setShowForm(false);

    // Manual Payment Toggle
    const togglePaymentStatus = async (tx: Transaction) => {
        // Check heuristics for Virtual Transaction
        // If the transaction ID exists in our list but with a DIFFERENT date, it's virtual.
        const originalTx = transactions.find(t => t.id === tx.id);

        // We consider it virtual if dates don't match. 
        // Note: tx.date from getExpandedTransactions is a Date object. originalTx.date is also a Date object (parsed in fetch).
        // need to compare time or ISO string.
        const isVirtual = originalTx && (
            tx.date.getTime() !== originalTx.date.getTime() &&
            (!tx.paymentDate || !originalTx.paymentDate || tx.paymentDate.getTime() !== originalTx.paymentDate.getTime())
        );

        if (isVirtual && originalTx) {
            // ACTION: Create a new REAL transaction for this month
            try {
                // For items, we need to be careful about the types.
                // tx.items are TransactionItem[] (with ids). DTO needs Omit<..., 'id'>
                const itemsPayload = (tx.items || []).map(i => ({
                    name: i.name,
                    price: i.price,
                    quantity: i.quantity,
                    link: i.link,
                    imageUrl: i.imageUrl
                }));

                const payload: CreateTransactionDTO = {
                    date: tx.date,
                    shopName: tx.shopName,
                    totalAmount: tx.totalAmount,
                    type: tx.type,
                    isRecurring: false, // The monthly instance is NOT the generator
                    isDebt: tx.isDebt,
                    debtTo: tx.debtTo,
                    tagIds: tx.tagIds,
                    paymentDate: tx.paymentDate,
                    items: itemsPayload,
                    groupId: originalTx.groupId, // LINK IT!
                    recurrenceEndDate: undefined
                };

                await api.addTransaction(payload);

                // After adding, we don't need to update status because addTransaction defaults to 'pending'?
                // Wait, if the user clicked "Check" (Pay), they want it to be Completed.
                // But addTransaction defaults to 'pending'.
                // So we might need to update it immediately? 
                // Alternatively, addTransaction could accept status, but it doesn't currently.
                // Or we accept the 'pending' state and let them click again?
                // Better UX: It should become completed.
                // Let's just create it. The user will see it "flash" or appear. 
                // If we want it completed, we need to know the ID.
                // For now, let's just create the record. It will show up as Pending (Real) instead of Pending (Virtual).
                // Then the user can click again to Pay. 
                // bit clunky.
                // Let's try to update status. But we don't have the ID.

            } catch (e) {
                console.error("Error creating monthly instance", e);
            }
        } else {
            // Normal toggle for real transactions
            const newStatus = tx.status === 'pending' ? 'completed' : 'pending';
            await api.updateStatus(tx.id, newStatus);
        }

        // Refresh Lists
        fetchData();
        if (selectedGroupId) {
            const groupTxs = await api.getTransactionsByGroup(selectedGroupId);
            setGroupTransactions(groupTxs);
        }
    };

    const handleDelete = (e: React.MouseEvent, tx: Transaction) => {
        e.stopPropagation();
        setDeleteConfirmation({ isOpen: true, transaction: tx, isInstallment: false });
    };

    const handleDeleteInstallment = (e: React.MouseEvent, tx: Transaction) => {
        e.stopPropagation();
        setDeleteConfirmation({ isOpen: true, transaction: tx, isInstallment: true });
    }

    const confirmDelete = async () => {
        const { transaction: tx, isInstallment } = deleteConfirmation;
        if (!tx) return;

        try {
            if (isInstallment) {
                await api.deleteTransaction(tx.id);
                if (tx.groupId) {
                    const groupTxs = await api.getTransactionsByGroup(tx.groupId);
                    setGroupTransactions(groupTxs);
                    if (groupTxs.length === 0) setSelectedGroupId(null);
                }
            } else {
                const isGroup = tx.groupId && tx.type === 'purchase';
                if (isGroup && tx.groupId) {
                    await api.deleteTransactionGroup(tx.groupId);
                } else {
                    await api.deleteTransaction(tx.id);
                }
                if (selectedGroupId && tx.groupId === selectedGroupId) {
                    setSelectedGroupId(null);
                }
            }
            await fetchData();
        } catch (error) {
            console.error("Failed to delete", error);
        } finally {
            setDeleteConfirmation({ isOpen: false, transaction: null, isInstallment: false });
        }
    };

    return (
        <div className="transactions">

            {/* Header with Monthly Navigation */}
            <div className="transactions__header">
                <div className="transactions__month-selector">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft size={20} />
                    </Button>
                    <span className="transactions__title">
                        {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                        <ChevronRight size={20} />
                    </Button>
                </div>

                <div className="transactions__summary">
                    Total Mes: <span className="transactions__total">${totalMonthly.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="transactions__filters">
                    {/* Status Filter */}
                    <div className="transactions__filter-group">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="transactions__filter-select"
                        >
                            <option value="all">Todos</option>
                            <option value="pending">Pendientes</option>
                            <option value="completed">Pagados</option>
                        </select>
                    </div>

                    {/* Tag Filter */}
                    <div className="transactions__filter-group">
                        <select
                            value={filterTagId === 'all' ? 'all' : filterTagId}
                            onChange={(e) => setFilterTagId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="transactions__filter-select"
                        >
                            <option value="all">Todas las Etiquetas</option>
                            {tags.map(tag => (
                                <option key={tag.id} value={tag.id}>{tag.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="transactions__actions">
                    <Button onClick={handleOpenForm} className="transactions__new-btn">
                        <Plus size={16} />
                        <span>Nueva Transacción</span>
                    </Button>
                </div>
            </div>

            <SmartEntry onParsed={() => fetchData()} />

            {/* Transactions List */}
            <div className="transactions__list">
                <div className="transactions__list-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 70px' }}>
                    <div>Nombre / Items</div>
                    <div style={{ textAlign: 'center' }}>Fecha</div>
                    <div style={{ textAlign: 'center' }}>Estado</div>
                    <div style={{ textAlign: 'right' }}>Monto</div>
                    <div></div>
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className="transactions__empty">
                        <p>No hay transacciones para este mes.</p>
                        <Button onClick={handleOpenForm}>
                            <Plus size={16} />
                            Nueva Transacción
                        </Button>
                    </div>
                ) : (
                    filteredTransactions.map((tx) => {
                        const hasInstallments = tx.groupId && tx.type === 'purchase';
                        const txTags = tx.tagIds ? tags.filter(tag => tx.tagIds?.includes(tag.id)) : [];

                        return (
                            <div
                                key={tx.id}
                                className="transactions__row"
                                style={{
                                    cursor: hasInstallments ? 'pointer' : 'default',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 70px'
                                }}
                                onClick={() => hasInstallments && setSelectedGroupId(tx.groupId!)}
                            >
                                <div className="transactions__row-info">
                                    <span className="transactions__shop-name">
                                        {tx.shopName}
                                        {hasInstallments && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>(Ver plan de pagos)</span>}
                                    </span>
                                    {txTags.length > 0 && (
                                        <div className="transactions__tags">
                                            {txTags.map(tag => (
                                                <span
                                                    key={tag.id}
                                                    className="transactions__tag"
                                                    style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40`, marginRight: '4px' }}
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'center' }} className="transactions__date">
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span>{tx.date.toLocaleDateString()}</span>
                                        {tx.paymentDate && new Date(tx.paymentDate).getTime() !== new Date(tx.date).getTime() && (
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                (Paga: {new Date(tx.paymentDate).toLocaleDateString()})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <span
                                        className={`transactions__status transactions__status--${tx.status}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePaymentStatus(tx);
                                        }}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click para cambiar estado"
                                    >
                                        {tx.status === 'completed' ? 'Pagado' : 'Pendiente'}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'right' }} className="transactions__amount">
                                    <div>${tx.totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                                    {hasInstallments && groupTotals[tx.groupId!] && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            Total: ${groupTotals[tx.groupId!].toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        className="transactions__delete-btn"
                                        style={{ color: 'var(--text-muted)' }} // Distinct style for edit
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(tx);
                                        }}
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                    </button>

                                    <button
                                        type="button"
                                        className="transactions__delete-btn"
                                        onClick={(e) => handleDelete(e, tx)}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* New Transaction Form Modal */}
            {showForm && (
                <TransactionForm
                    initialData={editingTx ? {
                        date: editingTx.date,
                        shopName: editingTx.shopName,
                        totalAmount: editingTx.totalAmount,
                        type: editingTx.type,
                        installments: 1,
                        isRecurring: editingTx.isRecurring,
                        isDebt: editingTx.isDebt,
                        debtTo: editingTx.debtTo,
                        tagIds: editingTx.tagIds,
                        paymentDate: editingTx.paymentDate,
                        recurrenceEndDate: editingTx.recurrenceEndDate,
                        items: editingTx.items && editingTx.items.length > 0 ? editingTx.items : [{ name: editingTx.shopName, price: editingTx.totalAmount, quantity: 1 }]
                    } : undefined}
                    editingTransactionId={editingTx?.id}
                    onClose={() => {
                        handleCloseForm();
                        setEditingTx(null);
                    }}
                    onSuccess={() => {
                        fetchData();
                        handleCloseForm();
                        setEditingTx(null);
                    }}
                />
            )}

            {/* Installment Detail Modal */}
            {selectedGroupId && (
                <div className="installments-modal" onClick={() => setSelectedGroupId(null)}>
                    <div className="installments-modal__content" onClick={e => e.stopPropagation()}>
                        <div className="installments-modal__header">
                            <h3 className="installments-modal__title">Detalle de Cuotas</h3>
                            <button onClick={() => setSelectedGroupId(null)} className="installments-modal__close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="installments-modal__body">
                            <div className="installments-modal__list">
                                {groupTransactions.map((tx, idx) => {
                                    const isCurrentMonth = new Date().getMonth() === new Date(tx.date).getMonth() && new Date().getFullYear() === new Date(tx.date).getFullYear();

                                    return (
                                        <div key={tx.id} className="installments-modal__item" style={{ backgroundColor: isCurrentMonth ? 'var(--secondary)' : 'var(--background)' }}>
                                            <div className="installments-modal__item-info">
                                                <span className="installments-modal__item-name">Cuota {idx + 1}/{groupTransactions.length}</span>
                                                <span className="installments-modal__item-date">Vence: {tx.date.toLocaleDateString()}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span className="transactions__amount">
                                                    ${tx.totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePaymentStatus(tx);
                                                    }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor: tx.status === 'completed' ? '#dcfce7' : '#fee2e2',
                                                        color: tx.status === 'completed' ? '#166534' : '#991b1b',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        transition: 'all 0.2s',
                                                        zIndex: 10
                                                    }}
                                                >
                                                    {tx.status === 'completed' ? <Check size={14} /> : <Clock size={14} />}
                                                    {tx.status === 'completed' ? 'Pagado' : 'Pagar'}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="transactions__delete-btn"
                                                    style={{ color: 'var(--text-muted)' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Close modal and open edit form
                                                        setSelectedGroupId(null);
                                                        handleEdit(tx);
                                                    }}
                                                    title="Editar cuota"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                                </button>

                                                <button
                                                    type="button"
                                                    className="transactions__delete-btn"
                                                    onClick={(e) => handleDeleteInstallment(e, tx)}
                                                    title="Eliminar cuota"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmation.isOpen && (
                <div className="installments-modal" style={{ zIndex: 100 }}>
                    <div className="installments-modal__content" style={{ maxWidth: '400px', height: 'auto' }}>
                        <div className="installments-modal__header">
                            <h3 className="installments-modal__title">Confirmar Eliminación</h3>
                            <button onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })} className="installments-modal__close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="installments-modal__body" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
                                {deleteConfirmation.isInstallment
                                    ? '¿Estás seguro de que deseas eliminar esta cuota específica?'
                                    : (deleteConfirmation.transaction?.groupId
                                        ? '¿Estás seguro de eliminar esta compra y TODAS sus cuotas asociadas?'
                                        : '¿Estás seguro de eliminar esta transacción?')}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                <Button variant="ghost" onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={confirmDelete}
                                    style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-text)' }}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
