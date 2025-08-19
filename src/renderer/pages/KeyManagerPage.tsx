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
  Tooltip,
  Alert
} from 'antd';
import { 
  KeyOutlined, 
  PlusOutlined, 
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ImportOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useKeys } from '../store/KeyContext';
import { SavedKey } from '../../shared/types';
import { RSA_KEY_SIZES } from '../../shared/constants';
import AlgorithmSelector from '../components/AlgorithmSelector';

const { Title, Text } = Typography;
const { TextArea } = Input;

const KeyManagerPage: React.FC = () => {
  const { keys, loading, saveKey, deleteKey } = useKeys();
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState<SavedKey | null>(null);
  const [editingKey, setEditingKey] = useState<SavedKey | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [form] = Form.useForm();
  const [importForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [selectedGenerateAlgorithm, setSelectedGenerateAlgorithm] = useState<'RSA-OAEP' | 'RSA-PKCS1'>('RSA-OAEP');
  const [selectedImportAlgorithm, setSelectedImportAlgorithm] = useState<'RSA-OAEP' | 'RSA-PKCS1'>('RSA-OAEP');
  const [selectedEditAlgorithm, setSelectedEditAlgorithm] = useState<'RSA-OAEP' | 'RSA-PKCS1'>('RSA-OAEP');

  const handleGenerateKey = async (values: { name: string; keySize: number; preferredAlgorithm: 'RSA-OAEP' | 'RSA-PKCS1' }) => {
    setGenerateLoading(true);
    try {
      const keyPair = await window.electronAPI.generateRSAKeys(values.keySize);
      
      const savedKey: SavedKey = {
        id: crypto.randomUUID(),
        name: values.name,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        keySize: values.keySize,
        preferredAlgorithm: values.preferredAlgorithm,
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

  const handleEditKey = (key: SavedKey) => {
    setEditingKey(key);
    setSelectedEditAlgorithm(key.preferredAlgorithm);
    editForm.setFieldsValue({
      name: key.name,
      preferredAlgorithm: key.preferredAlgorithm
    });
    setEditModalVisible(true);
  };

  const handleUpdateKey = async (values: { name: string; preferredAlgorithm: 'RSA-OAEP' | 'RSA-PKCS1' }) => {
    if (!editingKey) return;
    
    try {
      const updatedKey: SavedKey = {
        ...editingKey,
        name: values.name.trim(),
        preferredAlgorithm: values.preferredAlgorithm
      };

      await deleteKey(editingKey.id);
      await saveKey(updatedKey);
      
      setEditModalVisible(false);
      editForm.resetFields();
      setEditingKey(null);
      message.success(`"${values.name}" 키가 수정되었습니다.`);
    } catch (error) {
      message.error('키 수정 중 오류가 발생했습니다.');
      console.error(error);
    }
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

  // Base64 문자열 검증 함수
  const isValidBase64 = (str: string): boolean => {
    try {
      // Base64 패턴 검증
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      const cleanStr = str.replace(/\s/g, '');
      return base64Pattern.test(cleanStr) && cleanStr.length > 100;
    } catch {
      return false;
    }
  };

  // PEM 형식 자동 생성 함수
  const formatToPEM = (keyContent: string, keyType: 'public' | 'private'): string => {
    const cleanContent = keyContent.replace(/\s/g, '');
    const header = keyType === 'public' ? '-----BEGIN PUBLIC KEY-----' : '-----BEGIN PRIVATE KEY-----';
    const footer = keyType === 'public' ? '-----END PUBLIC KEY-----' : '-----END PRIVATE KEY-----';
    
    // 64자마다 줄바꿈 추가
    const formattedContent = cleanContent.match(/.{1,64}/g)?.join('\n') || cleanContent;
    
    return `${header}\n${formattedContent}\n${footer}`;
  };

  // RSA 키 검증 및 정규화 함수
  const validateAndNormalizeRSAKey = (key: string, keyType: 'public' | 'private'): { isValid: boolean; normalizedKey: string } => {
    try {
      const trimmedKey = key.trim();
      
      // 이미 PEM 형식인지 확인
      const hasPEMFormat = (
        (trimmedKey.includes('-----BEGIN PUBLIC KEY-----') && trimmedKey.includes('-----END PUBLIC KEY-----')) ||
        (trimmedKey.includes('-----BEGIN PRIVATE KEY-----') && trimmedKey.includes('-----END PRIVATE KEY-----')) ||
        (trimmedKey.includes('-----BEGIN RSA PUBLIC KEY-----') && trimmedKey.includes('-----END RSA PUBLIC KEY-----')) ||
        (trimmedKey.includes('-----BEGIN RSA PRIVATE KEY-----') && trimmedKey.includes('-----END RSA PRIVATE KEY-----'))
      );
      
      if (hasPEMFormat) {
        // 기존 PEM 형식 검증
        const keyContent = trimmedKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
        if (isValidBase64(keyContent)) {
          return { isValid: true, normalizedKey: trimmedKey };
        }
      } else {
        // Base64 문자열만 있는 경우
        if (isValidBase64(trimmedKey)) {
          const normalizedKey = formatToPEM(trimmedKey, keyType);
          return { isValid: true, normalizedKey };
        }
      }
      
      return { isValid: false, normalizedKey: '' };
    } catch {
      return { isValid: false, normalizedKey: '' };
    }
  };

  const handleImportKey = async (values: { name?: string; publicKey: string; privateKey: string; preferredAlgorithm: 'RSA-OAEP' | 'RSA-PKCS1' }) => {
    try {
      // 키 검증 및 정규화
      const publicKeyResult = validateAndNormalizeRSAKey(values.publicKey, 'public');
      if (!publicKeyResult.isValid) {
        message.error('유효하지 않은 공개키 형식입니다. PEM 형식이거나 Base64 문자열을 입력해주세요.');
        return;
      }
      
      const privateKeyResult = validateAndNormalizeRSAKey(values.privateKey, 'private');
      if (!privateKeyResult.isValid) {
        message.error('유효하지 않은 개인키 형식입니다. PEM 형식이거나 Base64 문자열을 입력해주세요.');
        return;
      }
      
      // 이름 처리
      const keyName = values.name?.trim() || generateAutoName();
      
      // 키 크기 감지
      const keySize = detectKeySize(publicKeyResult.normalizedKey);
      
      const savedKey: SavedKey = {
        id: crypto.randomUUID(),
        name: keyName,
        publicKey: publicKeyResult.normalizedKey,
        privateKey: privateKeyResult.normalizedKey,
        keySize,
        preferredAlgorithm: values.preferredAlgorithm,
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
      title: '선호 알고리즘',
      dataIndex: 'preferredAlgorithm',
      key: 'preferredAlgorithm',
      render: (algorithm: string) => (
        <Text style={{ fontSize: '12px', color: '#666' }}>
          {algorithm}
        </Text>
      ),
      width: 120,
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
      width: 180,
      render: (_: any, record: SavedKey) => (
        <Space size="small">
          <Tooltip title="키 보기">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewKey(record)}
            />
          </Tooltip>

          <Tooltip title="키 편집">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEditKey(record)}
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
            initialValues={{ keySize: 2048, preferredAlgorithm: 'RSA-OAEP' }}
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

            <Form.Item
              label="선호 암호화 알고리즘"
              name="preferredAlgorithm"
              rules={[{ required: true, message: '알고리즘을 선택해주세요.' }]}
              tooltip="이 키와 함께 사용할 기본 암호화 알고리즘을 선택하세요."
            >
              <AlgorithmSelector
                onInternalChange={setSelectedGenerateAlgorithm}
                showWarning={false}
              />
            </Form.Item>

            {/* PKCS1 보안 경고를 Form.Item 밖으로 이동 */}
            {selectedGenerateAlgorithm === 'RSA-PKCS1' && (
              <Alert
                message="보안 경고"
                description="RSA-PKCS1 패딩은 보안상 권장하지 않습니다. 중요한 데이터의 경우 RSA-OAEP 사용을 권장합니다."
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

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
          style={{ top: 20 }}
          bodyStyle={{ 
            maxHeight: 'calc(100vh - 200px)', 
            overflowY: 'auto',
            padding: '24px'
          }}
        >
          <Form
            form={importForm}
            layout="vertical"
            onFinish={handleImportKey}
            initialValues={{ preferredAlgorithm: 'RSA-OAEP' }}
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
              label="선호 암호화 알고리즘"
              name="preferredAlgorithm"
              rules={[{ required: true, message: '알고리즘을 선택해주세요.' }]}
              tooltip="이 키와 함께 사용할 기본 암호화 알고리즘을 선택하세요."
            >
              <AlgorithmSelector
                onInternalChange={setSelectedImportAlgorithm}
                showWarning={false}
              />
            </Form.Item>

            {/* PKCS1 보안 경고를 Form.Item 밖으로 이동 */}
            {selectedImportAlgorithm === 'RSA-PKCS1' && (
              <Alert
                message="보안 경고"
                description="RSA-PKCS1 패딩은 보안상 권장하지 않습니다. 중요한 데이터의 경우 RSA-OAEP 사용을 권장합니다."
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            <Form.Item
              label="공개키 (Public Key)"
              name="publicKey"
              rules={[
                { required: true, message: '공개키를 입력해주세요.' },
                { 
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const result = validateAndNormalizeRSAKey(value, 'public');
                    if (!result.isValid) {
                      return Promise.reject(new Error('유효하지 않은 공개키 형식입니다. PEM 형식이거나 Base64 문자열을 입력해주세요.'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              tooltip="PEM 형식의 RSA 공개키 또는 Base64 문자열을 입력하세요."
            >
              <TextArea
                placeholder="PEM 형식:
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----

또는 Base64 문자열:
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
                rows={6}
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
                    const result = validateAndNormalizeRSAKey(value, 'private');
                    if (!result.isValid) {
                      return Promise.reject(new Error('유효하지 않은 개인키 형식입니다. PEM 형식이거나 Base64 문자열을 입력해주세요.'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              tooltip="PEM 형식의 RSA 개인키 또는 Base64 문자열을 입력하세요."
            >
              <TextArea
                placeholder="PEM 형식:
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----

또는 Base64 문자열:
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC..."
                rows={8}
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
          style={{ top: 20 }}
          bodyStyle={{ 
            maxHeight: 'calc(100vh - 200px)', 
            overflowY: 'auto',
            padding: '24px'
          }}
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

        {/* 키 편집 모달 */}
        <Modal
          title={`키 편집: ${editingKey?.name}`}
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            editForm.resetFields();
            setEditingKey(null);
          }}
          footer={null}
          width={600}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleUpdateKey}
            initialValues={{ preferredAlgorithm: 'RSA-OAEP' }}
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
              label="선호 암호화 알고리즘"
              name="preferredAlgorithm"
              rules={[{ required: true, message: '알고리즘을 선택해주세요.' }]}
              tooltip="이 키와 함께 사용할 기본 암호화 알고리즘을 선택하세요."
            >
              <AlgorithmSelector
                onInternalChange={setSelectedEditAlgorithm}
                showWarning={false}
              />
            </Form.Item>

            {/* PKCS1 보안 경고를 Form.Item 밖으로 이동 */}
            {selectedEditAlgorithm === 'RSA-PKCS1' && (
              <Alert
                message="보안 경고"
                description="RSA-PKCS1 패딩은 보안상 권장하지 않습니다. 중요한 데이터의 경우 RSA-OAEP 사용을 권장합니다."
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            {editingKey && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f0f8ff', 
                borderRadius: '4px',
                marginBottom: '16px',
                border: '1px solid #d1ecf1'
              }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <strong>현재 키 정보:</strong>
                  <br />• 키 크기: {editingKey.keySize} bits
                  <br />• 생성일: {new Date(editingKey.created).toLocaleDateString('ko-KR')}
                  <br />• 키 내용은 보안상 수정할 수 없습니다
                </Text>
              </div>
            )}

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setEditModalVisible(false)}>
                취소
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
              >
                수정
              </Button>
            </Space>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default KeyManagerPage;