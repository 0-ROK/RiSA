import NodeRSA from 'node-rsa';
import { ChainStep, ChainStepResult, ChainExecutionResult, ChainStepType, SavedKey } from '../shared/types';
import Store from 'electron-store';

interface StoreData {
  keys: SavedKey[];
}

const store = new Store<StoreData>();

export class ChainExecutor {
  private keys: SavedKey[] = [];

  constructor() {
    this.loadKeys();
  }

  private loadKeys(): void {
    this.keys = (store as any).get('keys', []);
  }

  private getKey(keyId: string): SavedKey | null {
    return this.keys.find(key => key.id === keyId) || null;
  }

  private async executeStep(step: ChainStep, input: string): Promise<ChainStepResult> {
    const startTime = Date.now();
    const result: ChainStepResult = {
      stepId: step.id,
      stepType: step.type,
      input,
      output: '',
      success: false,
      duration: 0,
    };

    try {
      let output: string;

      switch (step.type) {
        case 'url-encode':
          output = encodeURIComponent(input);
          break;

        case 'url-decode':
          output = decodeURIComponent(input);
          break;

        case 'base64-encode':
          output = Buffer.from(input, 'utf8').toString('base64');
          break;

        case 'base64-decode':
          output = Buffer.from(input, 'base64').toString('utf8');
          break;

        case 'rsa-encrypt':
          output = await this.rsaEncrypt(input, step);
          break;

        case 'rsa-decrypt':
          output = await this.rsaDecrypt(input, step);
          break;

        case 'http-parse':
          output = await this.httpParse(input, step);
          break;

        case 'http-build':
          output = await this.httpBuild(input, step);
          break;

        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }

      result.output = output;
      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error occurred';
      result.success = false;
      result.output = input; // Pass through input on error
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  private async rsaEncrypt(input: string, step: ChainStep): Promise<string> {
    const keyId = step.params?.keyId;
    if (!keyId) {
      throw new Error('RSA encryption requires a key ID');
    }

    const key = this.getKey(keyId);
    if (!key) {
      throw new Error(`Key with ID ${keyId} not found`);
    }

    // 알고리즘 우선순위: 스텝 설정 > 키의 선호 알고리즘 > 기본값 (RSA-OAEP)
    const algorithm = step.params?.algorithm || key.preferredAlgorithm || 'RSA-OAEP';
    const rsaKey = new NodeRSA();

    try {
      rsaKey.importKey(key.publicKey, 'pkcs8-public-pem');
      
      if (algorithm === 'RSA-OAEP') {
        rsaKey.setOptions({
          encryptionScheme: 'pkcs1_oaep',
        } as any);
      } else if (algorithm === 'RSA-PKCS1') {
        rsaKey.setOptions({
          encryptionScheme: 'pkcs1',
        });
      }

      const encrypted = rsaKey.encrypt(input, 'base64');
      return encrypted;
    } catch (error) {
      throw new Error(`RSA encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async rsaDecrypt(input: string, step: ChainStep): Promise<string> {
    const keyId = step.params?.keyId;
    if (!keyId) {
      throw new Error('RSA decryption requires a key ID');
    }

    const key = this.getKey(keyId);
    if (!key) {
      throw new Error(`Key with ID ${keyId} not found`);
    }

    // 알고리즘 우선순위: 스텝 설정 > 키의 선호 알고리즘 > 기본값 (RSA-OAEP)
    const algorithm = step.params?.algorithm || key.preferredAlgorithm || 'RSA-OAEP';
    const rsaKey = new NodeRSA();

    try {
      rsaKey.importKey(key.privateKey, 'pkcs8-private-pem');
      
      if (algorithm === 'RSA-OAEP') {
        rsaKey.setOptions({
          encryptionScheme: 'pkcs1_oaep',
        } as any);
      } else if (algorithm === 'RSA-PKCS1') {
        rsaKey.setOptions({
          encryptionScheme: 'pkcs1',
        });
      }

      const decrypted = rsaKey.decrypt(input, 'utf8');
      return decrypted;
    } catch (error) {
      throw new Error(`RSA decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async httpParse(input: string, step: ChainStep): Promise<string> {
    try {
      const url = new URL(input.trim());
      const pathTemplate = step.params?.pathTemplate || '';
      const queryTemplate = step.params?.queryTemplate || '';
      const outputType = step.params?.outputType || 'full';
      const outputField = step.params?.outputField;
      const outputParam = step.params?.outputParam;

      // Parse path parameters
      const pathParams: Record<string, string> = {};
      if (pathTemplate) {
        const templateParts = pathTemplate.split('/').filter(part => part);
        const urlParts = url.pathname.split('/').filter(part => part);

        templateParts.forEach((templatePart, index) => {
          if (templatePart.startsWith(':')) {
            const paramName = templatePart.substring(1);
            if (urlParts[index]) {
              pathParams[paramName] = decodeURIComponent(urlParts[index]);
            }
          } else if (templatePart.startsWith('{') && templatePart.endsWith('}')) {
            const paramName = templatePart.slice(1, -1);
            if (urlParts[index]) {
              pathParams[paramName] = decodeURIComponent(urlParts[index]);
            }
          }
        });
      }

      // Parse query parameters
      const queryParams: Record<string, string> = {};
      if (queryTemplate) {
        try {
          // Parse query template as JSON array
          const queryKeys = JSON.parse(queryTemplate);
          if (Array.isArray(queryKeys)) {
            const urlParams = new URLSearchParams(url.search);
            queryKeys.forEach(key => {
              const value = urlParams.get(key);
              if (value !== null) {
                queryParams[key] = value;
              }
            });
          }
        } catch {
          // Fallback: get all query parameters
          url.searchParams.forEach((value, key) => {
            queryParams[key] = value;
          });
        }
      } else {
        // No template: get all query parameters
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });
      }

      // Return based on output type and field
      switch (outputType) {
        case 'component':
          switch (outputField) {
            case 'host':
              return url.host;
            case 'pathname':
              return url.pathname;
            default:
              return url.host;
          }

        case 'pathParam':
          if (outputField === 'specific' && outputParam) {
            // Return specific path parameter value
            return pathParams[outputParam] || '';
          } else {
            // Return all path parameters as JSON
            return JSON.stringify(pathParams);
          }

        case 'queryParam':
          if (outputField === 'specific' && outputParam) {
            // Return specific query parameter value
            const value = new URLSearchParams(url.search).get(outputParam);
            return value || '';
          } else {
            // Return all query parameters as JSON
            return JSON.stringify(queryParams);
          }

        case 'full':
        default:
          return JSON.stringify({
            protocol: url.protocol,
            host: url.host,
            pathname: url.pathname,
            search: url.search,
            hash: url.hash,
            pathParams,
            queryParams
          });
      }
    } catch (error) {
      throw new Error(`HTTP parsing failed: ${error instanceof Error ? error.message : 'Invalid URL'}`);
    }
  }

  private async httpBuild(input: string, step: ChainStep): Promise<string> {
    try {
      const baseUrl = step.params?.baseUrl || '';
      const pathTemplate = step.params?.pathTemplate || '';
      const queryTemplate = step.params?.queryTemplate || '';
      const paramMappings = step.params?.paramMappings || {};
      const queryMappings = step.params?.queryMappings || {};

      if (!baseUrl) {
        throw new Error('Base URL is required for HTTP build');
      }

      // Parse input data
      let inputData: any = input;
      try {
        inputData = JSON.parse(input);
      } catch {
        // Keep as string if not JSON
      }

      // Apply path parameter mappings
      const pathParams: Record<string, string> = {};
      if (pathTemplate) {
        // Extract parameter names from template
        const pathParamNames = (pathTemplate.match(/:(\w+)|\{(\w+)\}/g) || [])
          .map(match => match.replace(/[:{}]/g, ''));

        for (const paramName of pathParamNames) {
          const mapping = paramMappings[paramName];
          if (mapping) {
            switch (mapping.type) {
              case 'fixed':
                // Use fixed value
                pathParams[paramName] = mapping.value || '';
                break;
              case 'skip':
                // Explicitly omit the parameter
                pathParams[paramName] = '';
                break;
              case 'auto':
              default:
                // Use entire input as parameter value
                pathParams[paramName] = String(inputData);
            }
          } else {
            // Default behavior: use entire input
            pathParams[paramName] = String(inputData);
          }
        }
      }

      // Apply query parameter mappings
      const queryParams: Record<string, string> = {};
      if (queryTemplate) {
        try {
          const queryParamNames = JSON.parse(queryTemplate);
          if (Array.isArray(queryParamNames)) {
            for (const paramName of queryParamNames) {
              const mapping = queryMappings[paramName];
              if (mapping && mapping.type !== 'skip') {
                switch (mapping.type) {
                  case 'auto':
                    // Use entire input as parameter value
                    queryParams[paramName] = String(inputData);
                    break;
                  case 'fixed':
                    // Use fixed value
                    queryParams[paramName] = mapping.value || '';
                    break;
                  default:
                    // Default to auto mapping
                    queryParams[paramName] = String(inputData);
                }
              }
            }
          }
        } catch {
          // Fallback: treat as all query parameters if template parsing fails
        }
      }

      // Build URL
      let fullUrl = baseUrl;

      // Build path
      if (pathTemplate) {
        let pathPart = pathTemplate;

        // Replace path parameters
        Object.entries(pathParams).forEach(([key, value]) => {
          pathPart = pathPart
            .replace(`:${key}`, encodeURIComponent(value))
            .replace(`{${key}}`, encodeURIComponent(value));
        });

        // Ensure proper URL joining
        if (!fullUrl.endsWith('/') && !pathPart.startsWith('/')) {
          fullUrl += '/';
        }
        if (fullUrl.endsWith('/') && pathPart.startsWith('/')) {
          pathPart = pathPart.substring(1);
        }

        fullUrl += pathPart;
      }

      // Build query string
      const queryEntries = Object.entries(queryParams).filter(([_, value]) => value.trim() !== '');
      if (queryEntries.length > 0) {
        const searchParams = new URLSearchParams();
        queryEntries.forEach(([key, value]) => {
          searchParams.set(key, value);
        });
        fullUrl += `?${searchParams.toString()}`;
      }

      return fullUrl;
    } catch (error) {
      throw new Error(`HTTP build failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async executeChain(
    steps: ChainStep[], 
    inputText: string, 
    templateId?: string, 
    templateName?: string
  ): Promise<ChainExecutionResult> {
    const startTime = Date.now();
    const executionId = crypto.randomUUID();
    const stepResults: ChainStepResult[] = [];
    let currentInput = inputText;
    let overallSuccess = true;

    // Refresh keys before execution
    this.loadKeys();

    // Filter enabled steps and execute them sequentially
    const enabledSteps = steps.filter(step => step.enabled);

    for (const step of enabledSteps) {
      const stepResult = await this.executeStep(step, currentInput);
      stepResults.push(stepResult);

      if (stepResult.success) {
        currentInput = stepResult.output;
      } else {
        overallSuccess = false;
        // Stop execution on first failure
        break;
      }
    }

    const totalDuration = Date.now() - startTime;

    const result: ChainExecutionResult = {
      id: executionId,
      templateId,
      templateName,
      success: overallSuccess,
      steps: stepResults,
      finalOutput: overallSuccess ? currentInput : inputText,
      totalDuration,
      timestamp: new Date(),
      inputText,
    };

    return result;
  }

  public validateChain(steps: ChainStep[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const enabledSteps = steps.filter(step => step.enabled);

    if (enabledSteps.length === 0) {
      errors.push('At least one step must be enabled');
      return { valid: false, errors };
    }

    for (const step of enabledSteps) {
      // Validate RSA steps have required keys
      if ((step.type === 'rsa-encrypt' || step.type === 'rsa-decrypt') && !step.params?.keyId) {
        errors.push(`Step "${step.name || step.type}" requires a key to be selected`);
      }

      // Validate key exists
      if (step.params?.keyId) {
        const key = this.getKey(step.params.keyId);
        if (!key) {
          errors.push(`Step "${step.name || step.type}" references a key that no longer exists`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  public getAvailableModules(): Record<ChainStepType, { name: string; description: string; category: string; requiredParams?: string[] }> {
    return {
      'url-encode': {
        name: 'URL 인코딩',
        description: 'URL 안전 문자로 인코딩합니다',
        category: 'encoding',
      },
      'url-decode': {
        name: 'URL 디코딩',
        description: 'URL 인코딩된 문자를 디코딩합니다',
        category: 'encoding',
      },
      'base64-encode': {
        name: 'Base64 인코딩',
        description: 'Base64로 인코딩합니다',
        category: 'encoding',
      },
      'base64-decode': {
        name: 'Base64 디코딩',
        description: 'Base64를 디코딩합니다',
        category: 'encoding',
      },
      'rsa-encrypt': {
        name: 'RSA 암호화',
        description: 'RSA 공개키로 암호화합니다',
        category: 'crypto',
        requiredParams: ['keyId'],
      },
      'rsa-decrypt': {
        name: 'RSA 복호화',
        description: 'RSA 개인키로 복호화합니다',
        category: 'crypto',
        requiredParams: ['keyId'],
      },
      'http-parse': {
        name: 'HTTP 파싱',
        description: 'URL을 분석하여 구성 요소를 추출합니다',
        category: 'http',
        requiredParams: ['outputField'],
      },
      'http-build': {
        name: 'HTTP 생성',
        description: '파라미터로부터 URL을 생성합니다',
        category: 'http',
        requiredParams: ['baseUrl'],
      },
    };
  }
}

// Export singleton instance
export const chainExecutor = new ChainExecutor();
