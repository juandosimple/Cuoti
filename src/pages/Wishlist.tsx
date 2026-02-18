import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { WishlistItem, WishlistOption, Tag } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, ExternalLink, X, ShoppingBag, Calculator, Filter, Pen } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
import './Wishlist.css';

export const Wishlist = () => {
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [showAddItem, setShowAddItem] = useState(false);
    const [editingItemId, setEditingItemId] = useState<number | null>(null);

    // New Item State
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemLink, setNewItemLink] = useState('');
    const [newItemImage, setNewItemImage] = useState('');
    const [newItemPriority, setNewItemPriority] = useState<number>(0);
    const [newItemTagIds, setNewItemTagIds] = useState<number[]>([]);

    // New Option State (for a specific item)
    const [addingOptionTo, setAddingOptionTo] = useState<number | null>(null);
    const [newOptionInstallments, setNewOptionInstallments] = useState('');
    const [newOptionInterest, setNewOptionInterest] = useState('');

    // Filters
    const [filterPriority, setFilterPriority] = useState<number | null>(null);
    const [filterTagId, setFilterTagId] = useState<number | null>(null);
    const [sortOrder, setSortOrder] = useState<'price-asc' | 'price-desc' | 'priority-desc'>('priority-desc');

    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        type: 'item' | 'option';
        id: number | null;
    }>({ isOpen: false, type: 'item', id: null });

    const fetchData = async () => {
        const [data, tagsData] = await Promise.all([
            api.getWishlist(),
            api.getTags()
        ]);
        setItems(data);
        setTags(tagsData);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Filtered Items ---
    const filteredItems = items
        .filter(item => {
            if (filterPriority !== null && item.priority !== filterPriority) return false;
            if (filterTagId !== null && !item.tagIds?.includes(filterTagId)) return false;
            return true;
        })
        .sort((a, b) => {
            if (sortOrder === 'price-asc') return a.price - b.price;
            if (sortOrder === 'price-desc') return b.price - a.price;
            // priority-desc
            return b.priority - a.priority;
        });

    // --- Item Handlers ---
    const handleAddItem = async () => {
        if (!newItemName || !newItemPrice) return;

        const payload = {
            name: newItemName,
            price: parseFloat(newItemPrice),
            link: newItemLink,
            imageUrl: newItemImage,
            priority: newItemPriority,
            tagIds: newItemTagIds,
            notes: ''
        };

        try {
            if (editingItemId) {
                await api.updateWishlistItem(editingItemId, payload);
            } else {
                await api.addWishlistItem(payload);
            }

            closeForm();
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleEditItemClick = (item: WishlistItem) => {
        setNewItemName(item.name);
        setNewItemPrice(item.price.toString());
        setNewItemLink(item.link || '');
        setNewItemImage(item.imageUrl || '');
        setNewItemPriority(item.priority);
        setNewItemTagIds(item.tagIds || []);
        setEditingItemId(item.id);
        setShowAddItem(true);
    };

    const handleDeleteItemClick = (id: number) => {
        setDeleteConfirmation({ isOpen: true, type: 'item', id });
    };

    const closeForm = () => {
        setShowAddItem(false);
        setEditingItemId(null);
        setNewItemName('');
        setNewItemPrice('');
        setNewItemLink('');
        setNewItemImage('');
        setNewItemPriority(0);
        setNewItemTagIds([]);
    };

    const toggleTagSelection = (tagId: number) => {
        setNewItemTagIds(prev =>
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };

    // --- Option Handlers ---
    const calculateTotal = (price: number, interest: number) => {
        return price * (1 + (interest / 100));
    };

    const handleAddOption = async (item: WishlistItem) => {
        const installments = parseInt(newOptionInstallments);
        const interest = parseFloat(newOptionInterest || '0');

        if (!installments) return;

        const total = calculateTotal(item.price, interest);

        try {
            await api.addWishlistOption(item.id, {
                installments,
                interestRate: interest,
                totalAmount: total,
                description: interest === 0 ? 'Sin interés' : 'Con interés'
            });
            setAddingOptionTo(null);
            setNewOptionInstallments('');
            setNewOptionInterest('');
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteOptionClick = (id: number) => {
        setDeleteConfirmation({ isOpen: true, type: 'option', id });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation.id) return;

        try {
            if (deleteConfirmation.type === 'item') {
                await api.deleteWishlistItem(deleteConfirmation.id);
            } else {
                await api.deleteWishlistOption(deleteConfirmation.id);
            }
            fetchData();
        } catch (error) {
            console.error(error);
        } finally {
            setDeleteConfirmation({ isOpen: false, type: 'item', id: null });
        }
    };

    const getPriorityLabel = (p: number) => {
        if (p === 2) return { label: 'Alta', color: 'var(--danger-text)', bg: 'var(--danger-bg)' };
        if (p === 1) return { label: 'Media', color: 'var(--warning-text)', bg: 'var(--warning-bg)' };
        return { label: 'Baja', color: 'var(--success-text)', bg: 'var(--success-bg)' };
    };



    return (
        <div className="wishlist-page">

            <header className="wishlist-header">
                <div>
                    <h1 className="wishlist-header__title">Lista de Deseos</h1>
                    <p className="wishlist-header__subtitle">Analiza y compara opciones de financiación para tus futuras compras.</p>
                </div>
                <Button onClick={() => setShowAddItem(true)}>
                    <Plus size={18} />
                    <span>Agregar Item</span>
                </Button>
            </header>

            {/* Filters */}
            <div className="wishlist-filters">
                <div className="wishlist-filters__header">
                    <Filter size={16} />
                    <span>Filtros:</span>
                </div>

                <div className="wishlist-filters__grid">
                    <select
                        className="wishlist-select"
                        value={filterPriority ?? ''}
                        onChange={e => setFilterPriority(e.target.value ? parseInt(e.target.value) : null)}
                    >
                        <option value="">Todas las Prioridades</option>
                        <option value="2">Alta</option>
                        <option value="1">Media</option>
                        <option value="0">Baja</option>
                    </select>

                    <select
                        className="wishlist-select"
                        value={filterTagId ?? ''}
                        onChange={e => setFilterTagId(e.target.value ? parseInt(e.target.value) : null)}
                    >
                        <option value="">Todas las Etiquetas</option>
                        {tags.map(tag => (
                            <option key={tag.id} value={tag.id}>{tag.name}</option>
                        ))}
                    </select>

                    <select
                        className="wishlist-select"
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value as any)}
                    >
                        <option value="priority-desc">Prioridad (Alta a Baja)</option>
                        <option value="price-asc">Precio (Menor a Mayor)</option>
                        <option value="price-desc">Precio (Mayor a Menor)</option>
                    </select>
                </div>
            </div>

            {/* Add Item Form */}
            {showAddItem && (
                <div className="wishlist-form-container">
                    <div className="wishlist-form__header">
                        <h3 className="wishlist-form__title">{editingItemId ? 'Editar Deseo' : 'Nuevo Deseo'}</h3>
                        <button onClick={closeForm} className="wishlist-form__close"><X size={20} /></button>
                    </div>

                    <div className="wishlist-form__fields">
                        <Input
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            placeholder="Nombre del producto (ej: Lavarropas Samsung...)"
                        />

                        <Input
                            type="number"
                            value={newItemPrice}
                            onChange={e => setNewItemPrice(e.target.value)}
                            placeholder="Precio ($0.00)"
                        />

                        <Input
                            value={newItemLink}
                            onChange={e => setNewItemLink(e.target.value)}
                            placeholder="Link al producto (https://...)"
                        />

                        {/* Priority Selection */}
                        <div>
                            <label className="wishlist-form__label">Prioridad</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {[0, 1, 2].map(p => {
                                    const { label, color, bg } = getPriorityLabel(p);
                                    const isSelected = newItemPriority === p;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setNewItemPriority(p)}
                                            className="wishlist-priority-btn"
                                            style={{
                                                border: isSelected ? `2px solid ${color}` : '1px solid var(--border)',
                                                backgroundColor: isSelected ? bg : 'var(--background)',
                                                color: isSelected ? color : 'var(--text-muted)',
                                                fontWeight: isSelected ? 700 : 500,
                                            }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tags Selection */}
                        <div>
                            <label className="wishlist-form__label">Etiquetas</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {tags.map(tag => {
                                    const isSelected = newItemTagIds.includes(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            onClick={() => toggleTagSelection(tag.id)}
                                            className="wishlist-tag-btn"
                                            style={{
                                                border: isSelected ? `1px solid ${tag.color}` : '1px solid var(--border)',
                                                backgroundColor: isSelected ? `${tag.color}20` : 'var(--background)',
                                                color: isSelected ? tag.color : 'var(--text-muted)',
                                                fontWeight: isSelected ? 600 : 400,
                                            }}
                                        >
                                            {tag.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="wishlist-form__actions">
                        <Button
                            onClick={handleAddItem}
                            variant="default"
                            style={{ minWidth: '150px' }}
                        >
                            {editingItemId ? 'Actualizar Item' : 'Guardar Item'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Items Grid */}
            <div className="wishlist-grid">
                {filteredItems.map(item => {
                    const priorityStyle = getPriorityLabel(item.priority);
                    return (
                        <div key={item.id} className="wishlist-card">
                            <div className="wishlist-card__priority-badge">
                                <span className="wishlist-card__priority-label" style={{
                                    backgroundColor: priorityStyle.bg,
                                    color: priorityStyle.color,
                                }}>
                                    {priorityStyle.label}
                                </span>
                            </div>

                            {item.imageUrl && (
                                <div className="wishlist-card__image-container">
                                    <img src={item.imageUrl} alt={item.name} className="wishlist-card__image" />
                                </div>
                            )}

                            <div className="wishlist-card__body">
                                <div className="wishlist-card__header">
                                    <div>
                                        <h2 className="wishlist-card__title">{item.name}</h2>
                                        {item.link && (
                                            <a
                                                href={item.link}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (item.link) open(item.link);
                                                }}
                                                className="wishlist-card__link"
                                            >
                                                Ver Producto <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                    <div className="wishlist-card__actions">
                                        <button onClick={() => handleEditItemClick(item)} className="wishlist-icon-btn">
                                            <Pen size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteItemClick(item.id)} className="wishlist-icon-btn">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Tags */}
                                {item.tagIds && item.tagIds.length > 0 && (
                                    <div className="wishlist-card__tags">
                                        {item.tagIds.map(tid => {
                                            const tag = tags.find(t => t.id === tid);
                                            if (!tag) return null;
                                            return (
                                                <span key={tid} className="wishlist-tag" style={{
                                                    backgroundColor: `${tag.color}15`,
                                                    color: tag.color,
                                                    border: `1px solid ${tag.color}40`,
                                                }}>
                                                    {tag.name}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="wishlist-card__price">
                                    ${item.price.toLocaleString('es-AR')} <span className="wishlist-card__price-sub">contado</span>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <h4 className="wishlist-options__title">
                                        <Calculator size={14} /> Opciones de Cuotas
                                    </h4>

                                    <div className="wishlist-options__list">
                                        {item.options.map(opt => {
                                            const monthly = opt.totalAmount / opt.installments;
                                            const difference = opt.totalAmount - item.price;
                                            const percentDiff = ((opt.totalAmount - item.price) / item.price) * 100;

                                            return (
                                                <div key={opt.id} className="wishlist-option">
                                                    <div className="wishlist-option__header">
                                                        <span style={{ fontWeight: 600 }}>{opt.installments} cuotas de ${monthly.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                                                        <button onClick={() => handleDeleteOptionClick(opt.id)} className="wishlist-icon-btn"><X size={14} /></button>
                                                    </div>
                                                    <div className="wishlist-option__details">
                                                        <span>Total: ${opt.totalAmount.toLocaleString('es-AR')}</span>
                                                        <span className={difference > 0 ? "wishlist-option__interest--high" : "wishlist-option__interest--low"}>
                                                            {difference > 0 ? `+${percentDiff.toFixed(1)}% (${opt.interestRate}% Int.)` : 'Sin interés'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {addingOptionTo === item.id ? (
                                        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <Input
                                                    type="number"
                                                    placeholder="Cuotas"
                                                    value={newOptionInstallments}
                                                    onChange={e => setNewOptionInstallments(e.target.value)}
                                                    style={{ width: '80px' }}
                                                />
                                                <Input
                                                    type="number"
                                                    placeholder="% Interés"
                                                    value={newOptionInterest}
                                                    onChange={e => setNewOptionInterest(e.target.value)}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <Button size="sm" onClick={() => handleAddOption(item)} style={{ flex: 1 }}>Guardar</Button>
                                                <Button size="sm" variant="outline" onClick={() => setAddingOptionTo(null)}>Cancelar</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingOptionTo(item.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                color: 'var(--primary)', fontWeight: 500, fontSize: '0.875rem',
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                marginTop: '1rem', padding: '0.5rem 0'
                                            }}
                                        >
                                            <Plus size={16} /> Agregar opción
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredItems.length === 0 && (
                    <div className="wishlist-empty">
                        <ShoppingBag size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>No se encontraron items.</p>
                        <Button variant="outline" onClick={() => setShowAddItem(true)} style={{ marginTop: '1rem' }}>
                            Agregar un Deseo
                        </Button>
                    </div>
                )}
            </div>

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmation.isOpen && (
                <div className="wishlist-modal-overlay" onClick={() => setDeleteConfirmation({ isOpen: false, type: 'item', id: null })}>
                    <div className="wishlist-modal" onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Confirmar Eliminación</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            {deleteConfirmation.type === 'item'
                                ? '¿Estás seguro de que deseas eliminar este item y todas sus opciones?'
                                : '¿Estás seguro de eliminar esta opción de financiación?'}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <Button variant="ghost" onClick={() => setDeleteConfirmation({ isOpen: false, type: 'item', id: null })}>
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
            )}
        </div>
    );
};

