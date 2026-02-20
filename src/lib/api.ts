import { db } from './db';
import { Transaction, CreateTransactionDTO, TransactionType, Tag, WishlistItem, WishlistOption } from '../types';

export const api = {
    async getTransactions(): Promise<Transaction[]> {
        const database = await db;

        const transactions: any[] = await database.select('SELECT * FROM transactions ORDER BY date DESC');
        const items: any[] = await database.select('SELECT * FROM items');
        const transactionTags: any[] = await database.select('SELECT * FROM transaction_tags');

        // Map items to transactions
        return transactions.map(tx => {
            const txTags = transactionTags.filter(tt => tt.transaction_id === tx.id).map(tt => tt.tag_id);
            return {
                id: tx.id,
                userId: tx.user_id,
                date: new Date(tx.date),
                shopName: tx.shop_name,
                totalAmount: tx.total_amount,
                currency: tx.currency,
                status: tx.status,
                isDebt: Boolean(tx.is_debt),
                debtTo: tx.debt_to,
                type: (tx.type || 'purchase') as TransactionType,
                isRecurring: Boolean(tx.is_recurring),
                groupId: tx.group_id,
                tagIds: txTags, // Changed to tagIds
                paymentDate: tx.payment_date ? new Date(tx.payment_date) : undefined,
                recurrenceEndDate: tx.recurrence_end_date ? new Date(tx.recurrence_end_date) : undefined,
                items: items.filter(item => item.transaction_id === tx.id).map(i => ({
                    id: i.id,
                    transactionId: i.transaction_id,
                    name: i.name,
                    price: i.price,
                    quantity: i.quantity,
                    link: i.link,
                    imageUrl: i.image_url
                })),
                createdAt: new Date(tx.created_at)
            };
        });
    },

    async getTransactionsByGroup(groupId: string): Promise<Transaction[]> {
        const database = await db;
        const transactions: any[] = await database.select('SELECT * FROM transactions WHERE group_id = $1 ORDER BY date ASC', [groupId]);
        const transactionTags: any[] = await database.select('SELECT * FROM transaction_tags');

        return transactions.map(tx => {
            const txTags = transactionTags.filter(tt => tt.transaction_id === tx.id).map(tt => tt.tag_id);
            return {
                id: tx.id,
                userId: tx.user_id,
                date: new Date(tx.date),
                shopName: tx.shop_name,
                totalAmount: tx.total_amount,
                currency: tx.currency,
                status: tx.status,
                isDebt: Boolean(tx.is_debt),
                debtTo: tx.debt_to,
                type: (tx.type || 'purchase') as TransactionType,
                isRecurring: Boolean(tx.is_recurring),
                groupId: tx.group_id,
                tagIds: txTags,
                paymentDate: tx.payment_date ? new Date(tx.payment_date) : undefined,
                recurrenceEndDate: tx.recurrence_end_date ? new Date(tx.recurrence_end_date) : undefined,
                items: [],
                createdAt: new Date(tx.created_at)
            };
        });
    },

    async updateStatus(id: number, status: 'completed' | 'pending'): Promise<void> {
        const database = await db;
        await database.execute('UPDATE transactions SET status = $1 WHERE id = $2', [status, id]);
    },

    async addTransaction(data: CreateTransactionDTO): Promise<void> {
        const database = await db;
        const installments = data.installments && data.installments > 1 ? data.installments : 1;

        const loopCount = data.type === 'purchase' ? installments : 1;
        const groupId = data.groupId || crypto.randomUUID(); // Use provided groupId or generate new

        for (let i = 0; i < loopCount; i++) {
            // Calculate date for this installment
            const date = new Date(data.date);
            date.setMonth(date.getMonth() + i);
            const dateStr = date.toISOString().split('T')[0];

            // Calculate Payment Date (if provided)
            let paymentDateStr = null;
            if (data.paymentDate) {
                const pDate = new Date(data.paymentDate);
                pDate.setMonth(pDate.getMonth() + i);
                paymentDateStr = pDate.toISOString().split('T')[0];
            }

            const status = 'pending';

            // Calculate amounts
            const amountDivisor = loopCount;
            const totalAmount = data.totalAmount / amountDivisor;

            // Prepare Shop Name (e.g. "Shop (1/6)")
            let shopName = data.shopName;
            if (loopCount > 1) {
                shopName = `${data.shopName} (${i + 1}/${loopCount})`;
            }

            // Insert Transaction
            const result = await database.execute(
                'INSERT INTO transactions (date, shop_name, total_amount, is_debt, debt_to, type, is_recurring, group_id, status, payment_date, recurrence_end_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                [
                    dateStr,
                    shopName,
                    totalAmount,
                    data.isDebt ? 1 : 0,
                    data.debtTo || null,
                    data.type,
                    data.isRecurring ? 1 : 0,
                    groupId,
                    status,
                    paymentDateStr,
                    data.recurrenceEndDate ? data.recurrenceEndDate.toISOString().split('T')[0] : null
                ]
            );

            const transactionId = result.lastInsertId;

            // Insert Tags
            if (data.tagIds && data.tagIds.length > 0) {
                for (const tagId of data.tagIds) {
                    await database.execute('INSERT INTO transaction_tags (transaction_id, tag_id) VALUES ($1, $2)', [transactionId, tagId]);
                }
            }

            // Insert Items
            for (const item of data.items) {
                await database.execute(
                    'INSERT INTO items (transaction_id, name, price, quantity, link, image_url) VALUES ($1, $2, $3, $4, $5, $6)',
                    [
                        transactionId,
                        item.name,
                        item.price / amountDivisor,
                        item.quantity,
                        item.link || null,
                        item.imageUrl || null
                    ]
                );
            }
        }
    },
    async updateTransaction(id: number, data: CreateTransactionDTO): Promise<void> {
        const database = await db;

        // Update Transaction
        await database.execute(
            `UPDATE transactions SET 
                date = $1, 
                shop_name = $2, 
                total_amount = $3, 
                is_debt = $4, 
                debt_to = $5, 
                type = $6, 
                is_recurring = $7, 
                payment_date = $8,
                recurrence_end_date = $9
            WHERE id = $10`,
            [
                data.date.toISOString().split('T')[0],
                data.shopName,
                data.totalAmount,
                data.isDebt ? 1 : 0,
                data.debtTo || null,
                data.type,
                data.isRecurring ? 1 : 0,
                data.paymentDate ? data.paymentDate.toISOString().split('T')[0] : null,
                data.recurrenceEndDate ? data.recurrenceEndDate.toISOString().split('T')[0] : null,
                id
            ]
        );

        // Update Tags
        await database.execute('DELETE FROM transaction_tags WHERE transaction_id = $1', [id]);
        if (data.tagIds && data.tagIds.length > 0) {
            for (const tagId of data.tagIds) {
                await database.execute('INSERT INTO transaction_tags (transaction_id, tag_id) VALUES ($1, $2)', [id, tagId]);
            }
        }

        // Replace Items
        await database.execute('DELETE FROM items WHERE transaction_id = $1', [id]);

        for (const item of data.items) {
            await database.execute(
                'INSERT INTO items (transaction_id, name, price, quantity, link, image_url) VALUES ($1, $2, $3, $4, $5, $6)',
                [
                    id,
                    item.name,
                    item.price,
                    item.quantity,
                    item.link || null,
                    item.imageUrl || null
                ]
            );
        }
    },

    // --- Tags ---
    async getTags(): Promise<Tag[]> {
        const database = await db;
        return await database.select('SELECT * FROM tags');
    },

    async addTag(name: string, color: string): Promise<void> {
        const database = await db;
        await database.execute('INSERT INTO tags (name, color) VALUES ($1, $2)', [name, color]);
    },

    async deleteTag(id: number): Promise<void> {
        const database = await db;
        await database.execute('DELETE FROM tags WHERE id = $1', [id]);
        await database.execute('DELETE FROM transaction_tags WHERE tag_id = $1', [id]);
    },

    // --- Deletion ---
    async deleteTransaction(id: number): Promise<void> {
        const database = await db;
        // Delete associated items first
        await database.execute('DELETE FROM items WHERE transaction_id = $1', [id]);
        await database.execute('DELETE FROM transaction_tags WHERE transaction_id = $1', [id]);
        await database.execute('DELETE FROM transactions WHERE id = $1', [id]);
    },

    async deleteTransactionGroup(groupId: string): Promise<void> {
        const database = await db;
        // Get all transaction IDs in the group to delete their items
        const txs = await database.select<Transaction[]>('SELECT id FROM transactions WHERE group_id = $1', [groupId]);
        for (const tx of txs) {
            await database.execute('DELETE FROM items WHERE transaction_id = $1', [tx.id]);
            await database.execute('DELETE FROM transaction_tags WHERE transaction_id = $1', [tx.id]);
        }
        await database.execute('DELETE FROM transactions WHERE group_id = $1', [groupId]);
    },

    // --- Wishlist ---
    async getWishlist(): Promise<WishlistItem[]> {
        const database = await db;
        const items = await database.select<any[]>('SELECT * FROM wishlist_items ORDER BY created_at DESC');
        const itemTags = await database.select<any[]>('SELECT * FROM wishlist_item_tags');

        const result: WishlistItem[] = [];
        for (const item of items) {
            const options = await database.select<any[]>('SELECT * FROM wishlist_options WHERE item_id = $1', [item.id]);
            const tags = itemTags.filter(t => t.item_id === item.id).map(t => t.tag_id);

            result.push({
                id: item.id,
                name: item.name,
                price: item.price,
                link: item.link,
                imageUrl: item.image_url,
                priority: item.priority || 0,
                tagIds: tags,
                notes: item.notes,
                options: options.map(o => ({
                    id: o.id,
                    itemId: o.item_id,
                    installments: o.installments,
                    interestRate: o.interest_rate,
                    totalAmount: o.total_amount,
                    description: o.description
                }))
            });
        }
        return result;
    },

    async addWishlistItem(data: Omit<WishlistItem, 'id' | 'options'>): Promise<number> {
        const database = await db;
        const res = await database.execute(
            'INSERT INTO wishlist_items (name, price, link, image_url, notes, priority) VALUES ($1, $2, $3, $4, $5, $6)',
            [data.name, data.price, data.link, data.imageUrl, data.notes, data.priority || 0]
        );

        const newItemId = res.lastInsertId;

        if (data.tagIds && data.tagIds.length > 0) {
            for (const tagId of data.tagIds) {
                await database.execute('INSERT INTO wishlist_item_tags (item_id, tag_id) VALUES ($1, $2)', [newItemId, tagId]);
            }
        }

        return newItemId as number;
    },

    async updateWishlistItem(id: number, data: Partial<Omit<WishlistItem, 'id' | 'options'>>): Promise<void> {
        const database = await db;

        // Dynamic update query builder could be better, but for now simple fixed update
        // Actually, let's just update fields if provided.
        // Simplest strategy: Update all fields (assuming full object or at least we know what we are doing).
        // But UI might send partials. 
        // Let's assume we pass the full object for simplicity, or handle nulls.
        // Given the use case, we probably want to support updating tags too.

        await database.execute(
            `UPDATE wishlist_items SET 
                name = COALESCE($1, name), 
                price = COALESCE($2, price), 
                link = COALESCE($3, link), 
                image_url = COALESCE($4, image_url), 
                notes = COALESCE($5, notes),
                priority = COALESCE($6, priority)
            WHERE id = $7`,
            [
                data.name ?? null,
                data.price ?? null,
                data.link ?? null,
                data.imageUrl ?? null,
                data.notes ?? null,
                data.priority ?? null,
                id
            ]
        );

        if (data.tagIds) {
            await database.execute('DELETE FROM wishlist_item_tags WHERE item_id = $1', [id]);
            for (const tagId of data.tagIds) {
                await database.execute('INSERT INTO wishlist_item_tags (item_id, tag_id) VALUES ($1, $2)', [id, tagId]);
            }
        }
    },

    async deleteWishlistItem(id: number): Promise<void> {
        const database = await db;
        await database.execute('DELETE FROM wishlist_options WHERE item_id = $1', [id]);
        await database.execute('DELETE FROM wishlist_item_tags WHERE item_id = $1', [id]);
        await database.execute('DELETE FROM wishlist_items WHERE id = $1', [id]);
    },

    async addWishlistOption(itemId: number, data: Omit<WishlistOption, 'id' | 'itemId'>): Promise<void> {
        const database = await db;
        await database.execute(
            'INSERT INTO wishlist_options (item_id, installments, interest_rate, total_amount, description) VALUES ($1, $2, $3, $4, $5)',
            [itemId, data.installments, data.interestRate, data.totalAmount, data.description]
        );
    },

    async deleteWishlistOption(id: number): Promise<void> {
        const database = await db;
        await database.execute('DELETE FROM wishlist_options WHERE id = $1', [id]);
    },

    // --- Crypto / Dolar ---
    async getDolarQuotes(): Promise<any> {
        const response = await fetch('https://criptoya.com/api/dolar');
        if (!response.ok) {
            throw new Error('Failed to fetch dolar quotes');
        }
        return await response.json();
    },

    async getCryptoChartData(days: number = 30): Promise<any> {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/usd-coin/market_chart?vs_currency=ars&days=${days}`);
        if (!response.ok) {
            throw new Error('Failed to fetch crypto chart data');
        }
        return await response.json();
    }
};
