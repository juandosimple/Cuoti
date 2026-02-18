import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, PieChart, Settings, LogOut, Sparkles, Heart } from 'lucide-react';
import logo from '../assets/logo_cuoti.svg';

import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';

const SidebarItem = ({ icon: Icon, label, path, active }: { icon: any, label: string, path: string, active: boolean }) => (
    <Link
        to={path}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            textDecoration: 'none',
            color: active ? 'var(--primary)' : 'var(--text-muted)',
            backgroundColor: active ? '#eef2ff' : 'transparent',
            fontWeight: active ? 600 : 500,
            marginBottom: '0.5rem',
            transition: 'all 0.2s'
        }}
    >
        <Icon size={20} />
        <span>{label}</span>
    </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const [appVersion, setAppVersion] = useState('');

    useEffect(() => {
        getVersion().then(setAppVersion).catch(console.error);
    }, []);

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--background)' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                backgroundColor: 'var(--surface)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem'
            }}>
                <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src={logo} alt="Cuoti Logo" style={{ width: '40px', height: '40px' }} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Cuoti</span>
                </div>

                <nav style={{ flex: 1 }}>
                    <SidebarItem icon={LayoutDashboard} label="Inicio" path="/" active={location.pathname === '/'} />
                    <SidebarItem icon={Receipt} label="Transacciones" path="/transactions" active={location.pathname === '/transactions'} />
                    <SidebarItem icon={PieChart} label="Reportes" path="/reports" active={location.pathname === '/reports'} />
                    <SidebarItem icon={Heart} label="Wishlist" path="/wishlist" active={location.pathname === '/wishlist'} />
                    <SidebarItem icon={Sparkles} label="Asistente IA" path="/assistant" active={location.pathname === '/assistant'} />
                    <SidebarItem icon={Settings} label="Configuración" path="/settings" active={location.pathname === '/settings'} />
                </nav>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <button style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.5rem', width: '100%',
                        background: 'none', border: 'none',
                        color: 'var(--text-muted)', cursor: 'pointer'
                    }}>
                        <LogOut size={18} />
                        <span>Cerrar Sesión</span>
                    </button>
                    <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                        v{appVersion}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {children}
                </div>
            </main>
        </div>
    );
};
