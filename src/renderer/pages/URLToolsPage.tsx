import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Input,
  Button,
  Space,
  Typography,
  message,
  Row,
  Col,
  Modal,
  notification
} from 'antd';
import {
  LinkOutlined,
  CopyOutlined,
  ClearOutlined,
  ExpandOutlined,
  CheckOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useHistory } from '../store/HistoryContext';
import { HistoryItem } from '../../shared/types';
import PageHeader from '../components/PageHeader';

const { TextArea } = Input;
const { Text } = Typography;

const URLToolsPage: React.FC = () => {
  const { saveHistoryItem } = useHistory();
  const [encodeInput, setEncodeInput] = useState('');
  const [encodeOutput, setEncodeOutput] = useState('');
  const [decodeInput, setDecodeInput] = useState('');
  const [decodeOutput, setDecodeOutput] = useState('');
  const [fullScreenModalVisible, setFullScreenModalVisible] = useState(false);
  const [fullScreenType, setFullScreenType] = useState<'encodeInput' | 'encodeOutput' | 'decodeInput' | 'decodeOutput'>('encodeInput');
  const [fullScreenContent, setFullScreenContent] = useState('');
  const [activeTab, setActiveTab] = useState('encode');

  const handleEncode = async () => {
    if (!encodeInput.trim()) {
      message.error('인코딩할 텍스트를 입력해주세요.');
      return;
    }

    try {
      const encoded = encodeURIComponent(encodeInput);
      setEncodeOutput(encoded);
      message.success('URL 인코딩이 완료되었습니다.');

      // 히스토리에 저장
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: 'url-encode',
        inputText: encodeInput,
        outputText: encoded,
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
      notification.error({
        message: 'URL 인코딩 실패',
        description: `인코딩 중 오류가 발생했습니다: ${errorMessage}`,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        placement: 'topRight',
        duration: 5,
      });
      console.error('Encoding error:', error);

      // 실패 히스토리 저장
      const failedHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: 'url-encode',
        inputText: encodeInput,
        outputText: '',
        success: false,
        errorMessage: errorMessage,
        timestamp: new Date(),
      };

      try {
        await saveHistoryItem(failedHistoryItem);
      } catch (historyError) {
        console.error('Failed to save failed encoding history:', historyError);
      }
    }
  };

  const handleDecode = async () => {
    if (!decodeInput.trim()) {
      message.error('디코딩할 텍스트를 입력해주세요.');
      return;
    }

    try {
      const decoded = decodeURIComponent(decodeInput);
      setDecodeOutput(decoded);
      message.success('URL 디코딩이 완료되었습니다.');

      // 히스토리에 저장
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: 'url-decode',
        inputText: decodeInput,
        outputText: decoded,
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
      if (errorMessage.includes('URI')) {
        helpText = '올바른 URL 인코딩 형식이 아닙니다. % 기호 뒤에는 정확히 2개의 16진수 문자가 와야 합니다.';
      } else {
        helpText = '입력된 데이터가 올바른 URL 인코딩 형식인지 확인해주세요.';
      }

      notification.error({
        message: 'URL 디코딩 실패',
        description: (
          <div>
            <div style={{ marginBottom: 8, color: '#ff4d4f' }}><strong>{errorMessage}</strong></div>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
              {helpText}
            </div>
          </div>
        ),
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        placement: 'topRight',
        duration: 8,
        style: { width: 400 },
      });
      console.error('Decoding error:', error);

      // 실패 히스토리 저장
      const failedHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: 'url-decode',
        inputText: decodeInput,
        outputText: '',
        success: false,
        errorMessage: errorMessage,
        timestamp: new Date(),
      };

      try {
        await saveHistoryItem(failedHistoryItem);
      } catch (historyError) {
        console.error('Failed to save failed decoding history:', historyError);
      }
    }
  };

  const handleCopy = async (text: string, type?: string) => {
    try {
      await navigator.clipboard.writeText(text);

      const size = text.length;
      const sizeText = size > 1000 ? `${Math.round(size / 1000)}KB` : `${size}자`;

      let title = '';
      let description = '';

      if (type === 'encoded') {
        title = 'URL 인코딩 결과 복사됨';
        description = `${sizeText}의 인코딩된 데이터가 클립보드에 복사되었습니다.`;
      } else if (type === 'decoded') {
        title = 'URL 디코딩 결과 복사됨';
        description = `${sizeText}의 디코딩된 텍스트가 클립보드에 복사되었습니다.`;
      } else {
        title = '클립보드에 복사됨';
        description = `${sizeText}의 데이터가 복사되었습니다.`;
      }

      notification.success({
        message: title,
        description,
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

  const handleClear = (type: 'encode' | 'decode') => {
    if (type === 'encode') {
      setEncodeInput('');
      setEncodeOutput('');
    } else {
      setDecodeInput('');
      setDecodeOutput('');
    }
  };

  const handleFullScreenEdit = (type: 'encodeInput' | 'encodeOutput' | 'decodeInput' | 'decodeOutput') => {
    let content = '';
    if (type === 'encodeInput') content = encodeInput;
    else if (type === 'encodeOutput') content = encodeOutput;
    else if (type === 'decodeInput') content = decodeInput;
    else if (type === 'decodeOutput') content = decodeOutput;

    setFullScreenType(type);
    setFullScreenContent(content);
    setFullScreenModalVisible(true);
  };

  const handleFullScreenSave = () => {
    if (fullScreenType === 'encodeInput') {
      setEncodeInput(fullScreenContent);
    } else if (fullScreenType === 'decodeInput') {
      setDecodeInput(fullScreenContent);
    }
    setFullScreenModalVisible(false);
  };

  const getCharacterCount = (text: string) => {
    return `${text.length} 문자`;
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'encode' | 'decode') => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();

      const hasInputText = type === 'encode' ? encodeInput.trim() : decodeInput.trim();
      if (!hasInputText) {
        message.error(`${type === 'encode' ? '인코딩' : '디코딩'}할 텍스트를 입력해주세요.`);
        return;
      }

      if (type === 'encode') {
        handleEncode();
      } else {
        handleDecode();
      }
    }
  };

  const renderTabBarExtraContent = () => {
    const isEncodeTab = activeTab === 'encode';
    const hasInputText = isEncodeTab ? encodeInput.trim() : decodeInput.trim();

    return (
      <Space>
        <Button
          type="primary"
          icon={<LinkOutlined />}
          onClick={isEncodeTab ? handleEncode : handleDecode}
          disabled={!hasInputText}
          title={isEncodeTab ? "URL 인코딩 (Cmd/Ctrl+Enter)" : "URL 디코딩 (Cmd/Ctrl+Enter)"}
        >
          {isEncodeTab ? '인코딩' : '디코딩'}
        </Button>
        <Button
          icon={<ClearOutlined />}
          onClick={() => handleClear(isEncodeTab ? 'encode' : 'decode')}
          title="입력 및 결과 초기화"
        >
          초기화
        </Button>
      </Space>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <PageHeader 
        title="URL 인코딩/디코딩"
        icon={<LinkOutlined />}
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
              <LinkOutlined style={{ marginRight: 8 }} />
              URL 인코딩/디코딩 도구
            </Text>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              URL에 포함될 수 없는 특수 문자를 안전하게 변환하거나 복원합니다.
              encodeURIComponent와 decodeURIComponent 함수를 사용합니다.
            </Text>
          </Space>
        </Card>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Tabs
            defaultActiveKey="encode"
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            style={{ height: '100%' }}
            tabBarExtraContent={renderTabBarExtraContent()}
            items={[
              {
                key: 'encode',
                label: (
                  <span>
                    <LinkOutlined />
                    URL 인코딩
                  </span>
                ),
                children: (
                  <div style={{ height: 'calc(100vh - 280px)', overflow: 'hidden' }}>
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
                              <Text strong>인코딩할 텍스트</Text>
                              <Space>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {getCharacterCount(encodeInput)}
                                </Text>
                                <Button
                                  size="small"
                                  icon={<ExpandOutlined />}
                                  onClick={() => handleFullScreenEdit('encodeInput')}
                                  title="전체 화면으로 편집"
                                />
                              </Space>
                            </div>
                            <TextArea
                              value={encodeInput}
                              onChange={(e) => setEncodeInput(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, 'encode')}
                              placeholder="URL 인코딩할 텍스트를 입력하세요... (Cmd/Ctrl+Enter로 인코딩)"
                              style={{
                                flex: 1,
                                resize: 'none',
                                maxHeight: 'calc(100vh - 400px)',
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
                              <Text strong>인코딩된 텍스트</Text>
                              <Space>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {getCharacterCount(encodeOutput)}
                                </Text>
                                {encodeOutput && (
                                  <>
                                    <Button
                                      size="small"
                                      icon={<ExpandOutlined />}
                                      onClick={() => handleFullScreenEdit('encodeOutput')}
                                      title="전체 화면으로 보기"
                                    />
                                    <Button
                                      size="small"
                                      icon={<CopyOutlined />}
                                      onClick={() => handleCopy(encodeOutput, 'encoded')}
                                      title="인코딩 결과 복사"
                                    />
                                  </>
                                )}
                              </Space>
                            </div>
                            <TextArea
                              value={encodeOutput}
                              readOnly
                              style={{
                                flex: 1,
                                fontFamily: 'monospace',
                                backgroundColor: '#f5f5f5',
                                resize: 'none',
                                maxHeight: 'calc(100vh - 400px)',
                                overflowY: 'auto'
                              }}
                            />
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                )
              },
              {
                key: 'decode',
                label: (
                  <span>
                    <LinkOutlined />
                    URL 디코딩
                  </span>
                ),
                children: (
                  <div style={{ height: 'calc(100vh - 280px)', overflow: 'hidden' }}>
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
                              <Text strong>디코딩할 텍스트</Text>
                              <Space>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {getCharacterCount(decodeInput)}
                                </Text>
                                <Button
                                  size="small"
                                  icon={<ExpandOutlined />}
                                  onClick={() => handleFullScreenEdit('decodeInput')}
                                  title="전체 화면으로 편집"
                                />
                              </Space>
                            </div>
                            <TextArea
                              value={decodeInput}
                              onChange={(e) => setDecodeInput(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, 'decode')}
                              placeholder="URL 디코딩할 텍스트를 입력하세요... (Cmd/Ctrl+Enter로 디코딩)"
                              style={{
                                flex: 1,
                                fontFamily: 'monospace',
                                resize: 'none',
                                maxHeight: 'calc(100vh - 400px)',
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
                              <Text strong>디코딩된 텍스트</Text>
                              <Space>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {getCharacterCount(decodeOutput)}
                                </Text>
                                {decodeOutput && (
                                  <>
                                    <Button
                                      size="small"
                                      icon={<ExpandOutlined />}
                                      onClick={() => handleFullScreenEdit('decodeOutput')}
                                      title="전체 화면으로 보기"
                                    />
                                    <Button
                                      size="small"
                                      icon={<CopyOutlined />}
                                      onClick={() => handleCopy(decodeOutput, 'decoded')}
                                      title="디코딩 결과 복사"
                                    />
                                  </>
                                )}
                              </Space>
                            </div>
                            <TextArea
                              value={decodeOutput}
                              readOnly
                              style={{
                                flex: 1,
                                backgroundColor: '#f5f5f5',
                                resize: 'none',
                                maxHeight: 'calc(100vh - 400px)',
                                overflowY: 'auto'
                              }}
                            />
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>

      {/* 전체 화면 편집 모달 */}
      <Modal
        title={
          fullScreenType === 'encodeInput' ? 'URL 인코딩할 텍스트 편집' :
            fullScreenType === 'encodeOutput' ? 'URL 인코딩 결과 보기' :
              fullScreenType === 'decodeInput' ? 'URL 디코딩할 텍스트 편집' :
                'URL 디코딩 결과 보기'
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
          (fullScreenType === 'encodeInput' || fullScreenType === 'decodeInput') ? [
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
              onClick={() => {
                const type = fullScreenType === 'encodeOutput' ? 'encoded' : 'decoded';
                handleCopy(fullScreenContent, type);
              }}
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
          onKeyDown={(fullScreenType === 'encodeInput' || fullScreenType === 'decodeInput') ? (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleFullScreenSave();
            }
          } : undefined}
          readOnly={fullScreenType === 'encodeOutput' || fullScreenType === 'decodeOutput'}
          style={{
            height: '100%',
            resize: 'none',
            fontFamily: (fullScreenType === 'decodeInput' || fullScreenType === 'encodeOutput') ? 'monospace' : 'inherit',
            fontSize: '14px'
          }}
          placeholder={
            fullScreenType === 'encodeInput' ? 'URL 인코딩할 텍스트를 입력하세요... (Cmd/Ctrl+Enter로 저장)' :
              fullScreenType === 'decodeInput' ? 'URL 디코딩할 텍스트를 입력하세요... (Cmd/Ctrl+Enter로 저장)' :
                ''
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

export default URLToolsPage;