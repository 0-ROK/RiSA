import { HttpTemplate } from '../../../shared/types';
import { HttpTemplateService } from '../../../shared/services/types';
import {
  DEFAULT_EXPIRES_AT,
  STORAGE_KEYS,
  getRegisteredExpiration,
  isFiniteNumber,
  isRecord,
  readCollection,
  reviveDate,
  writeCollection,
} from './storage/browserStorageCommon';

const resolveHttpTemplateExpiresAt = (template: HttpTemplate): number | undefined => {
  const registered = getRegisteredExpiration(template);
  if (isFiniteNumber(registered)) {
    return registered;
  }
  if (isFiniteNumber((template as unknown as Record<string, unknown>).expiresAt)) {
    return (template as unknown as Record<string, unknown>).expiresAt as number;
  }
  return DEFAULT_EXPIRES_AT();
};

const reviveHttpTemplate = (template: unknown): HttpTemplate => {
  if (!isRecord(template)) {
    throw new Error('Invalid HTTP template record');
  }
  const record = template as Record<string, unknown>;
  const base = template as unknown as HttpTemplate;
  return {
    ...base,
    created: reviveDate(record.created),
    lastUsed: record.lastUsed ? reviveDate(record.lastUsed) : undefined,
  };
};

const loadHttpTemplates = async (): Promise<HttpTemplate[]> =>
  readCollection<HttpTemplate>(STORAGE_KEYS.httpTemplates, reviveHttpTemplate);

export const browserHttpTemplateService: HttpTemplateService = {
  async list() {
    return loadHttpTemplates();
  },
  async save(template) {
    const templates = await loadHttpTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index >= 0) {
      throw new Error('동일한 ID의 템플릿이 이미 존재합니다.');
    }
    templates.push(template);
    writeCollection(STORAGE_KEYS.httpTemplates, templates, resolveHttpTemplateExpiresAt);
  },
  async update(template) {
    const templates = await loadHttpTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index === -1) {
      throw new Error('템플릿을 찾을 수 없습니다.');
    }
    templates[index] = template;
    writeCollection(STORAGE_KEYS.httpTemplates, templates, resolveHttpTemplateExpiresAt);
  },
  async remove(templateId) {
    const templates = await loadHttpTemplates();
    writeCollection(
      STORAGE_KEYS.httpTemplates,
      templates.filter(t => t.id !== templateId),
      resolveHttpTemplateExpiresAt,
    );
  },
  async useTemplate(templateId, pathParams, queryParams) {
    const templates = await this.list();
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error('선택한 템플릿을 찾을 수 없습니다.');
    }

    let fullUrl = template.baseUrl;

    if (template.pathTemplate) {
      let pathPart = template.pathTemplate;
      Object.entries(pathParams).forEach(([key, value]) => {
        pathPart = pathPart
          .replace(`:${key}`, encodeURIComponent(value))
          .replace(`{${key}}`, encodeURIComponent(value));
      });

      if (!fullUrl.endsWith('/') && !pathPart.startsWith('/')) {
        fullUrl += '/';
      }
      if (fullUrl.endsWith('/') && pathPart.startsWith('/')) {
        pathPart = pathPart.substring(1);
      }

      fullUrl += pathPart;
    }

    const params = new URLSearchParams();
    if (template.queryTemplate) {
      try {
        const expectedParams = JSON.parse(template.queryTemplate);
        if (Array.isArray(expectedParams)) {
          expectedParams.forEach((key: string) => {
            if (queryParams[key]) {
              params.set(key, queryParams[key]);
            }
          });
        }
      } catch {
        // ignore parsing errors
      }
    } else {
      Object.entries(queryParams).forEach(([key, value]) => {
        params.set(key, value);
      });
    }

    const queryString = params.toString();
    if (queryString) {
      fullUrl += fullUrl.includes('?') ? '&' : '?';
      fullUrl += queryString;
    }

    return fullUrl;
  },
};
