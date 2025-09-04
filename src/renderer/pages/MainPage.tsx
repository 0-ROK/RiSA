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
  Modal,
  notification
} from 'antd';
import {
  LockOutlined,
  UnlockOutlined,
  CopyOutlined,
  ClearOutlined,
  KeyOutlined,
  ExpandOutlined,
  CompressOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useKeys } from '../store/KeyContext';
import { useHistory } from '../store/HistoryContext';
import { DEFAULT_ENCRYPTION_OPTIONS } from '../../shared/constants';
import { HistoryItem } from '../../shared/types';
import AlgorithmSelector from '../components/AlgorithmSelector';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MainPage: React.FC = () => {
  const { keys, selectedKey, selectKey } = useKeys();
  const { saveHistoryItem } = useHistory();
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
  const [encryptionStatus, setEncryptionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [decryptionStatus, setDecryptionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastError, setLastError] = useState<string>('');

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
    setEncryptionStatus('idle');
    try {
      const result = await window.electronAPI.encryptText(
        encryptText,
        selectedKey.publicKey,
        algorithm
      );
      setEncryptedResult(result.data);
      setEncryptionStatus('success');
      message.success('암호화가 완료되었습니다.');

      // 히스토리에 저장
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: 'encrypt',
        keyId: selectedKey.id,
        keyName: selectedKey.name,
        algorithm: algorithm as 'RSA-OAEP' | 'RSA-PKCS1',
        inputText: encryptText,
        outputText: result.data,
        success: true,
        timestamp: new Date(),
        keySize: selectedKey.keySize,
      };

      try {
        await saveHistoryItem(historyItem);
      } catch (error) {
        console.error('Failed to save history:', error);
      }
    } catch (error) {
      setEncryptionStatus('error');
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setLastError(errorMessage);

      // 결과 영역에 표시할 도움말 문구 생성
      const helpMessage = `❌ 암호화 실패

• 텍스트가 너무 긴지 확인
• 올바른 공개키를 선택했는지 확인
• 키와 알고리즘이 호환되는지 확인`;

      setEncryptedResult(helpMessage);

      notification.error({
        message: '암호화 실패',
        description: `암호화 중 오류가 발생했습니다: ${errorMessage}`,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        placement: 'topRight',
        duration: 5,
      });
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

    // Base64 형식 사전 검증
    const validation = validateBase64Format(decryptText);
    if (!validation.isValid) {
      setDecryptionStatus('error');

      // Base64 검증 실패 시 도움말 문구
      const base64HelpMessage = `❌ 입력 데이터 오류

• 암호화 데이터를 다시 복사해주세요
• 앞뒤 공백이나 불필요한 문자 제거`;

      setDecryptedResult(base64HelpMessage);

      notification.error({
        message: '입력 데이터 오류',
        description: (
          <div>
            <div style={{ marginBottom: 8 }}><strong>검증 실패:</strong> {validation.error}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <ExclamationCircleOutlined style={{ marginRight: 4 }} />
              암호화된 데이터가 올바른 Base64 형식인지 확인해주세요.
            </div>
          </div>
        ),
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        placement: 'topRight',
        duration: 6,
      });
      return;
    }

    setLoading(true);
    setDecryptionStatus('idle');
    try {
      const result = await window.electronAPI.decryptText(
        decryptText,
        selectedKey.privateKey,
        algorithm
      );
      setDecryptedResult(result);
      setDecryptionStatus('success');
      message.success('복호화가 완료되었습니다.');
    } catch (error) {
      setDecryptionStatus('error');

      // 실패 시 도움말 문구 설정
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setLastError(errorMessage);

      // 오류 타입에 따른 구체적인 가이드 제공
      let helpText = '';
      let errorCategory = '복호화 오류';

      if (errorMessage.includes('입력 데이터 검증 실패') || errorMessage.includes('Base64')) {
        errorCategory = 'Base64 형식 오류';
        helpText = '암호화된 데이터가 올바른 Base64 형식인지 확인해주세요. 복사 중 일부 문자가 누락되거나 추가되었을 수 있습니다.';
      } else if (errorMessage.includes('패딩')) {
        errorCategory = '패딩 알고리즘 오류';
        helpText = '암호화할 때 사용한 알고리즘(RSA-OAEP 또는 RSA-PKCS1)과 동일한 알고리즘을 선택했는지 확인해주세요.';
      } else if (errorMessage.includes('키')) {
        errorCategory = '키 불일치 오류';
        helpText = '현재 선택한 개인키가 암호화할 때 사용한 공개키와 쌍을 이루는 키인지 확인해주세요.';
      } else if (errorMessage.includes('알고리즘')) {
        errorCategory = '알고리즘 불일치 오류';
        helpText = '암호화할 때 사용한 알고리즘과 동일한 알고리즘을 선택해주세요. RSA-OAEP로 암호화했다면 RSA-OAEP로 복호화해야 합니다.';
      } else if (errorMessage.includes('디코딩') || errorMessage.includes('decode')) {
        errorCategory = '데이터 손상 오류';
        helpText = '암호화 데이터가 손상되었거나 잘못된 형식입니다. 원본 암호화 데이터를 다시 복사해주세요.';
      } else {
        errorCategory = '복호화 실패';
        helpText = '암호화 데이터, 키, 알고리즘이 모두 올바른지 확인해주세요. 문제가 계속되면 데이터를 새로 암호화해보세요.';
      }

      // 결과 영역에 표시할 도움말 문구 생성
      const helpMessage = `❌ 복호화 실패

• 올바른 개인키를 선택했는지 확인
• 암호화할 때와 같은 알고리즘 사용
• 암호화 데이터가 완전히 복사되었는지 확인`;

      setDecryptedResult(helpMessage);

      notification.error({
        message: errorCategory,
        description: (
          <div>
            <div style={{ marginBottom: 8, color: '#ff4d4f' }}><strong>{errorMessage}</strong></div>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
              <ExclamationCircleOutlined style={{ marginRight: 4 }} />
              {helpText}
            </div>
          </div>
        ),
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        placement: 'topRight',
        duration: 8,
        style: { width: 400 },
      });
      console.error('Decryption error:', error);

      // 복호화 실패 히스토리 저장
      if (selectedKey) {
        const failedHistoryItem: HistoryItem = {
          id: crypto.randomUUID(),
          type: 'decrypt',
          keyId: selectedKey.id,
          keyName: selectedKey.name,
          algorithm: algorithm as 'RSA-OAEP' | 'RSA-PKCS1',
          inputText: decryptText,
          outputText: '',
          success: false,
          errorMessage: errorMessage,
          timestamp: new Date(),
          keySize: selectedKey.keySize,
        };

        try {
          await saveHistoryItem(failedHistoryItem);
        } catch (historyError) {
          console.error('Failed to save failed decryption history:', historyError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, type?: 'encrypted' | 'decrypted' | 'key') => {
    try {
      await navigator.clipboard.writeText(text);

      // 복사된 내용의 종류와 크기에 따른 맞춤 알림
      const size = text.length;
      const sizeText = size > 1000 ? `${Math.round(size / 1000)}KB` : `${size}자`;

      let description = '';
      let title = '';

      if (type === 'encrypted') {
        title = '암호화 결과 복사됨';
        description = `${sizeText}의 암호화된 데이터가 클립보드에 복사되었습니다.`;
      } else if (type === 'decrypted') {
        title = '복호화 결과 복사됨';
        description = `${sizeText}의 복호화된 텍스트가 클립보드에 복사되었습니다.`;
      } else if (type === 'key') {
        title = '키 데이터 복사됨';
        description = `${sizeText}의 키 데이터가 클립보드에 복사되었습니다.`;
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
        description: '클립보드에 복사하는 중 오류가 발생했습니다. 브라우저 권한을 확인해주세요.',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        placement: 'topRight',
        duration: 4,
      });
    }
  };

  const handleClear = (type: 'encrypt' | 'decrypt') => {
    if (type === 'encrypt') {
      setEncryptText('');
      setEncryptedResult('');
      setEncryptionStatus('idle');
    } else {
      setDecryptText('');
      setDecryptedResult('');
      setDecryptionStatus('idle');
    }
    setLastError('');
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

  // Base64 형식 검증 함수
  const validateBase64Format = (data: string): { isValid: boolean; error?: string } => {
    try {
      // 공백 제거
      const cleanData = data.trim().replace(/\s/g, '');

      // 빈 문자열 체크
      if (!cleanData) {
        return { isValid: false, error: '데이터가 비어있습니다.' };
      }

      // Base64 기본 문자 집합 검증 (A-Z, a-z, 0-9, +, /, =)
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(cleanData)) {
        return { isValid: false, error: 'Base64 형식이 아닙니다. 올바른 문자(A-Z, a-z, 0-9, +, /, =)만 사용해주세요.' };
      }

      // 길이 검증 (Base64는 4의 배수여야 함)
      if (cleanData.length % 4 !== 0) {
        return { isValid: false, error: 'Base64 데이터 길이가 올바르지 않습니다. 4의 배수여야 합니다.' };
      }

      // 패딩 검증
      const paddingIndex = cleanData.indexOf('=');
      if (paddingIndex !== -1) {
        const paddingPart = cleanData.substring(paddingIndex);
        // = 는 맨 끝에만 올 수 있고, = 이후에는 = 만 올 수 있음
        if (paddingPart !== '=' && paddingPart !== '==') {
          return { isValid: false, error: 'Base64 패딩(=)이 올바르지 않습니다.' };
        }
        // = 앞에 다른 = 가 오면 안됨
        const beforePadding = cleanData.substring(0, paddingIndex);
        if (beforePadding.includes('=')) {
          return { isValid: false, error: 'Base64 패딩(=)의 위치가 올바르지 않습니다.' };
        }
      }

      // 실제 Base64 디코딩 테스트
      try {
        // 브라우저 내장 atob 함수로 검증
        atob(cleanData);
      } catch (decodeError) {
        return { isValid: false, error: 'Base64 디코딩에 실패했습니다. 데이터가 손상되었을 수 있습니다.' };
      }

      // RSA 암호화 데이터는 보통 최소한의 길이를 가져야 함
      if (cleanData.length < 100) {
        return { isValid: false, error: 'RSA 암호화 데이터로는 너무 짧습니다.' };
      }

      return { isValid: true };

    } catch (error) {
      return { isValid: false, error: '데이터 검증 중 오류가 발생했습니다.' };
    }
  };

  // 결과 영역 상태별 스타일 반환
  const getResultAreaStyle = (status: 'idle' | 'success' | 'error') => {
    const baseStyle = {
      flex: 1,
      fontFamily: 'monospace',
      backgroundColor: '#f5f5f5',
      resize: 'none' as const,
      maxHeight: 'calc(100vh - 400px)', // 입력 영역과 동일한 높이
      overflowY: 'auto' as const,
      transition: 'all 0.3s ease'
    };

    if (status === 'success') {
      return {
        ...baseStyle,
        border: '2px solid #52c41a',
        backgroundColor: '#f6ffed',
        boxShadow: '0 0 0 2px rgba(82, 196, 26, 0.2)',
      };
    } else if (status === 'error') {
      return {
        ...baseStyle,
        border: '2px solid #ff4d4f',
        backgroundColor: '#fff2f0',
        boxShadow: '0 0 0 2px rgba(255, 77, 79, 0.2)',
        fontFamily: 'inherit', // 오류 메시지는 일반 폰트 사용
        fontSize: '14px',
        lineHeight: '1.5',
        color: '#262626',
        padding: '16px',
      };
    }

    return baseStyle;
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
                  message="보안 경고"
                  description="RSA-PKCS1 패딩은 보안상 권장하지 않습니다. 중요한 데이터의 경우 RSA-OAEP 사용을 권장합니다."
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
                                      onClick={() => handleCopy(encryptedResult, 'encrypted')}
                                      disabled={encryptionStatus === 'error'}
                                      title={encryptionStatus === 'error' ? "오류가 발생했습니다" : "암호화 결과 복사"}
                                    />
                                  </>
                                )}
                              </Space>
                            </div>
                            <TextArea
                              value={encryptedResult}
                              readOnly
                              style={getResultAreaStyle(encryptionStatus)}
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
                                      onClick={() => handleCopy(decryptedResult, 'decrypted')}
                                      disabled={decryptionStatus === 'error'}
                                      title={decryptionStatus === 'error' ? "오류가 발생했습니다" : "복호화 결과 복사"}
                                    />
                                  </>
                                )}
                              </Space>
                            </div>
                            <TextArea
                              value={decryptedResult}
                              readOnly
                              style={getResultAreaStyle(decryptionStatus)}
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
            <Button
              key="copy"
              icon={<CopyOutlined />}
              onClick={() => {
                const type = activeTab === 'encrypt' ? 'encrypted' : 'decrypted';
                handleCopy(fullScreenContent, type);
              }}
              disabled={
                (activeTab === 'encrypt' && encryptionStatus === 'error') ||
                (activeTab === 'decrypt' && decryptionStatus === 'error')
              }
              title={
                ((activeTab === 'encrypt' && encryptionStatus === 'error') ||
                  (activeTab === 'decrypt' && decryptionStatus === 'error'))
                  ? "오류가 발생했습니다"
                  : "복사"
              }
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