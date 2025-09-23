import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChainTemplate, ChainStep, ChainExecutionResult, ChainStepType } from '../../shared/types';
import { CHAIN_MODULES } from '../../shared/constants';
import { getPlatformServices } from '../services';

interface ChainContextType {
  templates: ChainTemplate[];
  loading: boolean;
  error: string | null;
  
  // Template management
  loadTemplates: () => Promise<void>;
  saveTemplate: (template: ChainTemplate) => Promise<void>;
  updateTemplate: (template: ChainTemplate) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  
  // Chain execution
  executeChain: (steps: ChainStep[], inputText: string, templateId?: string, templateName?: string) => Promise<ChainExecutionResult>;
  
  // Utilities
  createEmptyTemplate: () => ChainTemplate;
  createEmptyStep: (type: ChainStepType) => ChainStep;
  getModuleInfo: (type: ChainStepType) => typeof CHAIN_MODULES[ChainStepType] | null;
  validateChainSteps: (steps: ChainStep[]) => { valid: boolean; errors: string[] };
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

interface ChainProviderProps {
  children: ReactNode;
}

export const ChainProvider: React.FC<ChainProviderProps> = ({ children }) => {
  const [templates, setTemplates] = useState<ChainTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const services = getPlatformServices();

  const loadTemplates = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const loadedTemplates = await services.chain.listTemplates();
      setTemplates(loadedTemplates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chain templates';
      setError(errorMessage);
      console.error('Failed to load chain templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: ChainTemplate): Promise<void> => {
    try {
      await services.chain.saveTemplate(template);
      await loadTemplates(); // Reload to get updated list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save chain template';
      setError(errorMessage);
      throw err;
    }
  };

  const updateTemplate = async (template: ChainTemplate): Promise<void> => {
    try {
      await services.chain.updateTemplate(template);
      await loadTemplates(); // Reload to get updated list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update chain template';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    try {
      await services.chain.removeTemplate(templateId);
      await loadTemplates(); // Reload to get updated list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete chain template';
      setError(errorMessage);
      throw err;
    }
  };

  const executeChain = async (
    steps: ChainStep[], 
    inputText: string, 
    templateId?: string, 
    templateName?: string
  ): Promise<ChainExecutionResult> => {
    try {
      const result = await services.chain.executeChain(steps, inputText, templateId, templateName);
      
      // Update template last used time if template was used
      if (templateId) {
        const template = templates.find(t => t.id === templateId);
        if (template) {
          const updatedTemplate = { ...template, lastUsed: new Date() };
          await updateTemplate(updatedTemplate);
        }
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute chain';
      console.error('Chain execution failed:', err);
      throw new Error(errorMessage);
    }
  };

  const createEmptyTemplate = (): ChainTemplate => {
    return {
      id: crypto.randomUUID(),
      name: '새 체인 템플릿',
      description: '',
      steps: [],
      created: new Date(),
      tags: [],
    };
  };

  const createEmptyStep = (type: ChainStepType): ChainStep => {
    const moduleInfo = CHAIN_MODULES[type];
    return {
      id: crypto.randomUUID(),
      type,
      enabled: true,
      name: moduleInfo?.name || type,
      description: moduleInfo?.description || '',
      params: {},
    };
  };

  const getModuleInfo = (type: ChainStepType) => {
    return CHAIN_MODULES[type] || null;
  };

  const validateChainSteps = (steps: ChainStep[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const enabledSteps = steps.filter(step => step.enabled);

    if (enabledSteps.length === 0) {
      errors.push('적어도 하나의 스텝이 활성화되어야 합니다.');
      return { valid: false, errors };
    }

    enabledSteps.forEach((step, index) => {
      const stepPosition = index + 1;
      const stepName = step.name || CHAIN_MODULES[step.type]?.name || step.type;
      
      // Check required parameters for RSA operations
      if (step.type === 'rsa-encrypt' || step.type === 'rsa-decrypt') {
        if (!step.params || !step.params.keyId) {
          errors.push(`${stepPosition}번째 스텝 (${stepName})에서 RSA 키를 선택해주세요.`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const contextValue: ChainContextType = {
    templates,
    loading,
    error,
    loadTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    executeChain,
    createEmptyTemplate,
    createEmptyStep,
    getModuleInfo,
    validateChainSteps,
  };

  return (
    <ChainContext.Provider value={contextValue}>
      {children}
    </ChainContext.Provider>
  );
};

export const useChain = (): ChainContextType => {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error('useChain must be used within a ChainProvider');
  }
  return context;
};
