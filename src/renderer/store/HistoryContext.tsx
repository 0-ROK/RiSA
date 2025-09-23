import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HistoryItem, HistoryFilter } from '../../shared/types';
import { getPlatformServices } from '../services';

interface HistoryContextType {
    history: HistoryItem[];
    loading: boolean;
    loadHistory: (filter?: HistoryFilter) => Promise<void>;
    saveHistoryItem: (historyItem: HistoryItem) => Promise<void>;
    deleteHistoryItem: (historyId: string) => Promise<void>;
    clearHistory: () => Promise<void>;
    filter: HistoryFilter | null;
    setFilter: (filter: HistoryFilter | null) => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

interface HistoryProviderProps {
    children: ReactNode;
}

export const HistoryProvider: React.FC<HistoryProviderProps> = ({ children }) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<HistoryFilter | null>(null);
    const services = getPlatformServices();

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        loadHistory(filter || undefined);
    }, [filter]);

    const loadHistory = async (filterToApply?: HistoryFilter) => {
        try {
            setLoading(true);
            const loadedHistory = await services.history.list(filterToApply);
            setHistory(loadedHistory);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveHistoryItem = async (historyItem: HistoryItem) => {
        try {
            await services.history.save(historyItem);
            // Add to local state immediately for UI responsiveness
            setHistory(prev => [historyItem, ...prev]);
        } catch (error) {
            console.error('Failed to save history item:', error);
            throw error;
        }
    };

    const deleteHistoryItem = async (historyId: string) => {
        try {
            await services.history.remove(historyId);
            setHistory(prev => prev.filter(item => item.id !== historyId));
        } catch (error) {
            console.error('Failed to delete history item:', error);
            throw error;
        }
    };

    const clearHistory = async () => {
        try {
            await services.history.clear();
            setHistory([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
            throw error;
        }
    };

    const value: HistoryContextType = {
        history,
        loading,
        loadHistory,
        saveHistoryItem,
        deleteHistoryItem,
        clearHistory,
        filter,
        setFilter,
    };

    return (
        <HistoryContext.Provider value={value}>
            {children}
        </HistoryContext.Provider>
    );
};

export const useHistory = (): HistoryContextType => {
    const context = useContext(HistoryContext);
    if (context === undefined) {
        throw new Error('useHistory must be used within a HistoryProvider');
    }
    return context;
};
