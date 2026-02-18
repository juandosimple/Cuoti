import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export function UpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
    const [version, setVersion] = useState<string>('');

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
            const update = await check();
            if (update?.available) {
                await update.downloadAndInstall();
                await relaunch();
            }
        } catch (error) {
            console.error('Failed to install update:', error);
        }
    }

    if (!updateAvailable) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 flex items-center gap-4">
            <div>
                <p className="font-medium">New version available: {version}</p>
                <p className="text-sm opacity-80">Update now to get the latest features.</p>
            </div>
            <button
                onClick={installUpdate}
                className="bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-opacity-90 transition-colors"
            >
                Update Now
            </button>
            <button
                onClick={() => setUpdateAvailable(false)}
                className="text-white hover:bg-blue-700 p-2 rounded"
            >
                ✕
            </button>
        </div>
    );
}
