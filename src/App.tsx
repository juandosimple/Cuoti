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

function App() {
    useEffect(() => {
        initDb().catch(console.error);
    }, []);

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
