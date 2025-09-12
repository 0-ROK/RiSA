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
  Divider
} from 'antd';
import {
  LinkOutlined,
  CopyOutlined,
  ClearOutlined,
  ExpandOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useHistory } from '../store/HistoryContext';
import { HistoryItem } from '../../shared/types';
import PageHeader from '../components/PageHeader';

const { TextArea } = Input;
const { Text } = Typography;

type OperationMode = 'parse' | 'build';

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
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
}

const HttpParserPage: React.FC = () => {
  const { saveHistoryItem } = useHistory();
  const [mode, setMode] = useState<OperationMode>('parse');
  const [inputUrl, setInputUrl] = useState('');
  const [pathTemplate, setPathTemplate] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedUrl | null>(null);
  
  // Build mode states
  const [baseUrl, setBaseUrl] = useState('');
  const [buildPathTemplate, setBuildPathTemplate] = useState('');
  const [pathParamsInput, setPathParamsInput] = useState('');
  const [queryParamsInput, setQueryParamsInput] = useState('');
  const [builtUrl, setBuiltUrl] = useState('');
  
  const [fullScreenModalVisible, setFullScreenModalVisible] = useState(false);
  const [fullScreenType, setFullScreenType] = useState<'input' | 'output' | 'template'>('input');
  const [fullScreenContent, setFullScreenContent] = useState('');

  const parseUrl = (urlString: string, template?: string): ParsedUrl | null => {
    try {
      const url = new URL(urlString);
      const pathParams: Record<string, string> = {};
      
      if (template) {
        const templateParts = template.split('/').filter(part => part);
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
      url.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

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
      
      // Add query parameters
      const queryEntries = Object.entries(template.queryParams).filter(([_, value]) => value.trim() !== '');
      if (queryEntries.length > 0) {
        const searchParams = new URLSearchParams();
        queryEntries.forEach(([key, value]) => {
          searchParams.set(key, value);
        });
        fullUrl += `?${searchParams.toString()}`;
      }
      
      return fullUrl;
    } catch (error) {
      throw new Error('URL 생성 중 오류가 발생했습니다.');
    }
  };

  const parseJsonParams = (jsonString: string): Record<string, string> => {
    if (!jsonString.trim()) return {};
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed === 'object' && parsed !== null) {
        const result: Record<string, string> = {};
        Object.entries(parsed).forEach(([key, value]) => {
          result[key] = String(value);
        });
        return result;
      }
      return {};
    } catch (error) {
      throw new Error('올바른 JSON 형식이 아닙니다.');
    }
  };

  const performParse = async () => {
    if (!inputUrl.trim()) {
      message.error('파싱할 URL을 입력해주세요.');
      return;
    }

    try {
      const result = parseUrl(inputUrl, pathTemplate || undefined);
      if (!result) {
        throw new Error('올바른 URL 형식이 아닙니다.');
      }

      setParsedResult(result);
      message.success('URL 파싱이 완료되었습니다.');

      // Save to history
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: 'http-parse' as any,
        inputText: inputUrl + (pathTemplate ? `\n템플릿: ${pathTemplate}` : ''),
        outputText: JSON.stringify(result, null, 2),
        success: true,
        timestamp: new Date(),
      };

      await saveHistoryItem(historyItem);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      
      notification.error({
        message: 'URL 파싱 실패',
        description: errorMessage,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        placement: 'topRight',
        duration: 5,
      });

      // Save failed operation
      const failedHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: 'http-parse' as any,
        inputText: inputUrl,
        outputText: '',
        success: false,
        errorMessage,
        timestamp: new Date(),
      };

      await saveHistoryItem(failedHistoryItem);
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

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notification.success({
        message: '복사됨',
        description: '클립보드에 복사되었습니다.',
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

  const handleClear = () => {
    setInputUrl('');
    setPathTemplate('');
    setParsedResult(null);
    setBaseUrl('');
    setBuildPathTemplate('');
    setPathParamsInput('');
    setQueryParamsInput('');
    setBuiltUrl('');
  };

  const handleFullScreenEdit = (type: 'input' | 'output' | 'template') => {
    let content = '';
    if (type === 'input') {
      content = mode === 'parse' ? inputUrl : baseUrl;
    } else if (type === 'template') {
      content = mode === 'parse' ? pathTemplate : buildPathTemplate;
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
    }
    setFullScreenModalVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      
      if (mode === 'parse') {
        performParse();
      } else {
        performBuild();
      }
    }
  };

  const renderParsedResult = () => {
    if (!parsedResult) return null;

    return (
      <Card
        title={
          <Space>
            <Text strong>파싱 결과</Text>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(JSON.stringify(parsedResult, null, 2))}
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
          <Descriptions.Item label="프로토콜">{parsedResult.protocol}</Descriptions.Item>
          <Descriptions.Item label="호스트">{parsedResult.host}</Descriptions.Item>
          <Descriptions.Item label="경로">{parsedResult.pathname}</Descriptions.Item>
          {parsedResult.search && (
            <Descriptions.Item label="쿼리 스트링">{parsedResult.search}</Descriptions.Item>
          )}
          {parsedResult.hash && (
            <Descriptions.Item label="해시">{parsedResult.hash}</Descriptions.Item>
          )}
        </Descriptions>

        {Object.keys(parsedResult.pathParams).length > 0 && (
          <>
            <Divider orientation="left" plain>경로 파라미터</Divider>
            <Space wrap>
              {Object.entries(parsedResult.pathParams).map(([key, value]) => (
                <Tag key={key} color="blue">
                  <strong>{key}</strong>: {value}
                </Tag>
              ))}
            </Space>
          </>
        )}

        {Object.keys(parsedResult.queryParams).length > 0 && (
          <>
            <Divider orientation="left" plain>쿼리 파라미터</Divider>
            <Space wrap>
              {Object.entries(parsedResult.queryParams).map(([key, value]) => (
                <Tag key={key} color="green">
                  <strong>{key}</strong>: {value}
                </Tag>
              ))}
            </Space>
          </>
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
                <Button
                  type="primary"
                  icon={mode === 'parse' ? <LinkOutlined /> : <EditOutlined />}
                  onClick={mode === 'parse' ? performParse : performBuild}
                  title={`${mode === 'parse' ? 'URL 파싱' : 'URL 생성'} (Cmd/Ctrl+Enter)`}
                >
                  {mode === 'parse' ? '파싱' : '생성'}
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

        {/* Parse Mode */}
        {mode === 'parse' && (
          <div>
            <Row gutter={24}>
              <Col span={12}>
                <Card
                  title="URL 입력"
                  style={{ height: '300px', display: 'flex', flexDirection: 'column' }}
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
                    <Input
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="https://api.example.com/users/123/posts?page=1&limit=10"
                      style={{ marginBottom: 16 }}
                    />
                    
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>경로 템플릿 (선택사항)</Text>
                      <Button
                        size="small"
                        icon={<ExpandOutlined />}
                        onClick={() => handleFullScreenEdit('template')}
                        style={{ float: 'right' }}
                        title="전체 화면으로 편집"
                      />
                    </div>
                    <Input
                      value={pathTemplate}
                      onChange={(e) => setPathTemplate(e.target.value)}
                      placeholder="/users/:userId/posts 또는 /users/{userId}/posts"
                    />
                  </div>
                </Card>
              </Col>
              
              <Col span={12}>
                <div style={{ height: '300px', overflow: 'auto' }}>
                  {renderParsedResult()}
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
                  style={{ height: '500px', display: 'flex', flexDirection: 'column' }}
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
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.example.com"
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
                      style={{ marginBottom: 16 }}
                    />
                    
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>경로 파라미터 (JSON)</Text>
                    </div>
                    <TextArea
                      value={pathParamsInput}
                      onChange={(e) => setPathParamsInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder='{"userId": "123"}'
                      style={{ marginBottom: 16, fontFamily: 'monospace' }}
                      rows={3}
                    />
                    
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>쿼리 파라미터 (JSON)</Text>
                    </div>
                    <TextArea
                      value={queryParamsInput}
                      onChange={(e) => setQueryParamsInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder='{"page": "1", "limit": "10"}'
                      style={{ fontFamily: 'monospace' }}
                      rows={3}
                    />
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
    </div>
  );
};

export default HttpParserPage;