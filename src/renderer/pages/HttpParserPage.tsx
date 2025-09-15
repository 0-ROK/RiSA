import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  message,
  Row,
  Col,
  Modal,
  notification,
  Radio,
  Descriptions,
  Tag,
  Divider,
  Tooltip,
  Popover,
  Form,
  Select
} from 'antd';
import {
  LinkOutlined,
  CopyOutlined,
  ClearOutlined,
  ExpandOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  EditOutlined,
  BulbOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  UnorderedListOutlined,
  DeleteOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useHistory } from '../store/HistoryContext';
import { useHttpTemplate } from '../store/HttpTemplateContext';
import { HistoryItem, HttpTemplate } from '../../shared/types';
import PageHeader from '../components/PageHeader';

const { TextArea } = Input;
const { Text } = Typography;

type OperationMode = 'parse' | 'build';

interface PathSegment {
  value: string;
  isDynamic: boolean;
  paramName?: string;
  paramType?: 'number' | 'uuid' | 'string';
  suggestions?: string[];
}

interface QueryParam {
  key: string;
  value: string;
  isDynamic: boolean;
  paramType?: 'number' | 'uuid' | 'string';
}

interface TemplateAnalysis {
  segments: PathSegment[];
  queryParams: QueryParam[];
  suggestedTemplate: string;
  suggestedQueryTemplate: string;
  dynamicCount: number;
  dynamicQueryCount: number;
}

interface ParsedUrl {
  protocol: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
}

interface UrlTemplate {
  baseUrl: string;
  pathTemplate: string;
  queryTemplate: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
}

