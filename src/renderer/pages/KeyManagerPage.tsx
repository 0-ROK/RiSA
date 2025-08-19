import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Space, 
  Typography, 
  message,
  Modal,
  Input,
  Select,
  Form,
  Popconfirm,
  Tooltip
} from 'antd';
import { 
  KeyOutlined, 
  PlusOutlined, 
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { useSettings } from '../store/SettingsContext';
import { RSAKeyPair } from '../../shared/types';
import { RSA_KEY_SIZES } from '../../shared/constants';

const { Title, Text } = Typography;
const { TextArea } = Input;

const KeyManagerPage: React.FC = () => {
  const { settings } = useSettings();
  const [keys, setKeys] = useState<RSAKeyPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState<RSAKeyPair | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    // In a real implementation, you'd fetch keys from the main process
    // For now, we'll use a placeholder
    setKeys([]);
  };

  const handleGenerateKey = async (values: { keySize: number }) => {
    setLoading(true);
    try {
      const keyPair = await window.electronAPI.generateRSAKeys(values.keySize);
      setKeys(prev => [...prev, keyPair]);
      setGenerateModalVisible(false);
      form.resetFields();
      message.success(`${values.keySize}bit RSA 키가 생성되었습니다.`);
    } catch (error) {
      message.error('키 생성 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewKey = (key: RSAKeyPair) => {
    setSelectedKey(key);
    setShowPrivateKey(false);
    setViewModalVisible(true);
  };

  const handleCopyKey = async (keyData: string, keyType: 'public' | 'private') => {
    try {
      await navigator.clipboard.writeText(keyData);
      message.success(`${keyType === 'public' ? '공개' : '개인'}키가 클립보드에 복사되었습니다.`);
    } catch (error) {
      message.error('복사 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteKey = (key: RSAKeyPair) => {
    setKeys(prev => prev.filter(k => k.created !== key.created));
    message.success('키가 삭제되었습니다.');
  };

  const columns = [
    {
      title: '키 크기',
      dataIndex: 'keySize',
      key: 'keySize',
      render: (size: number) => `${size} bits`,
      width: 120,
    },
    {
      title: '생성 일시',
      dataIndex: 'created',
      key: 'created',
      render: (date: Date) => new Date(date).toLocaleString('ko-KR'),
      width: 180,
    },
    {
      title: '공개키 (미리보기)',
      dataIndex: 'publicKey',
      key: 'publicKey',
      render: (publicKey: string) => (
        <Text 
          ellipsis={{ tooltip: true }}
          style={{ 
            fontFamily: 'monospace', 
            fontSize: '12px',
            maxWidth: '300px'
          }}
        >
          {publicKey.substring(0, 50)}...
        </Text>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 200,
      render: (_: any, record: RSAKeyPair) => (
        <Space size="small">
          <Tooltip title="키 보기">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewKey(record)}
            />
          </Tooltip>
          
          <Tooltip title="공개키 복사">
            <Button 
              icon={<CopyOutlined />} 
              size="small"
              onClick={() => handleCopyKey(record.publicKey, 'public')}
            />
          </Tooltip>
          
          <Tooltip title="키 삭제">
            <Popconfirm
              title="이 키를 삭제하시겠습니까?"
              description="삭제된 키는 복구할 수 없습니다."
              onConfirm={() => handleDeleteKey(record)}
              okText="삭제"
              cancelText="취소"
            >
              <Button 
                icon={<DeleteOutlined />} 
                size="small"
                danger
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100%' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 24
        }}>
          <Title level={2}>
            <KeyOutlined style={{ marginRight: 8 }} />
            키 관리
          </Title>
          
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setGenerateModalVisible(true)}
            size="large"
          >
            새 키 생성
          </Button>
        </div>

        <Card>
          <Table
            columns={columns}
            dataSource={keys}
            rowKey={(record) => record.created.toString()}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `총 ${total}개의 키`,
            }}
            locale={{
              emptyText: '생성된 키가 없습니다. 새 키를 생성해보세요.',
            }}
          />
        </Card>

        {/* 키 생성 모달 */}
        <Modal
          title="새 RSA 키 생성"
          open={generateModalVisible}
          onCancel={() => {
            setGenerateModalVisible(false);
            form.resetFields();
          }}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleGenerateKey}
            initialValues={{ keySize: settings.rsaKeySize }}
          >
            <Form.Item
              label="키 크기"
              name="keySize"
              rules={[{ required: true, message: '키 크기를 선택해주세요.' }]}
              tooltip="키 크기가 클수록 보안이 강화되지만 생성 시간이 오래 걸립니다."
            >
              <Select>
                {RSA_KEY_SIZES.map(size => (
                  <Select.Option key={size} value={size}>
                    {size} bits
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setGenerateModalVisible(false)}>
                취소
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={loading}
              >
                생성
              </Button>
            </Space>
          </Form>
        </Modal>

        {/* 키 보기 모달 */}
        <Modal
          title={`RSA 키 정보 (${selectedKey?.keySize} bits)`}
          open={viewModalVisible}
          onCancel={() => {
            setViewModalVisible(false);
            setSelectedKey(null);
            setShowPrivateKey(false);
          }}
          width={800}
          footer={[
            <Button key="close" onClick={() => setViewModalVisible(false)}>
              닫기
            </Button>
          ]}
        >
          {selectedKey && (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong>공개키 (Public Key)</Text>
                  <Button 
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyKey(selectedKey.publicKey, 'public')}
                  >
                    복사
                  </Button>
                </div>
                <TextArea
                  value={selectedKey.publicKey}
                  readOnly
                  rows={8}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong>개인키 (Private Key)</Text>
                  <Space>
                    <Button 
                      size="small"
                      icon={showPrivateKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? '숨기기' : '보기'}
                    </Button>
                    {showPrivateKey && (
                      <Button 
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyKey(selectedKey.privateKey, 'private')}
                      >
                        복사
                      </Button>
                    )}
                  </Space>
                </div>
                <TextArea
                  value={showPrivateKey ? selectedKey.privateKey : '개인키를 보려면 "보기" 버튼을 클릭하세요.'}
                  readOnly
                  rows={12}
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '12px',
                    backgroundColor: showPrivateKey ? '#fff' : '#f5f5f5'
                  }}
                />
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f0f2f5', borderRadius: '4px' }}>
                <Space direction="vertical" size="small">
                  <Text><strong>생성 일시:</strong> {new Date(selectedKey.created).toLocaleString('ko-KR')}</Text>
                  <Text><strong>키 크기:</strong> {selectedKey.keySize} bits</Text>
                  <Text type="warning" style={{ fontSize: '12px' }}>
                    ⚠️ 개인키는 안전한 곳에 보관하고 타인과 공유하지 마세요.
                  </Text>
                </Space>
              </div>
            </Space>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default KeyManagerPage;