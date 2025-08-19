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
  Alert
} from 'antd';
import { 
  LockOutlined, 
  UnlockOutlined, 
  CopyOutlined,
  ClearOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { useKeys } from '../store/KeyContext';
import { RSA_ALGORITHMS, DEFAULT_ENCRYPTION_OPTIONS } from '../../shared/constants';

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

  // 선택된 키가 변경될 때마다 selectedKey 업데이트
  useEffect(() => {
    const key = keys.find(k => k.id === selectedKeyId);
    selectKey(key || null);
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
      console.error(error);
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
      console.error(error);
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

  return (
    <div style={{ padding: '24px', minHeight: '100%' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2}>RSA 암호화/복호화</Title>
        
        {/* 키 선택 및 알고리즘 선택 섹션 */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
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
            
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>암호화 알고리즘</Text>
                <Select
                  style={{ width: '100%' }}
                  value={algorithm}
                  onChange={setAlgorithm}
                >
                  {RSA_ALGORITHMS.map(algo => (
                    <Select.Option key={algo} value={algo}>
                      {algo}
                    </Select.Option>
                  ))}
                </Select>
              </Space>
            </Col>
            
            <Col span={8}>
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
                  </div>
                </Space>
              )}
            </Col>
          </Row>
          
          {keys.length === 0 && (
            <Alert
              message="키가 없습니다"
              description="먼저 키 관리 탭에서 RSA 키를 생성해주세요."
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
        
        <Tabs defaultActiveKey="encrypt" size="large">
          <TabPane 
            tab={
              <span>
                <LockOutlined />
                암호화
              </span>
            } 
            key="encrypt"
          >
            <Row gutter={24}>
              <Col span={12}>
                <Card title="입력" style={{ height: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <Text strong>암호화할 텍스트</Text>
                      <TextArea
                        value={encryptText}
                        onChange={(e) => setEncryptText(e.target.value)}
                        placeholder="암호화할 텍스트를 입력하세요..."
                        rows={15}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                    
                    <Space>
                      <Button 
                        type="primary" 
                        icon={<LockOutlined />}
                        loading={loading}
                        onClick={handleEncrypt}
                        disabled={!selectedKey || !encryptText.trim()}
                      >
                        암호화
                      </Button>
                      <Button 
                        icon={<ClearOutlined />}
                        onClick={() => handleClear('encrypt')}
                      >
                        초기화
                      </Button>
                    </Space>
                  </Space>
                </Card>
              </Col>
              
              <Col span={12}>
                <Card title="결과" style={{ height: '100%' }}>
                  <div>
                    <Text strong>암호화된 텍스트</Text>
                    <TextArea
                      value={encryptedResult}
                      readOnly
                      rows={17}
                      style={{ 
                        marginTop: 8, 
                        fontFamily: 'monospace',
                        backgroundColor: '#f5f5f5'
                      }}
                    />
                    {encryptedResult && (
                      <Button 
                        type="link" 
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(encryptedResult)}
                        style={{ marginTop: 8 }}
                      >
                        복사
                      </Button>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <UnlockOutlined />
                복호화
              </span>
            } 
            key="decrypt"
          >
            <Row gutter={24}>
              <Col span={12}>
                <Card title="입력" style={{ height: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <Text strong>복호화할 텍스트</Text>
                      <TextArea
                        value={decryptText}
                        onChange={(e) => setDecryptText(e.target.value)}
                        placeholder="복호화할 암호화된 텍스트를 입력하세요..."
                        rows={15}
                        style={{ 
                          marginTop: 8,
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                    
                    <Space>
                      <Button 
                        type="primary" 
                        icon={<UnlockOutlined />}
                        loading={loading}
                        onClick={handleDecrypt}
                        disabled={!selectedKey || !decryptText.trim()}
                      >
                        복호화
                      </Button>
                      <Button 
                        icon={<ClearOutlined />}
                        onClick={() => handleClear('decrypt')}
                      >
                        초기화
                      </Button>
                    </Space>
                  </Space>
                </Card>
              </Col>
              
              <Col span={12}>
                <Card title="결과" style={{ height: '100%' }}>
                  <div>
                    <Text strong>복호화된 텍스트</Text>
                    <TextArea
                      value={decryptedResult}
                      readOnly
                      rows={17}
                      style={{ 
                        marginTop: 8,
                        backgroundColor: '#f5f5f5'
                      }}
                    />
                    {decryptedResult && (
                      <Button 
                        type="link" 
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(decryptedResult)}
                        style={{ marginTop: 8 }}
                      >
                        복사
                      </Button>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default MainPage;