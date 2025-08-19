import React, { useState, useEffect } from 'react';
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
  Select,
  Alert,
  Modal
} from 'antd';
import { 
  LockOutlined, 
  UnlockOutlined, 
  CopyOutlined,
  ClearOutlined,
  KeyOutlined,
  ExpandOutlined,
  CompressOutlined
} from '@ant-design/icons';
import { useKeys } from '../store/KeyContext';
import { DEFAULT_ENCRYPTION_OPTIONS } from '../../shared/constants';
import AlgorithmSelector from '../components/AlgorithmSelector';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MainPage: React.FC = () => {
  const { keys, selectedKey, selectKey } = useKeys();
  const [encryptText, setEncryptText] = useState('');
  const [encryptedResult, setEncryptedResult] = useState('');
  const [decryptText, setDecryptText] = useState('');
  const [decryptedResult, setDecryptedResult] = useState('');
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [algorithm, setAlgorithm] = useState<string>(DEFAULT_ENCRYPTION_OPTIONS.algorithm);
  const [loading, setLoading] = useState(false);
  const [fullScreenModalVisible, setFullScreenModalVisible] = useState(false);
  const [fullScreenType, setFullScreenType] = useState<'encrypt' | 'decrypt' | 'result'>('encrypt');
  const [fullScreenContent, setFullScreenContent] = useState('');
  const [activeTab, setActiveTab] = useState('encrypt');

  // 선택된 키가 변경될 때마다 selectedKey 업데이트 및 알고리즘 자동 설정
  useEffect(() => {
    const key = keys.find(k => k.id === selectedKeyId);
    selectKey(key || null);
    
    // 키의 선호 알고리즘이 있으면 자동 설정
    if (key && key.preferredAlgorithm) {
      setAlgorithm(key.preferredAlgorithm);
    }
  }, [selectedKeyId, keys, selectKey]);

  const handleEncrypt = async () => {
    if (!encryptText.trim()) {
      message.error('암호화할 텍스트를 입력해주세요.');
      return;
    }

    if (!selectedKey) {
      message.error('암호화에 사용할 키를 선택해주세요.');
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.encryptText(
        encryptText, 
        selectedKey.publicKey,
        algorithm
      );
      setEncryptedResult(result.data);
      message.success('암호화가 완료되었습니다.');
    } catch (error) {
      message.error('암호화 중 오류가 발생했습니다.');
      console.error('Encryption error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    if (!decryptText.trim()) {
      message.error('복호화할 텍스트를 입력해주세요.');
      return;
    }

    if (!selectedKey) {
      message.error('복호화에 사용할 키를 선택해주세요.');
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.decryptText(
        decryptText, 
        selectedKey.privateKey,
        algorithm
      );
      setDecryptedResult(result);
      message.success('복호화가 완료되었습니다.');
    } catch (error) {
      message.error('복호화 중 오류가 발생했습니다. 키와 텍스트를 확인해주세요.');
      console.error('Decryption error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('클립보드에 복사되었습니다.');
    } catch (error) {
      message.error('복사 중 오류가 발생했습니다.');
    }
  };

  const handleClear = (type: 'encrypt' | 'decrypt') => {
    if (type === 'encrypt') {
      setEncryptText('');
      setEncryptedResult('');
    } else {
      setDecryptText('');
      setDecryptedResult('');
    }
  };

  const handleFullScreenEdit = (type: 'encrypt' | 'decrypt' | 'result') => {
    let content = '';
    if (type === 'encrypt') content = encryptText;
    else if (type === 'decrypt') content = decryptText;
    else if (type === 'result') content = encryptedResult || decryptedResult;
    
    setFullScreenType(type);
    setFullScreenContent(content);
    setFullScreenModalVisible(true);
  };

  const handleFullScreenSave = () => {
    if (fullScreenType === 'encrypt') {
      setEncryptText(fullScreenContent);
    } else if (fullScreenType === 'decrypt') {
      setDecryptText(fullScreenContent);
    }
    setFullScreenModalVisible(false);
  };

  const getCharacterCount = (text: string) => {
    return `${text.length} 문자`;
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'encrypt' | 'decrypt') => {
    // Cmd+Enter (macOS) 또는 Ctrl+Enter (Windows/Linux)
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      
      // 기본 조건 확인
      if (loading) {
        return;
      }
      
      if (!selectedKey) {
        message.error('먼저 키를 선택해주세요.');
        return;
      }
      
      const hasInputText = type === 'encrypt' ? encryptText.trim() : decryptText.trim();
      if (!hasInputText) {
        message.error(`${type === 'encrypt' ? '암호화' : '복호화'}할 텍스트를 입력해주세요.`);
        return;
      }
      
      // 실행
      if (type === 'encrypt') {
        handleEncrypt();
      } else {
        handleDecrypt();
      }
    }
  };

  // 탭 오른쪽에 표시할 버튼들
  const renderTabBarExtraContent = () => {
    const isEncryptTab = activeTab === 'encrypt';
    const hasInputText = isEncryptTab ? encryptText.trim() : decryptText.trim();
    const canExecute = selectedKey && hasInputText && !loading;
    
    return (
      <Space>
        <Button 
          type="primary" 
          icon={isEncryptTab ? <LockOutlined /> : <UnlockOutlined />}
          loading={loading}
          onClick={isEncryptTab ? handleEncrypt : handleDecrypt}
          disabled={!canExecute}
          title={isEncryptTab ? "암호화 (Cmd/Ctrl+Enter)" : "복호화 (Cmd/Ctrl+Enter)"}
        >
          {isEncryptTab ? '암호화' : '복호화'}
        </Button>
        <Button 
          icon={<ClearOutlined />}
          onClick={() => handleClear(isEncryptTab ? 'encrypt' : 'decrypt')}
          disabled={loading}
          title="입력 및 결과 초기화"
        >
          초기화
        </Button>
      </Space>
    );
  };

  return (
    <div style={{ 
      padding: '24px', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        <Title level={2} style={{ marginBottom: '16px', flexShrink: 0 }}>RSA 암호화/복호화</Title>
        
        {/* 키 선택 및 알고리즘 선택 섹션 */}
        <Card style={{ marginBottom: 16, flexShrink: 0 }}>
          <Row gutter={[16, 16]} align="top">
            <Col xs={24} md={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>
                  <KeyOutlined style={{ marginRight: 8 }} />
                  사용할 키 선택
                </Text>
                <Select
                  placeholder="키를 선택하세요"
                  style={{ width: '100%' }}
                  value={selectedKeyId || undefined}
                  onChange={setSelectedKeyId}
                  showSearch
                  optionFilterProp="children"
                >
                  {keys.map(key => (
                    <Select.Option key={key.id} value={key.id}>
                      {key.name} ({key.keySize} bits)
                    </Select.Option>
                  ))}
                </Select>
              </Space>
            </Col>
            
            <Col xs={24} md={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>암호화 알고리즘</Text>
                <AlgorithmSelector
                  value={algorithm as 'RSA-OAEP' | 'RSA-PKCS1'}
                  onChange={setAlgorithm}
                  showWarning={false}
                />
              </Space>
            </Col>
            
            <Col xs={24} md={8}>
              {selectedKey && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>선택된 키 정보</Text>
                  <div style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#f0f2f5', 
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <div><strong>이름:</strong> {selectedKey.name}</div>
                    <div><strong>크기:</strong> {selectedKey.keySize} bits</div>
                    <div><strong>생성일:</strong> {new Date(selectedKey.created).toLocaleDateString('ko-KR')}</div>
                    {selectedKey.preferredAlgorithm && (
                      <div><strong>선호 알고리즘:</strong> {selectedKey.preferredAlgorithm}</div>
                    )}
                  </div>
                </Space>
              )}
            </Col>
          </Row>

          {/* 경고 메시지들을 별도 섹션으로 분리 */}
          {(algorithm === 'RSA-PKCS1' || keys.length === 0) && (
            <div style={{ marginTop: 16 }}>
              {algorithm === 'RSA-PKCS1' && (
                <Alert
                  message="보안 알림"
                  description="RSA-PKCS1 패딩은 보안상 지원되지 않아 OAEP 패딩이 대신 사용됩니다."
                  type="warning"
                  showIcon
                  style={{ marginBottom: keys.length === 0 ? 12 : 0 }}
                />
              )}
              
              {keys.length === 0 && (
                <Alert
                  message="키가 없습니다"
                  description="먼저 키 관리 탭에서 RSA 키를 생성해주세요."
                  type="warning"
                  showIcon
                />
              )}
            </div>
          )}
        </Card>
        
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Tabs 
            defaultActiveKey="encrypt" 
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            style={{ height: '100%' }}
            tabBarExtraContent={renderTabBarExtraContent()}
            items={[
              {
                key: 'encrypt',
                label: (
                  <span>
                    <LockOutlined />
                    암호화
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
                          bodyStyle={{ 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '16px'
                          }}
                        >
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text strong>암호화할 텍스트</Text>
                              <Space>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {getCharacterCount(encryptText)}
                                </Text>
                                <Button
                                  size="small"
                                  icon={<ExpandOutlined />}
                                  onClick={() => handleFullScreenEdit('encrypt')}
                                  title="전체 화면으로 편집"
                                />
                              </Space>
                            </div>
                            <TextArea
                              value={encryptText}
                              onChange={(e) => setEncryptText(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, 'encrypt')}
                              placeholder="암호화할 텍스트를 입력하세요... (Cmd/Ctrl+Enter로 암호화)"
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
                          bodyStyle={{ 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '16px'
                          }}
                        >
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text strong>암호화된 텍스트</Text>
                              <Space>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {getCharacterCount(encryptedResult)}
                                </Text>
                                {encryptedResult && (
                                  <>
                                    <Button
                                      size="small"
                                      icon={<ExpandOutlined />}
                                      onClick={() => handleFullScreenEdit('result')}
                                      title="전체 화면으로 보기"
                                    />
                                    <Button
                                      size="small"
                                      icon={<CopyOutlined />}
                                      onClick={() => handleCopy(encryptedResult)}
                                      title="클립보드에 복사"
                                    />
                                  </>
                                )}
                              </Space>
                            </div>
                            <TextArea
                              value={encryptedResult}
                              readOnly
                              style={{ 
                                flex: 1,
                                fontFamily: 'monospace',
                                backgroundColor: '#f5f5f5',
                                resize: 'none',
                                maxHeight: 'calc(100vh - 450px)',
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
                key: 'decrypt',
                label: (
                  <span>
                    <UnlockOutlined />
                    복호화
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
                          bodyStyle={{ 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '16px'
                          }}
                        >
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text strong>복호화할 텍스트</Text>
                              <Space>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {getCharacterCount(decryptText)}
                                </Text>
                                <Button
                                  size="small"
                                  icon={<ExpandOutlined />}
                                  onClick={() => handleFullScreenEdit('decrypt')}
                                  title="전체 화면으로 편집"
                                />
                              </Space>
                            </div>
                            <TextArea
                              value={decryptText}
                              onChange={(e) => setDecryptText(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, 'decrypt')}
                              placeholder="복호화할 암호화된 텍스트를 입력하세요... (Cmd/Ctrl+Enter로 복호화)"
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
                          bodyStyle={{ 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '16px'
                          }}
                        >
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text strong>복호화된 텍스트</Text>
                              <Space>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {getCharacterCount(decryptedResult)}
                                </Text>
                                {decryptedResult && (
                                  <>
                                    <Button
                                      size="small"
                                      icon={<ExpandOutlined />}
                                      onClick={() => handleFullScreenEdit('result')}
                                      title="전체 화면으로 보기"
                                    />
                                    <Button
                                      size="small"
                                      icon={<CopyOutlined />}
                                      onClick={() => handleCopy(decryptedResult)}
                                      title="클립보드에 복사"
                                    />
                                  </>
                                )}
                              </Space>
                            </div>
                            <TextArea
                              value={decryptedResult}
                              readOnly
                              style={{ 
                                flex: 1,
                                backgroundColor: '#f5f5f5',
                                resize: 'none',
                                maxHeight: 'calc(100vh - 450px)',
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
          fullScreenType === 'encrypt' ? '암호화할 텍스트 편집' :
          fullScreenType === 'decrypt' ? '복호화할 텍스트 편집' :
          '결과 보기'
        }
        open={fullScreenModalVisible}
        onCancel={() => setFullScreenModalVisible(false)}
        width="90vw"
        style={{ top: 20 }}
        bodyStyle={{ 
          height: 'calc(100vh - 200px)',
          padding: '24px'
        }}
        footer={
          fullScreenType !== 'result' ? [
            <Button key="cancel" onClick={() => setFullScreenModalVisible(false)}>
              취소
            </Button>,
            <Button key="save" type="primary" onClick={handleFullScreenSave}>
              저장
            </Button>
          ] : [
            <Button key="copy" icon={<CopyOutlined />} onClick={() => handleCopy(fullScreenContent)}>
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
          onKeyDown={fullScreenType !== 'result' ? (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleFullScreenSave();
            }
          } : undefined}
          readOnly={fullScreenType === 'result'}
          style={{
            height: '100%',
            resize: 'none',
            fontFamily: fullScreenType === 'decrypt' || fullScreenType === 'result' ? 'monospace' : 'inherit',
            fontSize: '14px'
          }}
          placeholder={
            fullScreenType === 'encrypt' ? '암호화할 텍스트를 입력하세요... (Cmd/Ctrl+Enter로 저장)' :
            fullScreenType === 'decrypt' ? '복호화할 암호화된 텍스트를 입력하세요... (Cmd/Ctrl+Enter로 저장)' :
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

export default MainPage;