const HttpParserPage: React.FC = () => {
  const { saveHistoryItem } = useHistory();
  const { templates, loading, saveTemplate, deleteTemplate, updateTemplate } = useHttpTemplate();
  const [mode, setMode] = useState<OperationMode>('parse');
  const [inputUrl, setInputUrl] = useState('');
  const [pathTemplate, setPathTemplate] = useState('');
  const [queryTemplate, setQueryTemplate] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedUrl | null>(null);

  // Build mode states
  const [baseUrl, setBaseUrl] = useState('');
  const [buildPathTemplate, setBuildPathTemplate] = useState('');
  const [buildQueryTemplate, setBuildQueryTemplate] = useState('');
  const [pathParamsInput, setPathParamsInput] = useState('');
  const [queryParamsInput, setQueryParamsInput] = useState('');
  const [builtUrl, setBuiltUrl] = useState('');

  const [fullScreenModalVisible, setFullScreenModalVisible] = useState(false);
  const [fullScreenType, setFullScreenType] = useState<'input' | 'output' | 'template' | 'queryTemplate'>('input');
  const [fullScreenContent, setFullScreenContent] = useState('');
  const [templateAnalysis, setTemplateAnalysis] = useState<TemplateAnalysis | null>(null);
  const [showTemplateSuggestions, setShowTemplateSuggestions] = useState(false);
  const [templateMatchStatus, setTemplateMatchStatus] = useState<'success' | 'warning' | 'error' | null>(null);
  const [realtimeParsedResult, setRealtimeParsedResult] = useState<ParsedUrl | null>(null);

  // Save template modal states
  const [saveTemplateModalVisible, setSaveTemplateModalVisible] = useState(false);
  const [saveTemplateForm] = Form.useForm();

  // Template management states
  const [showTemplatesList, setShowTemplatesList] = useState(false);

  // JSON validation states
  const [pathParamsError, setPathParamsError] = useState<string | null>(null);
  const [queryParamsError, setQueryParamsError] = useState<string | null>(null);

  // 자동 템플릿 분석 함수들
  const detectParamType = (value: string): 'number' | 'uuid' | 'string' => {
    // UUID 패턴 검사
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) {
      return 'uuid';
    }

    // 숫자 패턴 검사
    if (/^\d+$/.test(value) && value.length > 0) {
      return 'number';
    }

    return 'string';
  };

  const generateParamName = (value: string, index: number, pathSegments: string[]): string => {
    const type = detectParamType(value);
    const prevSegment = index > 0 ? pathSegments[index - 1] : '';

    // 이전 세그먼트에 따른 파라미터 이름 추론
    if (prevSegment) {
      const singularMap: Record<string, string> = {
        'users': 'userId',
        'posts': 'postId',
        'comments': 'commentId',
        'products': 'productId',
        'orders': 'orderId',
        'categories': 'categoryId',
        'files': 'fileId',
        'projects': 'projectId',
        'tasks': 'taskId',
        'teams': 'teamId'
      };

      if (singularMap[prevSegment.toLowerCase()]) {
        return singularMap[prevSegment.toLowerCase()];
      }

      // 복수형을 단수형으로 변환하고 Id 추가
      if (prevSegment.endsWith('s')) {
        return `${prevSegment.slice(0, -1)}Id`;
      }
    }

    // 타입에 따른 기본 이름
    switch (type) {
      case 'uuid':
        return 'uuid';
      case 'number':
        return 'id';
      default:
        return 'param';
    }
  };

  const detectQueryParamType = (value: string): 'number' | 'uuid' | 'string' => {
    // UUID 패턴 검사
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) {
      return 'uuid';
    }

    // 숫자 패턴 검사
    if (/^\d+$/.test(value) && value.length > 0) {
      return 'number';
    }

    return 'string';
  };

  const analyzeUrlForTemplate = (urlString: string): TemplateAnalysis | null => {
    try {
      const url = new URL(urlString);
      const pathSegments = url.pathname.split('/').filter(segment => segment);

      const segments: PathSegment[] = pathSegments.map((segment, index) => {
        const type = detectParamType(segment);

        // 동적 파라미터로 판단하는 조건
        const isDynamic =
          type === 'uuid' ||
          (type === 'number' && segment.length > 2) ||
          (type === 'string' && segment.length > 20) ||
          /^[a-f0-9]{24}$/i.test(segment); // MongoDB ObjectId 패턴

        const paramName = isDynamic ? generateParamName(segment, index, pathSegments) : undefined;

        // 파라미터 이름 제안
        const suggestions = isDynamic ? [
          paramName!,
          `${paramName}${index}`,
          `param${index + 1}`,
          type === 'number' ? 'id' : type === 'uuid' ? 'uuid' : 'value'
        ].filter((item, index, arr) => arr.indexOf(item) === index) : undefined;

        return {
          value: segment,
          isDynamic,
          paramName,
          paramType: isDynamic ? type : undefined,
          suggestions
        };
      });

      // 쿼리 파라미터 분석 - 모든 쿼리 파라미터를 동적으로 처리
      const queryParams: QueryParam[] = [];
      url.searchParams.forEach((value, key) => {
        const type = detectQueryParamType(value);

        // 모든 쿼리 파라미터는 동적으로 처리
        queryParams.push({
          key,
          value,
          isDynamic: true,
          paramType: type
        });
      });

      // 동적 파라미터 개수 계산
      const dynamicCount = segments.filter(s => s.isDynamic).length;
      const dynamicQueryCount = queryParams.filter(q => q.isDynamic).length;

      // 템플릿 생성
      const suggestedTemplate = '/' + segments.map(segment =>
        segment.isDynamic ? `:${segment.paramName}` : segment.value
      ).join('/');

      // 쿼리 템플릿 생성 - 키 배열 형식
      const dynamicQueryKeys = queryParams
        .filter(param => param.isDynamic)
        .map(param => param.key);
      const suggestedQueryTemplate = dynamicQueryKeys.length > 0
        ? JSON.stringify(dynamicQueryKeys)
        : '';

      return {
        segments,
        queryParams,
        suggestedTemplate,
        suggestedQueryTemplate,
        dynamicCount,
        dynamicQueryCount
      };
    } catch (error) {
      return null;
    }
  };

  const validateTemplateMatch = (url: string, template: string): 'success' | 'warning' | 'error' => {
    if (!url || !template) return 'warning';

    try {
      const urlObj = new URL(url);
      const urlSegments = urlObj.pathname.split('/').filter(s => s);
      const templateSegments = template.split('/').filter(s => s);

      if (urlSegments.length !== templateSegments.length) {
        return 'error';
      }

      let dynamicCount = 0;
      let matchCount = 0;

      for (let i = 0; i < templateSegments.length; i++) {
        const templateSegment = templateSegments[i];
        const urlSegment = urlSegments[i];

        if (templateSegment.startsWith(':') || (templateSegment.startsWith('{') && templateSegment.endsWith('}'))) {
          dynamicCount++;
          matchCount++;
        } else if (templateSegment === urlSegment) {
          matchCount++;
        }
      }

      if (matchCount === templateSegments.length) {
        return dynamicCount > 0 ? 'success' : 'warning';
      }

      return 'error';
    } catch (error) {
      return 'error';
    }
  };

  // URL 입력 시 실시간 템플릿 분석
  useEffect(() => {
    if (mode === 'parse' && inputUrl.trim()) {
      const analysis = analyzeUrlForTemplate(inputUrl);
      setTemplateAnalysis(analysis);
      if (analysis && (analysis.segments.length > 0 || analysis.dynamicQueryCount > 0) && (!pathTemplate && !queryTemplate)) {
        setShowTemplateSuggestions(true);
      }
    } else {
      setTemplateAnalysis(null);
      setShowTemplateSuggestions(false);
    }
  }, [inputUrl, mode, pathTemplate, queryTemplate]);

  // 실시간 파싱 및 템플릿 매칭 검증
  useEffect(() => {
    if (mode === 'parse' && inputUrl.trim()) {
      // 실시간 파싱
      const parsed = parseUrl(inputUrl, pathTemplate || undefined, queryTemplate || undefined);
      setRealtimeParsedResult(parsed);

      // 템플릿 매칭 검증
      if (pathTemplate.trim()) {
        const matchStatus = validateTemplateMatch(inputUrl, pathTemplate);
        setTemplateMatchStatus(matchStatus);
      } else {
        setTemplateMatchStatus(null);
      }
    } else {
      setRealtimeParsedResult(null);
      setTemplateMatchStatus(null);
    }
  }, [inputUrl, pathTemplate, queryTemplate, mode]);

  // Real-time validation for path parameters JSON
  useEffect(() => {
    const error = validateJsonParams(pathParamsInput);
    setPathParamsError(error);
  }, [pathParamsInput]);

  // Real-time validation for query parameters JSON
  useEffect(() => {
    const error = validateJsonParams(queryParamsInput);
    setQueryParamsError(error);
  }, [queryParamsInput]);

  const parseUrl = (urlString: string, pathTemplate?: string, queryTemplate?: string): ParsedUrl | null => {
    try {
      const url = new URL(urlString);
      const pathParams: Record<string, string> = {};

      // Path template parsing
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

      const queryParams: Record<string, string> = {};

      // Query template parsing
      if (queryTemplate) {
        try {
          // Try to parse as JSON array first (new format)
          const queryKeys = JSON.parse(queryTemplate);
          if (Array.isArray(queryKeys)) {
            // Array format: ["page", "limit"]
            const urlParams = new URLSearchParams(url.search);
            queryKeys.forEach(key => {
              const urlValue = urlParams.get(key);
              if (urlValue !== null) {
                queryParams[key] = urlValue;
              }
            });
          } else {
            // Fallback to old format parsing for compatibility
            parseOldQueryTemplate();
          }
        } catch {
          // If JSON parsing fails, try old format for compatibility
          parseOldQueryTemplate();
        }

        function parseOldQueryTemplate() {
          const templatePairs = queryTemplate?.split('&').filter(pair => pair) || [];
          const urlParams = new URLSearchParams(url.search);

          templatePairs.forEach(templatePair => {
            const [key, value] = templatePair.split('=');
            if (key && value) {
              if (value.startsWith(':')) {
                const paramName = value.substring(1);
                const urlValue = urlParams.get(key);
                if (urlValue !== null) {
                  queryParams[paramName] = urlValue;
                }
              } else if (value.startsWith('{') && value.endsWith('}')) {
                const paramName = value.slice(1, -1);
                const urlValue = urlParams.get(key);
                if (urlValue !== null) {
                  queryParams[paramName] = urlValue;
                }
              } else {
                // Static value - include if matches
                const urlValue = urlParams.get(key);
                if (urlValue === value) {
                  queryParams[key] = urlValue;
                }
              }
            }
          });
        }
      } else {
        // No query template - include all query parameters
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });
      }

      return {
        protocol: url.protocol,
        host: url.host,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        pathParams,
        queryParams
      };
    } catch (error) {
      return null;
    }
  };

  const buildUrl = (template: UrlTemplate): string => {
    try {
      let fullUrl = template.baseUrl;

      // Build path
      if (template.pathTemplate) {
        let pathPart = template.pathTemplate;

        // Replace path parameters
        Object.entries(template.pathParams).forEach(([key, value]) => {
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
      let queryString = '';

      if (template.queryTemplate) {
        try {
          // Try to parse as JSON array first (new format)
          const queryKeys = JSON.parse(template.queryTemplate);
          if (Array.isArray(queryKeys)) {
            // Array format: ["page", "limit"]
            const queryParts: string[] = [];
            queryKeys.forEach(key => {
              const paramValue = template.queryParams[key];
              if (paramValue && paramValue.trim() !== '') {
                queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(paramValue)}`);
              }
            });
            queryString = queryParts.join('&');
          } else {
            // Fallback to old format for compatibility
            buildOldQueryTemplate();
          }
        } catch {
          // If JSON parsing fails, try old format for compatibility
          buildOldQueryTemplate();
        }

        function buildOldQueryTemplate() {
          const templatePairs = template.queryTemplate.split('&').filter(pair => pair);
          const queryParts: string[] = [];

          templatePairs.forEach(templatePair => {
            const [key, value] = templatePair.split('=');
            if (key && value) {
              if (value.startsWith(':')) {
                const paramName = value.substring(1);
                const paramValue = template.queryParams[paramName];
                if (paramValue && paramValue.trim() !== '') {
                  queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(paramValue)}`);
                }
              } else if (value.startsWith('{') && value.endsWith('}')) {
                const paramName = value.slice(1, -1);
                const paramValue = template.queryParams[paramName];
                if (paramValue && paramValue.trim() !== '') {
                  queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(paramValue)}`);
                }
              } else {
                // Static value
                queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
              }
            }
          });

          queryString = queryParts.join('&');
        }
      } else {
        // No query template - use all query parameters
        const queryEntries = Object.entries(template.queryParams).filter(([_, value]) => value.trim() !== '');
        if (queryEntries.length > 0) {
          const searchParams = new URLSearchParams();
          queryEntries.forEach(([key, value]) => {
            searchParams.set(key, value);
          });
          queryString = searchParams.toString();
        }
      }

      if (queryString) {
        fullUrl += `?${queryString}`;
      }

      return fullUrl;
    } catch (error) {
      throw new Error('URL 생성 중 오류가 발생했습니다.');
    }
  };

  const parseJsonParams = (jsonString: string): Record<string, string> => {
    if (!jsonString.trim()) return {};

    const input = jsonString.trim();

    try {
      // First try standard JSON.parse
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object' && parsed !== null) {
        const result: Record<string, string> = {};
        Object.entries(parsed).forEach(([key, value]) => {
          result[key] = String(value);
        });
        return result;
      }
      return {};
    } catch (strictJsonError) {
      // If strict JSON fails, try flexible parsing
      try {
        // Convert JavaScript object literal to valid JSON
        let flexibleInput = input;

        // Handle single quotes: convert to double quotes
        flexibleInput = flexibleInput.replace(/'/g, '"');

        // Handle unquoted keys: add quotes around keys
        // This regex finds word patterns followed by colon (unquoted keys)
        flexibleInput = flexibleInput.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

        // Handle unquoted string values (only simple alphanumeric strings)
        // Match: "key": value (where value is not already quoted, number, boolean, null)
        flexibleInput = flexibleInput.replace(/:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([,}])/g, ': "$1"$2');

        // Parse the converted string
        const parsed = JSON.parse(flexibleInput);
        if (typeof parsed === 'object' && parsed !== null) {
          const result: Record<string, string> = {};
          Object.entries(parsed).forEach(([key, value]) => {
            result[key] = String(value);
          });
          return result;
        }
        return {};
      } catch (flexibleParseError) {
        // If both approaches fail, provide helpful error message
        throw new Error('올바른 JSON 형식이 아닙니다. 예시: {"key": "value"} 또는 {key: "value"} 또는 {key: 123}');
      }
    }
  };

  // Validate JSON parameters and return error message if invalid
  const validateJsonParams = (input: string): string | null => {
    if (!input.trim()) return null; // Empty input is valid

    try {
      parseJsonParams(input);
      return null; // Valid JSON
    } catch (error) {
      return error instanceof Error ? error.message : '올바른 JSON 형식이 아닙니다.';
    }
  };

  // Parse full URL and extract components for Build mode
  const parseUrlForBuild = (fullUrl: string): { baseUrl: string; pathTemplate: string; queryTemplate: string; success: boolean; message: string } => {
    try {
      const url = new URL(fullUrl);
      const baseUrl = `${url.protocol}//${url.host}`;

      // Analyze path for template generation (reuse existing logic)
      const analysis = analyzeUrlForTemplate(fullUrl);

      const pathTemplate = analysis?.suggestedTemplate || url.pathname;
      const queryTemplate = analysis?.suggestedQueryTemplate || '';

      let extractedParts = [];
      extractedParts.push(`베이스 URL: ${baseUrl}`);
      if (pathTemplate && pathTemplate !== '/') {
        extractedParts.push(`경로 템플릿: ${pathTemplate}`);
      }
      if (queryTemplate) {
        extractedParts.push(`쿼리 템플릿: ${queryTemplate}`);
      }

      const message = `URL에서 추출됨: ${extractedParts.join(', ')}`;

      return {
        baseUrl,
        pathTemplate,
        queryTemplate,
        success: true,
        message
      };
    } catch (error) {
      return {
        baseUrl: fullUrl,
        pathTemplate: '',
        queryTemplate: '',
        success: false,
        message: '올바른 URL 형식이 아닙니다.'
      };
    }
  };

  const performBuild = async () => {
    if (!baseUrl.trim()) {
      message.error('베이스 URL을 입력해주세요.');
      return;
    }

    try {
      const pathParams = parseJsonParams(pathParamsInput);
      const queryParams = parseJsonParams(queryParamsInput);

      const template: UrlTemplate = {
        baseUrl: baseUrl.trim(),
        pathTemplate: buildPathTemplate.trim(),
        queryTemplate: buildQueryTemplate.trim(),
        pathParams,
        queryParams
      };

      const result = buildUrl(template);
      setBuiltUrl(result);
      message.success('URL 생성이 완료되었습니다.');

      // Save to history
      const inputData = {
        baseUrl: template.baseUrl,
        pathTemplate: template.pathTemplate,
        pathParams: template.pathParams,
        queryParams: template.queryParams
      };

      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: 'http-build' as any,
        inputText: JSON.stringify(inputData, null, 2),
        outputText: result,
        success: true,
        timestamp: new Date(),
      };

      await saveHistoryItem(historyItem);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

      notification.error({
        message: 'URL 생성 실패',
        description: errorMessage,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        placement: 'topRight',
        duration: 5,
      });

      // Save failed operation
      const failedHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: 'http-build' as any,
        inputText: baseUrl,
        outputText: '',
        success: false,
        errorMessage,
        timestamp: new Date(),
      };

      await saveHistoryItem(failedHistoryItem);
    }
  };

  const applyTemplateSuggestion = (suggestion: string, type: 'path' | 'query' | string = 'path') => {
    if (type === 'path') {
      setPathTemplate(suggestion);
    } else if (type === 'query') {
      setQueryTemplate(suggestion);
    }
    setShowTemplateSuggestions(false);
  };

  const dismissTemplateSuggestions = () => {
    setShowTemplateSuggestions(false);
  };

  const handleCopy = async (text: string, description?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notification.success({
        message: '복사됨',
        description: description || '클립보드에 복사되었습니다.',
        icon: <CheckOutlined style={{ color: '#52c41a' }} />,
        placement: 'topRight',
        duration: 2,
      });
    } catch (error) {
      notification.error({
        message: '복사 실패',
        description: '클립보드에 복사하는 중 오류가 발생했습니다.',
        placement: 'topRight',
        duration: 3,
      });
    }
  };

  const handleCopyParams = async (params: Record<string, string>, type: 'path' | 'query') => {
    const jsonString = JSON.stringify(params, null, 2);
    const typeName = type === 'path' ? '경로 파라미터' : '쿼리 파라미터';
    await handleCopy(jsonString, `${typeName} JSON이 클립보드에 복사되었습니다.`);
  };

  const handleCopySingleParam = async (key: string, value: string, type: 'path' | 'query') => {
    const typeName = type === 'path' ? '경로 파라미터' : '쿼리 파라미터';
    await handleCopy(value, `${typeName} "${key}"의 값이 클립보드에 복사되었습니다.`);
  };

  const handleClear = () => {
    setInputUrl('');
    setPathTemplate('');
    setQueryTemplate('');
    setParsedResult(null);
    setBaseUrl('');
    setBuildPathTemplate('');
    setBuildQueryTemplate('');
    setPathParamsInput('');
    setQueryParamsInput('');
    setBuiltUrl('');
  };

  const handleFullScreenEdit = (type: 'input' | 'output' | 'template' | 'queryTemplate') => {
    let content = '';
    if (type === 'input') {
      content = mode === 'parse' ? inputUrl : baseUrl;
    } else if (type === 'template') {
      content = mode === 'parse' ? pathTemplate : buildPathTemplate;
    } else if (type === 'queryTemplate') {
      content = mode === 'parse' ? queryTemplate : buildQueryTemplate;
    } else {
      content = mode === 'parse'
        ? (parsedResult ? JSON.stringify(parsedResult, null, 2) : '')
        : builtUrl;
    }

    setFullScreenType(type);
    setFullScreenContent(content);
    setFullScreenModalVisible(true);
  };

  const handleFullScreenSave = () => {
    if (fullScreenType === 'input') {
      if (mode === 'parse') {
        setInputUrl(fullScreenContent);
      } else {
        setBaseUrl(fullScreenContent);
      }
    } else if (fullScreenType === 'template') {
      if (mode === 'parse') {
        setPathTemplate(fullScreenContent);
      } else {
        setBuildPathTemplate(fullScreenContent);
      }
    } else if (fullScreenType === 'queryTemplate') {
      if (mode === 'parse') {
        setQueryTemplate(fullScreenContent);
      } else {
        setBuildQueryTemplate(fullScreenContent);
      }
    }
    setFullScreenModalVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();

      // Parse 모드에서는 실시간 파싱이 이미 되고 있으므로 키보드 단축키 비활성화
      if (mode === 'build') {
        performBuild();
      }
    }
  };

  const handleSaveTemplate = () => {
    if (mode === 'parse') {
      // Parse mode - use current input and templates
      if (!inputUrl.trim()) {
        message.error('저장할 URL을 입력해주세요.');
        return;
      }

      try {
        const url = new URL(inputUrl);
        saveTemplateForm.setFieldsValue({
          name: `${url.hostname} 템플릿`,
          description: `${url.pathname}에 대한 API 템플릿`,
          baseUrl: `${url.protocol}//${url.host}`,
          pathTemplate: pathTemplate || url.pathname,
          queryTemplate: queryTemplate || '',
          category: 'api',
          tags: []
        });
      } catch {
        saveTemplateForm.setFieldsValue({
          name: '새 HTTP 템플릿',
          description: '',
          baseUrl: '',
          pathTemplate: pathTemplate,
          queryTemplate: queryTemplate,
          category: 'custom',
          tags: []
        });
      }
    } else {
      // Build mode - use build form values
      saveTemplateForm.setFieldsValue({
        name: '새 HTTP 템플릿',
        description: '',
        baseUrl: baseUrl,
        pathTemplate: buildPathTemplate,
        queryTemplate: buildQueryTemplate,
        category: 'custom',
        tags: []
      });
    }

    setSaveTemplateModalVisible(true);
  };

  const handleSaveTemplateSubmit = async () => {
    try {
      const values = await saveTemplateForm.validateFields();

      const template: HttpTemplate = {
        id: crypto.randomUUID(),
        name: values.name,
        description: values.description || '',
        baseUrl: values.baseUrl,
        pathTemplate: values.pathTemplate,
        queryTemplate: values.queryTemplate,
        created: new Date(),
        tags: values.tags || [],
        category: values.category || 'custom',
      };

      await saveTemplate(template);
      message.success('템플릿이 저장되었습니다.');
      setSaveTemplateModalVisible(false);
      saveTemplateForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(`템플릿 저장 실패: ${error.message}`);
      }
    }
  };

  const handleLoadTemplate = (template: HttpTemplate) => {
    if (mode === 'parse') {
      setInputUrl(''); // Clear current URL to allow template-based input
      setPathTemplate(template.pathTemplate);
      setQueryTemplate(template.queryTemplate);
    } else {
      setBaseUrl(template.baseUrl);
      setBuildPathTemplate(template.pathTemplate);
      setBuildQueryTemplate(template.queryTemplate);
    }
    message.success(`템플릿 "${template.name}"이 로드되었습니다.`);
    setShowTemplatesList(false);
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    try {
      await deleteTemplate(templateId);
      message.success(`템플릿 "${templateName}"이 삭제되었습니다.`);
    } catch (error) {
      message.error('템플릿 삭제에 실패했습니다.');
    }
  };

  const renderParsedResult = (result?: ParsedUrl | null) => {
    const resultToShow = result || parsedResult;
    if (!resultToShow) return null;

    const isRealtime = result === realtimeParsedResult;

    return (
      <Card
        title={
          <Space>
            <Text strong>파싱 결과</Text>
            {isRealtime && (
              <Tag color="blue">실시간</Tag>
            )}
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(JSON.stringify(resultToShow, null, 2))}
              title="결과 복사"
            />
            <Button
              size="small"
              icon={<ExpandOutlined />}
              onClick={() => handleFullScreenEdit('output')}
              title="전체 화면으로 보기"
            />
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="프로토콜">
            <Text code>{resultToShow.protocol}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="호스트">
            <Text code>{resultToShow.host}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="경로">
            <Text code>{resultToShow.pathname}</Text>
          </Descriptions.Item>
          {resultToShow.search && (
            <Descriptions.Item label="쿼리 스트링">
              <Text code>{resultToShow.search}</Text>
            </Descriptions.Item>
          )}
          {resultToShow.hash && (
            <Descriptions.Item label="해시">
              <Text code>{resultToShow.hash}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        {Object.keys(resultToShow.pathParams).length > 0 && (
          <>
            <Divider orientation="left" plain>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text strong>경로 파라미터 ({Object.keys(resultToShow.pathParams).length}개)</Text>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyParams(resultToShow.pathParams, 'path')}
                  title="경로 파라미터를 JSON으로 복사"
                >
                  JSON 복사
                </Button>
              </div>
            </Divider>
            <Space wrap>
              {Object.entries(resultToShow.pathParams).map(([key, value]) => {
                const type = detectParamType(value);
                const color = type === 'uuid' ? 'purple' : type === 'number' ? 'blue' : 'cyan';
                return (
                  <Popover
                    key={key}
                    content={
                      <div>
                        <Text strong>파라미터 정보</Text>
                        <br />
                        <Text>이름: {key}</Text>
                        <br />
                        <Text>값: {value}</Text>
                        <br />
                        <Text>타입: {type}</Text>
                        <br />
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => handleCopySingleParam(key, value, 'path')}
                          style={{ marginTop: 8 }}
                        >
                          값 복사
                        </Button>
                      </div>
                    }
                    title="파라미터 세부 정보"
                  >
                    <Tag color={color} style={{ cursor: 'pointer' }}>
                      <strong>{key}</strong>: {value}
                      <span style={{ marginLeft: 4, opacity: 0.7 }}>({type})</span>
                    </Tag>
                  </Popover>
                );
              })}
            </Space>
          </>
        )}

        {Object.keys(resultToShow.queryParams).length > 0 && (
          <>
            <Divider orientation="left" plain>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text strong>쿼리 파라미터 ({Object.keys(resultToShow.queryParams).length}개)</Text>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyParams(resultToShow.queryParams, 'query')}
                  title="쿼리 파라미터를 JSON으로 복사"
                >
                  JSON 복사
                </Button>
              </div>
            </Divider>
            <Space wrap>
              {Object.entries(resultToShow.queryParams).map(([key, value]) => (
                <Popover
                  key={key}
                  content={
                    <div>
                      <Text strong>쿼리 파라미터 정보</Text>
                      <br />
                      <Text>이름: {key}</Text>
                      <br />
                      <Text>값: {value}</Text>
                      <br />
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopySingleParam(key, value, 'query')}
                        style={{ marginTop: 8 }}
                      >
                        값 복사
                      </Button>
                    </div>
                  }
                  title="쿼리 파라미터 세부 정보"
                >
                  <Tag color="green" style={{ cursor: 'pointer' }}>
                    <strong>{key}</strong>: {value}
                  </Tag>
                </Popover>
              ))}
            </Space>
          </>
        )}

        {Object.keys(resultToShow.pathParams).length === 0 && Object.keys(resultToShow.queryParams).length === 0 && pathTemplate && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            <InfoCircleOutlined style={{ fontSize: '16px', marginRight: '8px' }} />
            템플릿과 매칭되는 파라미터가 없습니다
          </div>
        )}
      </Card>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="HTTP Parser"
        icon={<LinkOutlined />}
      />

      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%', flex: 1 }}>
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>
              <ApiOutlined />
              <span style={{ marginLeft: 8 }}>HTTP URL 파서</span>
            </Text>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              HTTP URL을 파싱하여 경로 파라미터와 쿼리 스트링을 추출하거나, 템플릿을 사용하여 URL을 생성합니다.
            </Text>
          </Space>
        </Card>

        {/* Mode Selection */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text strong>모드:</Text>
            </Col>
            <Col>
              <Radio.Group
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="parse">
                  <LinkOutlined style={{ marginRight: 4 }} />
                  URL 파싱
                </Radio.Button>
                <Radio.Button value="build">
                  <EditOutlined style={{ marginRight: 4 }} />
                  URL 생성
                </Radio.Button>
              </Radio.Group>
            </Col>
            <Col style={{ marginLeft: 'auto' }}>
              <Space>
                {mode === 'build' && (
                  <Tooltip
                    title={
                      (pathParamsError || queryParamsError)
                        ? 'JSON 형식 오류를 수정해주세요'
                        : 'URL 생성 (Cmd/Ctrl+Enter)'
                    }
                  >
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={performBuild}
                      disabled={pathParamsError !== null || queryParamsError !== null}
                    >
                      생성
                    </Button>
                  </Tooltip>
                )}
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleSaveTemplate}
                  title="현재 설정을 템플릿으로 저장"
                >
                  템플릿 저장
                </Button>
                <Button
                  icon={<UnorderedListOutlined />}
                  onClick={() => setShowTemplatesList(!showTemplatesList)}
                  title="저장된 템플릿 목록 보기"
                  type={showTemplatesList ? "primary" : "default"}
                >
                  템플릿 목록 ({templates.length})
                </Button>
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClear}
                  title="모든 입력 초기화"
                >
                  초기화
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Templates List */}
        {showTemplatesList && (
          <Card
            title={
              <Space>
                <UnorderedListOutlined />
                <Text strong>저장된 HTTP 템플릿</Text>
                {loading && <LoadingOutlined />}
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <LoadingOutlined style={{ fontSize: '24px' }} />
                <div style={{ marginTop: '8px' }}>템플릿을 불러오는 중...</div>
              </div>
            ) : templates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <InfoCircleOutlined style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }} />
                저장된 템플릿이 없습니다. 위의 "템플릿 저장" 버튼을 사용하여 첫 번째 템플릿을 만들어보세요.
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {templates.map((template) => (
                  <Col key={template.id} xs={24} sm={12} lg={8}>
                    <Card
                      size="small"
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text strong style={{ fontSize: '14px' }}>{template.name}</Text>
                          <Tag color={template.category === 'api' ? 'blue' : template.category === 'web' ? 'green' : 'orange'}>
                            {template.category?.toUpperCase()}
                          </Tag>
                        </div>
                      }
                      extra={
                        <Popover
                          content={
                            <div>
                              <Button
                                size="small"
                                type="text"
                                icon={<LoadingOutlined />}
                                onClick={() => handleLoadTemplate(template)}
                                style={{ marginBottom: 4, width: '100%', textAlign: 'left' }}
                              >
                                템플릿 로드
                              </Button>
                              <Button
                                size="small"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteTemplate(template.id, template.name)}
                                style={{ width: '100%', textAlign: 'left' }}
                              >
                                삭제
                              </Button>
                            </div>
                          }
                          trigger="click"
                        >
                          <Button size="small" type="text">⋯</Button>
                        </Popover>
                      }
                      actions={[
                        <Button
                          key="load"
                          size="small"
                          type="primary"
                          block
                          onClick={() => handleLoadTemplate(template)}
                        >
                          사용하기
                        </Button>
                      ]}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {template.description || '설명 없음'}
                        </Text>
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <Text code style={{ fontSize: '11px', backgroundColor: '#f0f2f5' }}>
                          {template.baseUrl}
                        </Text>
                      </div>
                      {template.pathTemplate && (
                        <div style={{ marginBottom: 4 }}>
                          <Text code style={{ fontSize: '11px', backgroundColor: '#fff2e8' }}>
                            {template.pathTemplate}
                          </Text>
                        </div>
                      )}
                      {template.queryTemplate && (
                        <div style={{ marginBottom: 8 }}>
                          <Text code style={{ fontSize: '11px', backgroundColor: '#f6ffed' }}>
                            {template.queryTemplate}
                          </Text>
                        </div>
                      )}
                      {template.tags && template.tags.length > 0 && (
                        <div>
                          {template.tags.map(tag => (
                            <Tag key={tag} style={{ fontSize: '10px', margin: '2px' }}>
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 8, textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: '10px' }}>
                          {template.lastUsed ?
                            `마지막 사용: ${new Date(template.lastUsed).toLocaleDateString()}` :
                            `생성일: ${new Date(template.created).toLocaleDateString()}`
                          }
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        )}

        {/* Parse Mode */}
        {mode === 'parse' && (
          <div>
            <Row gutter={24}>
              <Col span={12}>
                <Card
                  title="URL 입력"
                  style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}
                  styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>파싱할 URL</Text>
                      <Button
                        size="small"
                        icon={<ExpandOutlined />}
                        onClick={() => handleFullScreenEdit('input')}
                        style={{ float: 'right' }}
                        title="전체 화면으로 편집"
                      />
                    </div>
                    <TextArea
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="https://api.example.com/users/123/posts?page=1&limit=10"
                      style={{ marginBottom: 16, resize: 'vertical' }}
                      rows={3}
                      autoSize={{ minRows: 2, maxRows: 6 }}
                    />

                    <div style={{ marginBottom: 8 }}>
                      <Text strong>경로 템플릿 (선택사항)</Text>
                      {templateAnalysis && (templateAnalysis.segments.length > 0 || templateAnalysis.dynamicQueryCount > 0) && (
                        <Tooltip title={`경로: ${templateAnalysis.segments.length}개 세그먼트 (동적 ${templateAnalysis.dynamicCount}개), 쿼리: ${templateAnalysis.dynamicQueryCount}개 파라미터`}>
                          <Button
                            size="small"
                            icon={<BulbOutlined />}
                            onClick={() => setShowTemplateSuggestions(!showTemplateSuggestions)}
                            style={{ marginLeft: 8 }}
                            type={showTemplateSuggestions ? "primary" : "default"}
                          >
                            자동 감지 ({templateAnalysis.dynamicCount + templateAnalysis.dynamicQueryCount})
                          </Button>
                        </Tooltip>
                      )}
                      <Button
                        size="small"
                        icon={<ExpandOutlined />}
                        onClick={() => handleFullScreenEdit('template')}
                        style={{ float: 'right' }}
                        title="전체 화면으로 편집"
                      />
                    </div>

                    {showTemplateSuggestions && templateAnalysis && (
                      <div style={{ marginBottom: 12, padding: '12px', backgroundColor: '#f0f9ff', border: '1px solid #bae7ff', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                          <BulbOutlined style={{ color: '#1890ff', marginRight: 4 }} />
                          <Text strong style={{ color: '#1890ff' }}>
                            템플릿 제안 - {templateAnalysis.dynamicCount}개의 경로 파라미터, {templateAnalysis.dynamicQueryCount}개의 쿼리 파라미터 발견
                          </Text>
                          <Button
                            type="text"
                            size="small"
                            onClick={dismissTemplateSuggestions}
                            style={{ marginLeft: 'auto' }}
                          >
                            ✕
                          </Button>
                        </div>

                        {templateAnalysis.segments.length > 0 && (
                          <>
                            <div style={{ marginBottom: 4 }}>
                              <Text strong style={{ fontSize: '12px' }}>경로 템플릿:</Text>
                            </div>
                            <div style={{ marginBottom: 8, padding: '8px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e1f5fe' }}>
                              <Text code style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                {templateAnalysis.suggestedTemplate}
                              </Text>
                              <Button
                                size="small"
                                style={{ marginLeft: 8 }}
                                onClick={() => applyTemplateSuggestion(templateAnalysis.suggestedTemplate, 'path')}
                              >
                                경로 템플릿 적용
                              </Button>
                            </div>
                          </>
                        )}

                        {templateAnalysis.dynamicQueryCount > 0 && (
                          <>
                            <div style={{ marginBottom: 4 }}>
                              <Text strong style={{ fontSize: '12px' }}>쿼리 템플릿:</Text>
                            </div>
                            <div style={{ marginBottom: 8, padding: '8px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e1f5fe' }}>
                              <Text code style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                {templateAnalysis.suggestedQueryTemplate}
                              </Text>
                              <Button
                                size="small"
                                style={{ marginLeft: 8 }}
                                onClick={() => applyTemplateSuggestion(templateAnalysis.suggestedQueryTemplate, 'query')}
                              >
                                쿼리 템플릿 적용
                              </Button>
                            </div>
                          </>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              경로: {templateAnalysis.segments.filter(s => s.isDynamic).map(s =>
                                `${s.paramName} (${s.paramType})`
                              ).join(', ')}
                              {templateAnalysis.dynamicCount > 0 && templateAnalysis.dynamicQueryCount > 0 && ' | '}
                              쿼리: {templateAnalysis.queryParams.filter(q => q.isDynamic).map(q =>
                                `${q.key} (${q.paramType})`
                              ).join(', ')}
                            </Text>
                          </div>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => {
                              applyTemplateSuggestion(templateAnalysis.suggestedTemplate, 'path');
                              if (templateAnalysis.dynamicQueryCount > 0) {
                                applyTemplateSuggestion(templateAnalysis.suggestedQueryTemplate, 'query');
                              }
                            }}
                          >
                            모두 적용
                          </Button>
                        </div>
                      </div>
                    )}

                    <Input
                      value={pathTemplate}
                      onChange={(e) => setPathTemplate(e.target.value)}
                      placeholder="/users/:userId/posts 또는 /users/{userId}/posts"
                      status={templateMatchStatus === 'error' ? 'error' : templateMatchStatus === 'warning' ? 'warning' : undefined}
                      suffix={templateMatchStatus && (
                        <Tooltip title={
                          templateMatchStatus === 'success' ? '템플릿이 URL과 일치합니다' :
                            templateMatchStatus === 'warning' ? '템플릿이 부분적으로 일치합니다' :
                              '템플릿이 URL과 일치하지 않습니다'
                        }>
                          {templateMatchStatus === 'success' ? (
                            <CheckOutlined style={{ color: '#52c41a' }} />
                          ) : templateMatchStatus === 'warning' ? (
                            <InfoCircleOutlined style={{ color: '#faad14' }} />
                          ) : (
                            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                          )}
                        </Tooltip>
                      )}
                      style={{ marginBottom: 8 }}
                    />

                    <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f6f8fa', border: '1px solid #e1e4e8', borderRadius: '6px', fontSize: '12px', color: '#586069' }}>
                      <InfoCircleOutlined style={{ marginRight: '6px', color: '#0969da' }} />
                      <strong>동적 파라미터 표기법:</strong> <Text code>:paramName</Text> 또는 <Text code>{'{paramName}'}</Text> 형식으로 입력하세요.
                      <br />
                      예시: <Text code>/users/:userId/posts</Text> 또는 <Text code>/users/{'{userId}'}/posts</Text>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <Text strong>쿼리 템플릿 (선택사항)</Text>
                      <Button
                        size="small"
                        icon={<ExpandOutlined />}
                        onClick={() => handleFullScreenEdit('queryTemplate')}
                        style={{ float: 'right' }}
                        title="전체 화면으로 편집"
                      />
                    </div>
                    <Input
                      value={queryTemplate}
                      onChange={(e) => setQueryTemplate(e.target.value)}
                      placeholder='["page", "limit"]'
                    />
                  </div>
                </Card>
              </Col>

              <Col span={12}>
                <div style={{ height: '500px', overflow: 'auto' }}>
                  {(realtimeParsedResult || parsedResult) && renderParsedResult(realtimeParsedResult || parsedResult)}
                  {!realtimeParsedResult && !parsedResult && inputUrl.trim() && (
                    <Card title="파싱 결과" style={{ height: '100%' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '400px',
                        color: '#999',
                        textAlign: 'center'
                      }}>
                        <div>
                          <InfoCircleOutlined style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }} />
                          올바른 URL을 입력하면 파싱 결과가 표시됩니다
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </Col>
            </Row>
          </div>
        )}

        {/* Build Mode */}
        {mode === 'build' && (
          <div>
            <Row gutter={24}>
              <Col span={12}>
                <Card
                  title="URL 생성 설정"
                  style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}
                  styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' } }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>베이스 URL</Text>
                      <Button
                        size="small"
                        icon={<ExpandOutlined />}
                        onClick={() => handleFullScreenEdit('input')}
                        style={{ float: 'right' }}
                        title="전체 화면으로 편집"
                      />
                    </div>
                    <Input
                      value={baseUrl}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setBaseUrl(newValue);

                        // Auto-detect full URL and extract components
                        if (newValue.includes('?') || (newValue.split('/').length > 3 && newValue.startsWith('http'))) {
                          const extraction = parseUrlForBuild(newValue);
                          if (extraction.success && (extraction.pathTemplate !== '/' || extraction.queryTemplate)) {
                            // Only auto-extract if there's actually something to extract
                            setBaseUrl(extraction.baseUrl);
                            if (extraction.pathTemplate && extraction.pathTemplate !== '/') {
                              setBuildPathTemplate(extraction.pathTemplate);
                            }
                            if (extraction.queryTemplate) {
                              setBuildQueryTemplate(extraction.queryTemplate);
                            }

                            // Show success notification
                            notification.success({
                              message: 'URL 자동 분석 완료',
                              description: extraction.message,
                              placement: 'topRight',
                              duration: 3,
                            });
                          }
                        }
                      }}
                      placeholder="https://api.example.com 또는 전체 URL을 붙여넣으면 자동으로 분석됩니다"
                      style={{ marginBottom: 16 }}
                    />

                    <div style={{ marginBottom: 8 }}>
                      <Text strong>경로 템플릿</Text>
                      <Button
                        size="small"
                        icon={<ExpandOutlined />}
                        onClick={() => handleFullScreenEdit('template')}
                        style={{ float: 'right' }}
                        title="전체 화면으로 편집"
                      />
                    </div>
                    <Input
                      value={buildPathTemplate}
                      onChange={(e) => setBuildPathTemplate(e.target.value)}
                      placeholder="/users/:userId/posts"
                      style={{ marginBottom: 8 }}
                    />

                    <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f6f8fa', border: '1px solid #e1e4e8', borderRadius: '6px', fontSize: '12px', color: '#586069' }}>
                      <InfoCircleOutlined style={{ marginRight: '6px', color: '#0969da' }} />
                      <strong>동적 파라미터 표기법:</strong> <Text code>:paramName</Text> 또는 <Text code>{'{paramName}'}</Text> 형식으로 입력하세요.
                      <br />
                      예시: <Text code>/users/:userId/posts</Text> 또는 <Text code>/users/{'{userId}'}/posts</Text>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <Text strong>쿼리 템플릿</Text>
                      <Button
                        size="small"
                        icon={<ExpandOutlined />}
                        onClick={() => handleFullScreenEdit('queryTemplate')}
                        style={{ float: 'right' }}
                        title="전체 화면으로 편집"
                      />
                    </div>
                    <Input
                      value={buildQueryTemplate}
                      onChange={(e) => setBuildQueryTemplate(e.target.value)}
                      placeholder='["page", "limit"]'
                      style={{ marginBottom: 16 }}
                    />

                    <div style={{ marginBottom: 8 }}>
                      <Text strong>경로 파라미터 (JSON)</Text>
                    </div>
                    <TextArea
                      value={pathParamsInput}
                      onChange={(e) => setPathParamsInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder='{"userId": "123"} 또는 {userId: "123"} 또는 {userId: 123}'
                      style={{
                        marginBottom: pathParamsError ? 8 : 16,
                        fontFamily: 'monospace'
                      }}
                      status={pathParamsError ? 'error' : undefined}
                      rows={3}
                    />
                    {pathParamsError && (
                      <div style={{
                        marginBottom: 16,
                        color: '#ff4d4f',
                        fontSize: '12px',
                        paddingLeft: '12px'
                      }}>
                        {pathParamsError}
                      </div>
                    )}

                    <div style={{ marginBottom: 8 }}>
                      <Text strong>쿼리 파라미터 (JSON)</Text>
                    </div>
                    <TextArea
                      value={queryParamsInput}
                      onChange={(e) => setQueryParamsInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder='{"page": "1", "limit": "10"} 또는 {page: 1, limit: 10}'
                      style={{
                        marginBottom: queryParamsError ? 8 : 0,
                        fontFamily: 'monospace'
                      }}
                      status={queryParamsError ? 'error' : undefined}
                      rows={3}
                    />
                    {queryParamsError && (
                      <div style={{
                        marginTop: 8,
                        color: '#ff4d4f',
                        fontSize: '12px',
                        paddingLeft: '12px'
                      }}>
                        {queryParamsError}
                      </div>
                    )}
                  </div>
                </Card>
              </Col>

              <Col span={12}>
                <Card
                  title={
                    <Space>
                      <Text strong>생성된 URL</Text>
                      {builtUrl && (
                        <>
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopy(builtUrl)}
                            title="URL 복사"
                          />
                          <Button
                            size="small"
                            icon={<ExpandOutlined />}
                            onClick={() => handleFullScreenEdit('output')}
                            title="전체 화면으로 보기"
                          />
                        </>
                      )}
                    </Space>
                  }
                  style={{ height: '500px', display: 'flex', flexDirection: 'column' }}
                  styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                >
                  <TextArea
                    value={builtUrl}
                    readOnly
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      backgroundColor: '#f5f5f5',
                      resize: 'none'
                    }}
                    placeholder="생성된 URL이 여기에 표시됩니다..."
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </div>

      {/* Full Screen Modal */}
      <Modal
        title={
          fullScreenType === 'input'
            ? (mode === 'parse' ? 'URL 편집' : '베이스 URL 편집')
            : fullScreenType === 'template'
              ? '경로 템플릿 편집'
              : fullScreenType === 'queryTemplate'
                ? '쿼리 템플릿 편집'
                : (mode === 'parse' ? '파싱 결과 보기' : '생성된 URL 보기')
        }
        open={fullScreenModalVisible}
        onCancel={() => setFullScreenModalVisible(false)}
        width="90vw"
        style={{ top: 20 }}
        styles={{
          body: { height: 'calc(100vh - 200px)', padding: '24px' }
        }}
        footer={
          fullScreenType === 'output' ? [
            <Button
              key="copy"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(fullScreenContent)}
            >
              복사
            </Button>,
            <Button key="close" onClick={() => setFullScreenModalVisible(false)}>
              닫기
            </Button>
          ] : [
            <Button key="cancel" onClick={() => setFullScreenModalVisible(false)}>
              취소
            </Button>,
            <Button key="save" type="primary" onClick={handleFullScreenSave}>
              저장
            </Button>
          ]
        }
      >
        <TextArea
          value={fullScreenContent}
          onChange={(e) => setFullScreenContent(e.target.value)}
          onKeyDown={fullScreenType !== 'output' ? (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleFullScreenSave();
            }
          } : undefined}
          readOnly={fullScreenType === 'output'}
          style={{
            height: '100%',
            resize: 'none',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}
        />
      </Modal>

      {/* Save Template Modal */}
      <Modal
        title="템플릿 저장"
        open={saveTemplateModalVisible}
        onCancel={() => {
          setSaveTemplateModalVisible(false);
          saveTemplateForm.resetFields();
        }}
        onOk={handleSaveTemplateSubmit}
        okText="저장"
        cancelText="취소"
        width={600}
      >
        <Form
          form={saveTemplateForm}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="템플릿 이름"
            rules={[{ required: true, message: '템플릿 이름을 입력해주세요.' }]}
          >
            <Input placeholder="예: GitHub API 템플릿" />
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
          >
            <Input.TextArea
              placeholder="이 템플릿에 대한 설명을 입력하세요"
              rows={2}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="baseUrl"
                label="베이스 URL"
                rules={[{ required: true, message: '베이스 URL을 입력해주세요.' }]}
              >
                <Input placeholder="https://api.example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="카테고리"
              >
                <Select placeholder="카테고리 선택">
                  <Select.Option value="api">API</Select.Option>
                  <Select.Option value="web">웹</Select.Option>
                  <Select.Option value="custom">커스텀</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="pathTemplate"
            label="경로 템플릿"
          >
            <Input placeholder="/users/:userId/posts" />
          </Form.Item>

          <Form.Item
            name="queryTemplate"
            label="쿼리 템플릿"
          >
            <Input placeholder='["page", "limit"]' />
          </Form.Item>

          <Form.Item
            name="tags"
            label="태그"
          >
            <Select
              mode="tags"
              placeholder="태그를 입력하세요 (Enter로 추가)"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HttpParserPage;