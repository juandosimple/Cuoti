import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export function UpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
    const [version, setVersion] = useState<string>('');

    // Verify update status on mount
    useEffect(() => {
        async function checkForUpdates() {
            try {
                const update = await check();
                if (update?.available) {
                    setUpdateAvailable(true);
                    setVersion(update.version);
                }
            } catch (error) {
                console.error('Failed to check for updates:', error);
            }
        }

        checkForUpdates();
    }, []);

    async function installUpdate() {
        try {
            // Provide feedback
            const btn = document.getElementById('update-btn');
            if (btn) btn.innerText = 'Bajando...';

            const update = await check();
            if (update?.available) {
                await update.downloadAndInstall();
                await relaunch();
            } else {
                alert('Curioso... parece que ya no hay actualización disponible.');
                setUpdateAvailable(false);
            }
        } catch (error) {
            console.error('Failed to install update:', error);
            alert('Error instalando actualización: ' + error);
            const btn = document.getElementById('update-btn');
            if (btn) btn.innerText = 'Reintentar';
        }
    }

    if (!updateAvailable) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#3b82f6', // bright blue
            color: 'white',
            padding: '1rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600 }}>¡Nueva versión disponible: {version}!</span>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Actualiza ahora para obtener las últimas mejoras.</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                    id="update-btn"
                    onClick={installUpdate}
                    style={{
                        backgroundColor: 'white',
                        color: '#2563eb',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                >
                    Actualizar ahora
                </button>
                <button
                    onClick={() => setUpdateAvailable(false)}
                    style={{
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                    }}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
