import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HttpTemplate, HttpTemplateUsage } from '../../shared/types';
import { getPlatformServices } from '../services';

interface HttpTemplateContextType {
  templates: HttpTemplate[];
  loading: boolean;
  error: string | null;

  // Template management
  loadTemplates: () => Promise<void>;
  saveTemplate: (template: HttpTemplate) => Promise<void>;
  updateTemplate: (template: HttpTemplate) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  useTemplate: (templateId: string, pathParams: Record<string, string>, queryParams: Record<string, string>) => Promise<string>;

  // Utilities
  createEmptyTemplate: () => HttpTemplate;
  findTemplateByUrl: (url: string) => HttpTemplate | null;
  getTemplatesByCategory: (category: string) => HttpTemplate[];
}

const HttpTemplateContext = createContext<HttpTemplateContextType | undefined>(undefined);

interface HttpTemplateProviderProps {
  children: ReactNode;
}

export const HttpTemplateProvider: React.FC<HttpTemplateProviderProps> = ({ children }) => {
  const [templates, setTemplates] = useState<HttpTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const services = getPlatformServices();

  const loadTemplates = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const loadedTemplates = await services.httpTemplate.list();
      setTemplates(loadedTemplates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load HTTP templates';
      setError(errorMessage);
      console.error('Failed to load HTTP templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: HttpTemplate): Promise<void> => {
    try {
      await services.httpTemplate.save(template);
      await loadTemplates(); // Reload to get updated list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save HTTP template';
      setError(errorMessage);
      throw err;
    }
  };

  const updateTemplate = async (template: HttpTemplate): Promise<void> => {
    try {
      await services.httpTemplate.update(template);
      await loadTemplates(); // Reload to get updated list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update HTTP template';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    try {
      await services.httpTemplate.remove(templateId);
      await loadTemplates(); // Reload to get updated list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete HTTP template';
      setError(errorMessage);
      throw err;
    }
  };

  const useTemplate = async (
    templateId: string,
    pathParams: Record<string, string>,
    queryParams: Record<string, string>
  ): Promise<string> => {
    try {
      const result = await services.httpTemplate.useTemplate(templateId, pathParams, queryParams);

      // Update template last used time
      const template = templates.find(t => t.id === templateId);
      if (template) {
        const updatedTemplate = { ...template, lastUsed: new Date() };
        await updateTemplate(updatedTemplate);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to use HTTP template';
      console.error('HTTP template usage failed:', err);
      throw new Error(errorMessage);
    }
  };

  const createEmptyTemplate = (): HttpTemplate => {
    return {
      id: crypto.randomUUID(),
      name: '새 HTTP 템플릿',
      description: '',
      baseUrl: '',
      pathTemplate: '',
      queryTemplate: '',
      created: new Date(),
      tags: [],
      category: 'custom',
    };
  };

  const findTemplateByUrl = (url: string): HttpTemplate | null => {
    try {
      const urlObj = new URL(url);

      // Find templates that match the base URL and path structure
      const candidates = templates.filter(template => {
        try {
          const templateBaseUrl = new URL(template.baseUrl);
          return templateBaseUrl.origin === urlObj.origin;
        } catch {
          return false;
        }
      });

      // For now, return the first matching candidate
      // In the future, we could implement more sophisticated matching
      return candidates.length > 0 ? candidates[0] : null;
    } catch {
      return null;
    }
  };

  const getTemplatesByCategory = (category: string): HttpTemplate[] => {
    return templates.filter(template => template.category === category);
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const contextValue: HttpTemplateContextType = {
    templates,
    loading,
    error,
    loadTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    createEmptyTemplate,
    findTemplateByUrl,
    getTemplatesByCategory,
  };

  return (
    <HttpTemplateContext.Provider value={contextValue}>
      {children}
    </HttpTemplateContext.Provider>
  );
};

export const useHttpTemplate = (): HttpTemplateContextType => {
  const context = useContext(HttpTemplateContext);
  if (!context) {
    throw new Error('useHttpTemplate must be used within a HttpTemplateProvider');
  }
  return context;
};
