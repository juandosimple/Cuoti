import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export const getDb = async (): Promise<Database> => {
    if (dbInstance) return dbInstance;

    dbInstance = await Database.load('sqlite:cuoti.db');

    // Initialize Tables
    await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            avatar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            date DATETIME NOT NULL,
            shop_name TEXT NOT NULL,
            total_amount REAL NOT NULL,
            currency TEXT DEFAULT 'ARS',
            status TEXT DEFAULT 'completed',
            is_debt INTEGER DEFAULT 0,
            debt_to TEXT,
            type TEXT DEFAULT 'purchase',
            is_recurring INTEGER DEFAULT 0,
            group_id TEXT, 
            tag_id INTEGER,
            payment_date DATETIME, -- Added for alerts
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER DEFAULT 1,
            link TEXT,
            image_url TEXT,
            is_debt INTEGER DEFAULT 0,
            debt_to TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(transaction_id) REFERENCES transactions(id)
        );
    `);

    // Tags Table
    await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT NOT NULL
        );
    `);

    // Transaction Tags (Many-to-Many)
    await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS transaction_tags (
            transaction_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (transaction_id, tag_id),
            FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
            FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
    `);

    // Wishlist Tables
    await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS wishlist_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            link TEXT,
            image_url TEXT,
            priority INTEGER DEFAULT 0,
            tags TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS wishlist_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER,
            installments INTEGER NOT NULL,
            interest_rate REAL DEFAULT 0,
            total_amount REAL NOT NULL, 
            description TEXT,
            is_recommended INTEGER DEFAULT 0,
            FOREIGN KEY(item_id) REFERENCES wishlist_items(id) ON DELETE CASCADE
        );
    `);

    // Wishlist Tags (Many-to-Many)
    await dbInstance.execute(`
        CREATE TABLE IF NOT EXISTS wishlist_item_tags (
            item_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (item_id, tag_id),
            FOREIGN KEY(item_id) REFERENCES wishlist_items(id) ON DELETE CASCADE,
            FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
    `);

    // Migrations 
    try { await dbInstance.execute("ALTER TABLE items ADD COLUMN debt_to TEXT"); } catch (e) { }
    try { await dbInstance.execute("ALTER TABLE transactions ADD COLUMN is_debt INTEGER DEFAULT 0"); } catch (e) { }
    try { await dbInstance.execute("ALTER TABLE transactions ADD COLUMN debt_to TEXT"); } catch (e) { }
    try { await dbInstance.execute("ALTER TABLE transactions ADD COLUMN type TEXT DEFAULT 'purchase'"); } catch (e) { }
    try { await dbInstance.execute("ALTER TABLE transactions ADD COLUMN is_recurring INTEGER DEFAULT 0"); } catch (e) { }
    try { await dbInstance.execute("ALTER TABLE transactions ADD COLUMN group_id TEXT"); } catch (e) { }
    try { await dbInstance.execute("ALTER TABLE transactions ADD COLUMN tag_id INTEGER"); } catch (e) { }
    try { await dbInstance.execute("ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'completed'"); } catch (e) { }
    try { await dbInstance.execute("ALTER TABLE transactions ADD COLUMN payment_date DATETIME"); } catch (e) { }
    try { await dbInstance.execute("ALTER TABLE transactions ADD COLUMN recurrence_end_date DATETIME"); } catch (e) { } // New migration

    return dbInstance;
};

export const initDb = getDb;
export const db = getDb();
