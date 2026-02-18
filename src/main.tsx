import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initDb } from './lib/db'

// Layout wrapper to handle async init if needed, or just fire and forget
const Root = () => {
    useEffect(() => {
        initDb().catch(console.error);
    }, []);

    return <App />;
}

ReactDOM.createRoot(document.getElementById('app')!).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
