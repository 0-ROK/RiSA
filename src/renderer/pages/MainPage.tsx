import React, { useState } from 'react';
import { 
  Layout, 
  Card, 
  Tabs, 
  Input, 
  Button, 
  Select, 
  Space, 
  Typography, 
  message,
  Row,
  Col 
} from 'antd';
import { 
  LockOutlined, 
  UnlockOutlined, 
  CopyOutlined,
  ClearOutlined
} from '@ant-design/icons';

const { Content } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MainPage: React.FC = () => {
  const [encryptText, setEncryptText] = useState('');
  const [encryptedResult, setEncryptedResult] = useState('');
  const [decryptText, setDecryptText] = useState('');
  const [decryptedResult, setDecryptedResult] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEncrypt = async () => {
    if (!encryptText.trim() || !publicKey.trim()) {
      message.error('텍스트와 공개키를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.encryptText(encryptText, publicKey);
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
    if (!decryptText.trim() || !privateKey.trim()) {
      message.error('암호화된 텍스트와 개인키를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.decryptText(decryptText, privateKey);
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
      setPublicKey('');
    } else {
      setDecryptText('');
      setDecryptedResult('');
      setPrivateKey('');
    }
  };

  return (
    <Content style={{ padding: '24px', background: '#f0f2f5' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2}>RSA 암호화/복호화</Title>
        
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
                        rows={6}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                    
                    <div>
                      <Text strong>공개키 (Public Key)</Text>
                      <TextArea
                        value={publicKey}
                        onChange={(e) => setPublicKey(e.target.value)}
                        placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                        rows={8}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                    
                    <Space>
                      <Button 
                        type="primary" 
                        icon={<LockOutlined />}
                        loading={loading}
                        onClick={handleEncrypt}
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
                      rows={20}
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
                      <Text strong>암호화된 텍스트</Text>
                      <TextArea
                        value={decryptText}
                        onChange={(e) => setDecryptText(e.target.value)}
                        placeholder="복호화할 암호화된 텍스트를 입력하세요..."
                        rows={6}
                        style={{ 
                          marginTop: 8,
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                    
                    <div>
                      <Text strong>개인키 (Private Key)</Text>
                      <TextArea
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                        rows={8}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                    
                    <Space>
                      <Button 
                        type="primary" 
                        icon={<UnlockOutlined />}
                        loading={loading}
                        onClick={handleDecrypt}
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
                      rows={20}
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
    </Content>
  );
};

export default MainPage;