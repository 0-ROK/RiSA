import React, { useState } from 'react';
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
  Select,
  Radio
} from 'antd';
import {
  CodeOutlined,
  CopyOutlined,
  ClearOutlined,
  ExpandOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useHistory } from '../store/HistoryContext';
import { HistoryItem } from '../../shared/types';
import PageHeader from '../components/PageHeader';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

type EncodingType = 'url' | 'base64';
type OperationType = 'encode' | 'decode';

const EncodingToolsPage: React.FC = () => {
  const { saveHistoryItem } = useHistory();
  const [encodingType, setEncodingType] = useState<EncodingType>('url');
  const [operationType, setOperationType] = useState<OperationType>('encode');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [fullScreenModalVisible, setFullScreenModalVisible] = useState(false);
  const [fullScreenType, setFullScreenType] = useState<'input' | 'output'>('input');
  const [fullScreenContent, setFullScreenContent] = useState('');

  const getHistoryType = (): string => {
    return `${encodingType}-${operationType}`;
  };

  const performOperation = async () => {
    if (!inputText.trim()) {
      message.error(`${operationType === 'encode' ? '인코딩' : '디코딩'}할 텍스트를 입력해주세요.`);
      return;
    }

    try {
      let result: string;
      
      if (encodingType === 'url') {
        if (operationType === 'encode') {
          result = encodeURIComponent(inputText);
        } else {
          result = decodeURIComponent(inputText);
        }
      } else { // base64
        if (operationType === 'encode') {
          result = Buffer.from(inputText, 'utf8').toString('base64');
        } else {
          result = Buffer.from(inputText, 'base64').toString('utf8');
        }
      }

      setOutputText(result);
      
      const operationName = `${encodingType.toUpperCase()} ${operationType === 'encode' ? '인코딩' : '디코딩'}`;
      message.success(`${operationName}이 완료되었습니다.`);

      // 히스토리에 저장
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: getHistoryType() as any,
        inputText,
        outputText: result,
        success: true,
        timestamp: new Date(),
      };

      try {
        await saveHistoryItem(historyItem);
      } catch (error) {
        console.error('Failed to save history:', error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      
      let helpText = '';
      if (encodingType === 'url' && operationType === 'decode') {
        if (errorMessage.includes('URI')) {
          helpText = '올바른 URL 인코딩 형식이 아닙니다. % 기호 뒤에는 정확히 2개의 16진수 문자가 와야 합니다.';
        } else {
          helpText = '입력된 데이터가 올바른 URL 인코딩 형식인지 확인해주세요.';
        }
      } else if (encodingType === 'base64' && operationType === 'decode') {
        helpText = '올바른 Base64 형식이 아닙니다. Base64는 A-Z, a-z, 0-9, +, / 문자와 패딩용 = 문자만 사용합니다.';
      }

      const operationName = `${encodingType.toUpperCase()} ${operationType === 'encode' ? '인코딩' : '디코딩'}`;
      
      notification.error({
        message: `${operationName} 실패`,
        description: (
          <div>
            <div style={{ marginBottom: 8, color: '#ff4d4f' }}><strong>{errorMessage}</strong></div>
            {helpText && (
              <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                {helpText}
              </div>
            )}
          </div>
        ),
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        placement: 'topRight',
        duration: 8,
        style: { width: 400 },
      });
      console.error('Operation error:', error);

      // 실패 히스토리 저장
      const failedHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: getHistoryType() as any,
        inputText,
        outputText: '',
        success: false,
        errorMessage: errorMessage,
        timestamp: new Date(),
      };

      try {
        await saveHistoryItem(failedHistoryItem);
      } catch (historyError) {
        console.error('Failed to save failed operation history:', historyError);
      }
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      const size = text.length;
      const sizeText = size > 1000 ? `${Math.round(size / 1000)}KB` : `${size}자`;
      const operationName = `${encodingType.toUpperCase()} ${operationType === 'encode' ? '인코딩' : '디코딩'}`;

      notification.success({
        message: `${operationName} 결과 복사됨`,
        description: `${sizeText}의 데이터가 클립보드에 복사되었습니다.`,
        icon: <CheckOutlined style={{ color: '#52c41a' }} />,
        placement: 'topRight',
        duration: 3,
      });

    } catch (error) {
      notification.error({
        message: '복사 실패',
        description: '클립보드에 복사하는 중 오류가 발생했습니다.',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        placement: 'topRight',
        duration: 4,
      });
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
  };

  const handleFullScreenEdit = (type: 'input' | 'output') => {
    const content = type === 'input' ? inputText : outputText;
    setFullScreenType(type);
    setFullScreenContent(content);
    setFullScreenModalVisible(true);
  };

  const handleFullScreenSave = () => {
    if (fullScreenType === 'input') {
      setInputText(fullScreenContent);
    }
    setFullScreenModalVisible(false);
  };

  const getCharacterCount = (text: string) => {
    return `${text.length} 문자`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();

      if (!inputText.trim()) {
        message.error(`${operationType === 'encode' ? '인코딩' : '디코딩'}할 텍스트를 입력해주세요.`);
        return;
      }

      performOperation();
    }
  };

  const getEncodingIcon = () => {
    switch (encodingType) {
      case 'url':
        return <LinkOutlined />;
      case 'base64':
        return <CodeOutlined />;
      default:
        return <CodeOutlined />;
    }
  };

  const getEncodingDescription = () => {
    switch (encodingType) {
      case 'url':
        return 'URL에 포함될 수 없는 특수 문자를 안전하게 변환하거나 복원합니다. encodeURIComponent와 decodeURIComponent 함수를 사용합니다.';
      case 'base64':
        return '바이너리 데이터를 텍스트로 안전하게 변환하거나 복원합니다. Base64는 64개의 문자(A-Z, a-z, 0-9, +, /)를 사용합니다.';
      default:
        return '';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <PageHeader 
        title="인코딩/디코딩"
        icon={<CodeOutlined />}
      />
      <div style={{
        padding: '24px',
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
        flex: 1
      }}>

        <Card style={{ marginBottom: 16, flexShrink: 0 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>
              {getEncodingIcon()}
              <span style={{ marginLeft: 8 }}>인코딩/디코딩 도구</span>
            </Text>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getEncodingDescription()}
            </Text>
          </Space>
        </Card>

        {/* 설정 패널 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text strong>인코딩 방식:</Text>
            </Col>
            <Col>
              <Select
                value={encodingType}
                onChange={setEncodingType}
                style={{ width: 120 }}
              >
                <Option value="url">
                  <LinkOutlined style={{ marginRight: 4 }} />
                  URL
                </Option>
                <Option value="base64">
                  <CodeOutlined style={{ marginRight: 4 }} />
                  Base64
                </Option>
              </Select>
            </Col>
            <Col style={{ marginLeft: 24 }}>
              <Text strong>작업:</Text>
            </Col>
            <Col>
              <Radio.Group
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="encode">인코딩</Radio.Button>
                <Radio.Button value="decode">디코딩</Radio.Button>
              </Radio.Group>
            </Col>
            <Col style={{ marginLeft: 'auto' }}>
              <Space>
                <Button
                  type="primary"
                  icon={getEncodingIcon()}
                  onClick={performOperation}
                  disabled={!inputText.trim()}
                  title={`${encodingType.toUpperCase()} ${operationType === 'encode' ? '인코딩' : '디코딩'} (Cmd/Ctrl+Enter)`}
                >
                  {operationType === 'encode' ? '인코딩' : '디코딩'}
                </Button>
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClear}
                  title="입력 및 결과 초기화"
                >
                  초기화
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 입력/출력 영역 */}
        <div style={{ height: 'calc(100vh - 320px)', overflow: 'hidden' }}>
          <Row gutter={24} style={{ height: '100%' }}>
            <Col span={12} style={{ height: '100%' }}>
              <Card
                title="입력"
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                styles={{
                  body: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px'
                  }
                }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong>{operationType === 'encode' ? '인코딩할 텍스트' : '디코딩할 텍스트'}</Text>
                    <Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {getCharacterCount(inputText)}
                      </Text>
                      <Button
                        size="small"
                        icon={<ExpandOutlined />}
                        onClick={() => handleFullScreenEdit('input')}
                        title="전체 화면으로 편집"
                      />
                    </Space>
                  </div>
                  <TextArea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`${encodingType.toUpperCase()} ${operationType === 'encode' ? '인코딩' : '디코딩'}할 텍스트를 입력하세요... (Cmd/Ctrl+Enter로 실행)`}
                    style={{
                      flex: 1,
                      resize: 'none',
                      fontFamily: encodingType === 'base64' || operationType === 'decode' ? 'monospace' : 'inherit',
                      maxHeight: 'calc(100vh - 440px)',
                      overflowY: 'auto'
                    }}
                  />
                </div>
              </Card>
            </Col>

            <Col span={12} style={{ height: '100%' }}>
              <Card
                title="결과"
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                styles={{
                  body: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px'
                  }
                }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong>{operationType === 'encode' ? '인코딩된 텍스트' : '디코딩된 텍스트'}</Text>
                    <Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {getCharacterCount(outputText)}
                      </Text>
                      {outputText && (
                        <>
                          <Button
                            size="small"
                            icon={<ExpandOutlined />}
                            onClick={() => handleFullScreenEdit('output')}
                            title="전체 화면으로 보기"
                          />
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopy(outputText)}
                            title="결과 복사"
                          />
                        </>
                      )}
                    </Space>
                  </div>
                  <TextArea
                    value={outputText}
                    readOnly
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      backgroundColor: '#f5f5f5',
                      resize: 'none',
                      maxHeight: 'calc(100vh - 440px)',
                      overflowY: 'auto'
                    }}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* 전체 화면 편집 모달 */}
      <Modal
        title={
          fullScreenType === 'input' 
            ? `${encodingType.toUpperCase()} ${operationType === 'encode' ? '인코딩' : '디코딩'}할 텍스트 편집`
            : `${encodingType.toUpperCase()} ${operationType === 'encode' ? '인코딩' : '디코딩'} 결과 보기`
        }
        open={fullScreenModalVisible}
        onCancel={() => setFullScreenModalVisible(false)}
        width="90vw"
        style={{ top: 20 }}
        styles={{
          body: {
            height: 'calc(100vh - 200px)',
            padding: '24px'
          }
        }}
        footer={
          fullScreenType === 'input' ? [
            <Button key="cancel" onClick={() => setFullScreenModalVisible(false)}>
              취소
            </Button>,
            <Button key="save" type="primary" onClick={handleFullScreenSave}>
              저장
            </Button>
          ] : [
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
          ]
        }
      >
        <TextArea
          value={fullScreenContent}
          onChange={(e) => setFullScreenContent(e.target.value)}
          onKeyDown={fullScreenType === 'input' ? (e) => {
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
          placeholder={
            fullScreenType === 'input' 
              ? `${encodingType.toUpperCase()} ${operationType === 'encode' ? '인코딩' : '디코딩'}할 텍스트를 입력하세요... (Cmd/Ctrl+Enter로 저장)`
              : ''
          }
        />
        <div style={{
          marginTop: '8px',
          textAlign: 'right',
          fontSize: '12px',
          color: '#666'
        }}>
          {getCharacterCount(fullScreenContent)}
        </div>
      </Modal>
    </div>
  );
};

export default EncodingToolsPage;