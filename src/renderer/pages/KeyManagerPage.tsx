import React, { useState } from 'react';
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
  EyeOutlined,
  EyeInvisibleOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { useKeys } from '../store/KeyContext';
import { SavedKey } from '../../shared/types';
import { RSA_KEY_SIZES } from '../../shared/constants';

const { Title, Text } = Typography;
const { TextArea } = Input;

const KeyManagerPage: React.FC = () => {
  const { keys, loading, saveKey, deleteKey } = useKeys();
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState<SavedKey | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [form] = Form.useForm();
  const [importForm] = Form.useForm();

  const handleGenerateKey = async (values: { name: string; keySize: number }) => {
    setGenerateLoading(true);
    try {
      const keyPair = await window.electronAPI.generateRSAKeys(values.keySize);
      
      const savedKey: SavedKey = {
        id: crypto.randomUUID(),
        name: values.name,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        keySize: values.keySize,
        created: new Date(),
      };

      await saveKey(savedKey);
      setGenerateModalVisible(false);
      form.resetFields();
      message.success(`"${values.name}" 키가 생성되었습니다.`);
    } catch (error) {
      message.error('키 생성 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleViewKey = (key: SavedKey) => {
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

  const handleDeleteKey = async (key: SavedKey) => {
    try {
      await deleteKey(key.id);
      message.success(`"${key.name}" 키가 삭제되었습니다.`);
    } catch (error) {
      message.error('키 삭제 중 오류가 발생했습니다.');
    }
  };

  // 키 크기 자동 감지 함수
  const detectKeySize = (publicKey: string): number => {
    try {
      // Base64 디코딩하여 키 길이 추정
      const keyContent = publicKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
      const keyLength = keyContent.length;
      
      // 일반적인 RSA 키 크기 추정
      if (keyLength < 400) return 1024;
      else if (keyLength < 800) return 2048;
      else return 4096;
    } catch {
      return 2048; // 기본값
    }
  };

  // 자동 이름 생성 함수
  const generateAutoName = (): string => {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    return `Imported_Key_${timestamp}`;
  };

  // RSA 키 검증 함수
  const validateRSAKey = (key: string, keyType: 'public' | 'private'): boolean => {
    try {
      const expectedHeader = keyType === 'public' ? '-----BEGIN PUBLIC KEY-----' : '-----BEGIN PRIVATE KEY-----';
      const expectedFooter = keyType === 'public' ? '-----END PUBLIC KEY-----' : '-----END PRIVATE KEY-----';
      
      const trimmedKey = key.trim();
      
      // RSA 키 또는 RSA PUBLIC/PRIVATE KEY 형식 지원
      const isValidFormat = (
        (trimmedKey.includes('-----BEGIN PUBLIC KEY-----') && trimmedKey.includes('-----END PUBLIC KEY-----')) ||
        (trimmedKey.includes('-----BEGIN PRIVATE KEY-----') && trimmedKey.includes('-----END PRIVATE KEY-----')) ||
        (trimmedKey.includes('-----BEGIN RSA PUBLIC KEY-----') && trimmedKey.includes('-----END RSA PUBLIC KEY-----')) ||
        (trimmedKey.includes('-----BEGIN RSA PRIVATE KEY-----') && trimmedKey.includes('-----END RSA PRIVATE KEY-----'))
      );
      
      if (!isValidFormat) return false;
      
      // Base64 내용 검증
      const keyContent = trimmedKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
      if (keyContent.length < 100) return false; // 너무 짧은 키는 유효하지 않음
      
      return true;
    } catch {
      return false;
    }
  };

  const handleImportKey = async (values: { name?: string; publicKey: string; privateKey: string }) => {
    try {
      // 키 검증
      if (!validateRSAKey(values.publicKey, 'public')) {
        message.error('유효하지 않은 공개키 형식입니다.');
        return;
      }
      
      if (!validateRSAKey(values.privateKey, 'private')) {
        message.error('유효하지 않은 개인키 형식입니다.');
        return;
      }
      
      // 이름 처리
      const keyName = values.name?.trim() || generateAutoName();
      
      // 키 크기 감지
      const keySize = detectKeySize(values.publicKey);
      
      const savedKey: SavedKey = {
        id: crypto.randomUUID(),
        name: keyName,
        publicKey: values.publicKey.trim(),
        privateKey: values.privateKey.trim(),
        keySize,
        created: new Date(),
      };

      await saveKey(savedKey);
      setImportModalVisible(false);
      importForm.resetFields();
      message.success(`"${keyName}" 키가 등록되었습니다.`);
    } catch (error) {
      message.error('키 등록 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  const columns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => (
        <Text strong style={{ color: '#1890ff' }}>
          {name}
        </Text>
      ),
    },
    {
      title: '키 크기',
      dataIndex: 'keySize',
      key: 'keySize',
      render: (size: number) => `${size} bits`,
      width: 100,
    },
    {
      title: '생성 일시',
      dataIndex: 'created',
      key: 'created',
      render: (date: Date) => new Date(date).toLocaleString('ko-KR'),
      width: 160,
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
            maxWidth: '250px'
          }}
        >
          {publicKey.substring(0, 40)}...
        </Text>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 150,
      render: (_: any, record: SavedKey) => (
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
              title={`"${record.name}" 키를 삭제하시겠습니까?`}
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
          
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setGenerateModalVisible(true)}
              size="large"
            >
              새 키 생성
            </Button>
            <Button 
              type="default" 
              icon={<ImportOutlined />}
              onClick={() => setImportModalVisible(true)}
              size="large"
            >
              키 직접 등록
            </Button>
          </Space>
        </div>

        <Card>
          <Table
            columns={columns}
            dataSource={keys}
            rowKey={(record) => record.id}
            loading={loading}
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
            initialValues={{ keySize: 2048 }}
          >
            <Form.Item
              label="키 이름"
              name="name"
              rules={[
                { required: true, message: '키 이름을 입력해주세요.' },
                { min: 1, max: 50, message: '키 이름은 1-50자 사이여야 합니다.' },
              ]}
              tooltip="키를 식별할 수 있는 이름을 입력하세요."
            >
              <Input 
                placeholder="예: MyPersonalKey, WorkKey, TestKey..."
                autoFocus
              />
            </Form.Item>

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
                loading={generateLoading}
              >
                생성
              </Button>
            </Space>
          </Form>
        </Modal>

        {/* 키 직접 등록 모달 */}
        <Modal
          title="RSA 키 직접 등록"
          open={importModalVisible}
          onCancel={() => {
            setImportModalVisible(false);
            importForm.resetFields();
          }}
          footer={null}
          width={800}
        >
          <Form
            form={importForm}
            layout="vertical"
            onFinish={handleImportKey}
          >
            <Form.Item
              label="키 이름 (선택사항)"
              name="name"
              rules={[
                { max: 50, message: '키 이름은 50자 이하여야 합니다.' },
              ]}
              tooltip="이름을 입력하지 않으면 자동으로 생성됩니다."
            >
              <Input 
                placeholder="예: ImportedKey, ExternalKey... (빈 칸 시 자동 생성)"
              />
            </Form.Item>

            <Form.Item
              label="공개키 (Public Key)"
              name="publicKey"
              rules={[
                { required: true, message: '공개키를 입력해주세요.' },
                { 
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    if (!validateRSAKey(value, 'public')) {
                      return Promise.reject(new Error('유효하지 않은 공개키 형식입니다. PEM 형식의 RSA 공개키를 입력해주세요.'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              tooltip="-----BEGIN PUBLIC KEY----- 로 시작하는 PEM 형식의 RSA 공개키를 입력하세요."
            >
              <TextArea
                placeholder="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"
                rows={8}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
            </Form.Item>

            <Form.Item
              label="개인키 (Private Key)"
              name="privateKey"
              rules={[
                { required: true, message: '개인키를 입력해주세요.' },
                { 
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    if (!validateRSAKey(value, 'private')) {
                      return Promise.reject(new Error('유효하지 않은 개인키 형식입니다. PEM 형식의 RSA 개인키를 입력해주세요.'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              tooltip="-----BEGIN PRIVATE KEY----- 로 시작하는 PEM 형식의 RSA 개인키를 입력하세요."
            >
              <TextArea
                placeholder="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
                rows={12}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
            </Form.Item>

            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f0f8ff', 
              borderRadius: '4px',
              marginBottom: '16px',
              border: '1px solid #d1ecf1'
            }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                💡 <strong>팁:</strong> 
                <br />• 키 크기는 공개키에서 자동으로 감지됩니다
                <br />• RSA PUBLIC KEY 및 RSA PRIVATE KEY 형식도 지원됩니다
                <br />• 이름을 지정하지 않으면 "Imported_Key_[타임스탬프]" 형식으로 자동 생성됩니다
              </Text>
            </div>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setImportModalVisible(false)}>
                취소
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
              >
                등록
              </Button>
            </Space>
          </Form>
        </Modal>

        {/* 키 보기 모달 */}
        <Modal
          title={`${selectedKey?.name} (${selectedKey?.keySize} bits)`}
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
                  <Text><strong>키 이름:</strong> {selectedKey.name}</Text>
                  <Text><strong>키 크기:</strong> {selectedKey.keySize} bits</Text>
                  <Text><strong>생성 일시:</strong> {new Date(selectedKey.created).toLocaleString('ko-KR')}</Text>
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