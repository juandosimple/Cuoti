export interface User {
    id: number;
    name: string;
    avatar?: string;
    createdAt: Date;
}

export interface TransactionItem {
    id?: number;
    transactionId?: number;
    name: string;
    price: number;
    quantity: number;
    link?: string;
    imageUrl?: string;
}

export type TransactionType = 'purchase' | 'subscription' | 'service';

export interface Transaction {
    id: number;
    userId?: number;
    date: Date;
    shopName: string;
    totalAmount: number;
    currency: string;
    status: 'completed' | 'pending';
    isDebt: boolean;
    debtTo?: string;
    type: TransactionType;
    isRecurring: boolean;
    groupId?: string;
    tagIds?: number[]; // Changed from tagId
    paymentDate?: Date;
    recurrenceEndDate?: Date;
    items?: TransactionItem[];
    createdAt: Date;
}

export interface CreateTransactionDTO {
    date: Date;
    shopName: string;
    totalAmount: number;
    installments?: number;
    userId?: number;
    isDebt: boolean;
    debtTo?: string;
    type: TransactionType;
    isRecurring: boolean;
    groupId?: string; // Added optional groupId
    recurrenceEndDate?: Date;
    tagIds?: number[]; // Changed from tagId
    paymentDate?: Date;
    items: Omit<TransactionItem, 'id' | 'transactionId'>[];
}

export interface Tag {
    id: number;
    name: string;
    color: string;
}

export interface WishlistOption {
    id: number;
    itemId: number;
    installments: number;
    interestRate: number;
    totalAmount: number;
    description?: string;
}

export interface WishlistItem {
    id: number;
    name: string;
    price: number;
    link?: string;
    imageUrl?: string;
    priority: number;
    tagIds?: number[];
    notes?: string;
    options: WishlistOption[];
}
