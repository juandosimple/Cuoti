import { useState, useEffect } from 'react';
import { Moon, Sun, Tag as TagIcon, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { Tag } from '../types';
import { getVersion } from '@tauri-apps/api/app';

export const Settings = () => {
    // Theme State
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    // Tags State
    const [tags, setTags] = useState<Tag[]>([]);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3b82f6'); // Default Blue
    const [checking, setChecking] = useState(false);
    const [appVersion, setAppVersion] = useState('...');

    useEffect(() => {
        // Apply theme
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const fetchTags = async () => {
        try {
            const data = await api.getTags();
            setTags(data);
        } catch (e) {
            console.error("Failed to load tags", e);
        }
    };

    useEffect(() => {
        fetchTags();
        getVersion().then(v => setAppVersion(`v${v}`));
    }, []);

    const toggleTheme = () => {
        setIsDark(!isDark);
    };

    const handleAddTag = async () => {
        if (!newTagName.trim()) return;
        try {
            await api.addTag(newTagName, newTagColor);
            setNewTagName('');
            fetchTags();
        } catch (e) {
            console.error("Failed to add tag", e);
        }
    };

    const handleDeleteTag = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta etiqueta?')) return;
        try {
            await api.deleteTag(id);
            fetchTags();
        } catch (e) {
            console.error("Failed to delete tag", e);
        }
    };

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Configuración</h1>
                <p style={{ color: 'var(--text-muted)' }}>Personaliza tu experiencia</p>
            </div>

            {/* Theme Section */}
            <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow)'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Moon size={20} /> Apariencia
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <span style={{ fontWeight: 500 }}>Modo Oscuro</span>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Cambia entre tema claro y oscuro</p>
                    </div>
                    <button
                        onClick={toggleTheme}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '9999px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--text-main)',
                            cursor: 'pointer'
                        }}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        {isDark ? 'Activar Claro' : 'Activar Oscuro'}
                    </button>
                </div>
            </div>

            {/* Tags Section */}
            <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow)'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TagIcon size={20} /> Etiquetas
                </h2>

                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                placeholder="Nombre de etiqueta (ej. Comida)"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleAddTag} disabled={!newTagName.trim()}>
                            <Plus size={18} /> Agregar
                        </Button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {colors.map(color => (
                            <button
                                key={color}
                                onClick={() => setNewTagColor(color)}
                                style={{
                                    width: '24px', height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: color,
                                    border: newTagColor === color ? '2px solid var(--text-main)' : '2px solid transparent',
                                    cursor: 'pointer'
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {tags.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No has creado etiquetas aún.</p>
                    ) : (
                        tags.map(tag => (
                            <div key={tag.id} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '9999px',
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                                border: `1px solid ${tag.color}40`,
                                fontSize: '0.875rem', fontWeight: 500
                            }}>
                                <span>{tag.name}</span>
                                <button
                                    onClick={() => handleDeleteTag(tag.id)}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Updates Section */}
            <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow)'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={20} /> Actualizaciones
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <span style={{ fontWeight: 500 }}>Versión de la App</span>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{appVersion}</p>
                    </div>
                    <Button
                        disabled={checking}
                        onClick={async () => {
                            setChecking(true);
                            try {
                                const { check } = await import('@tauri-apps/plugin-updater');
                                const { relaunch } = await import('@tauri-apps/plugin-process');

                                const update = await check();
                                console.log('Update result:', update);

                                if (update?.available) {
                                    if (confirm(`Nueva versión ${update.version} disponible. ¿Actualizar ahora?`)) {
                                        await update.downloadAndInstall();
                                        await relaunch();
                                    }
                                } else {
                                    alert('Ya tienes la última versión (v0.1.5).');
                                }
                            } catch (e) {
                                console.error(e);
                                alert('Error: no se pudo buscar actualizaciones. \n\nAsegúrate de que el Release en GitHub esté "Publicado" y no sea un "Draft".\n\nDetalle: ' + e);
                            } finally {
                                setChecking(false);
                            }
                        }}
                    >
                        {checking ? 'Buscando...' : 'Buscar Actualizaciones'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
