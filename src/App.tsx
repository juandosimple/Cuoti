import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Transactions } from './pages/Transactions';
import { Dashboard } from './pages/Dashboard';
import { Reports } from './pages/Reports';
import { Assistant } from './pages/Assistant';
import { Settings } from './pages/Settings';
import { Wishlist } from './pages/Wishlist';
import { initDb } from './lib/db';
import { UpdateChecker } from './components/UpdateChecker';

import { useState } from 'react';
import { Loader } from './components/Loader';

function App() {
    const [isDbReady, setIsDbReady] = useState(false);

    useEffect(() => {
        initDb().then(() => setIsDbReady(true)).catch(console.error);
    }, []);

    if (!isDbReady) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
                <Loader />
            </div>
        );
    }

    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/assistant" element={<Assistant />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
                <UpdateChecker />
            </Layout>
        </Router>
    );
}

export default App;
