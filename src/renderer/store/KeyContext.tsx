import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SavedKey } from '../../shared/types';

interface KeyContextType {
  keys: SavedKey[];
  selectedKey: SavedKey | null;
  loading: boolean;
  loadKeys: () => Promise<void>;
  saveKey: (key: SavedKey) => Promise<void>;
  deleteKey: (keyId: string) => Promise<void>;
  selectKey: (key: SavedKey | null) => void;
}

const KeyContext = createContext<KeyContextType | undefined>(undefined);

interface KeyProviderProps {
  children: ReactNode;
}

export const KeyProvider: React.FC<KeyProviderProps> = ({ children }) => {
  const [keys, setKeys] = useState<SavedKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<SavedKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const loadedKeys = await window.electronAPI.getSavedKeys();
      setKeys(loadedKeys);
    } catch (error) {
      console.error('Failed to load keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveKey = async (key: SavedKey) => {
    try {
      await window.electronAPI.saveKey(key);
      setKeys(prev => [...prev, key]);
    } catch (error) {
      console.error('Failed to save key:', error);
      throw error;
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      await window.electronAPI.deleteKey(keyId);
      setKeys(prev => prev.filter(k => k.id !== keyId));
      
      // If the deleted key was selected, clear selection
      if (selectedKey?.id === keyId) {
        setSelectedKey(null);
      }
    } catch (error) {
      console.error('Failed to delete key:', error);
      throw error;
    }
  };

  const selectKey = (key: SavedKey | null) => {
    setSelectedKey(key);
  };

  const value: KeyContextType = {
    keys,
    selectedKey,
    loading,
    loadKeys,
    saveKey,
    deleteKey,
    selectKey,
  };

  return (
    <KeyContext.Provider value={value}>
      {children}
    </KeyContext.Provider>
  );
};

export const useKeys = (): KeyContextType => {
  const context = useContext(KeyContext);
  if (context === undefined) {
    throw new Error('useKeys must be used within a KeyProvider');
  }
  return context;
};