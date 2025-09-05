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

    const algorithm = step.params?.algorithm || 'RSA-OAEP';
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

    const algorithm = step.params?.algorithm || 'RSA-OAEP';
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
    };
  }
}

// Export singleton instance
export const chainExecutor = new ChainExecutor();