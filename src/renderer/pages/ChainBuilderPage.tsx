import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Alert,
  Modal,
  Form,
  Tag,
  Tooltip,
  Divider,
  message,
  notification,
  Spin,
  Empty
} from 'antd';
import {
  PlayCircleOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  BulbOutlined,
  SettingOutlined,
  LinkOutlined,
  LockOutlined,
  UnlockOutlined,
  CodeOutlined,
  CheckOutlined,
  DragOutlined
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useChain } from '../store/ChainContext';
import { useKeys } from '../store/KeyContext';
import { useHistory } from '../store/HistoryContext';
import { ChainStep, ChainTemplate, ChainStepType, HistoryItem } from '../../shared/types';
import { CHAIN_MODULES } from '../../shared/constants';
import { SortableStepItem } from '../components/SortableStepItem';
import PageHeader from '../components/PageHeader';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface StepCardProps {
  step: ChainStep;
  index: number;
  onUpdate: (step: ChainStep) => void;
  onDelete: () => void;
  availableKeys: Array<{ id: string; name: string; keySize: number }>;
}

const StepCard: React.FC<StepCardProps> = ({ step, index, onUpdate, onDelete, availableKeys }) => {
  const [showParams, setShowParams] = useState(false);
  const moduleInfo = CHAIN_MODULES[step.type];

  const getStepIcon = (type: ChainStepType) => {
    switch (type) {
      case 'url-encode':
      case 'url-decode':
        return <LinkOutlined />;
      case 'rsa-encrypt':
        return <LockOutlined />;
      case 'rsa-decrypt':
        return <UnlockOutlined />;
      case 'base64-encode':
      case 'base64-decode':
        return <CodeOutlined />;
      default:
        return <SettingOutlined />;
    }
  };

  const getStepColor = (type: ChainStepType) => {
    switch (type) {
      case 'url-encode':
      case 'url-decode':
        return '#722ed1';
      case 'rsa-encrypt':
      case 'rsa-decrypt':
        return '#f5222d';
      case 'base64-encode':
      case 'base64-decode':
        return '#13c2c2';
      default:
        return '#666';
    }
  };

  const handleToggleEnabled = () => {
    onUpdate({ ...step, enabled: !step.enabled });
  };

  const handleParamChange = (param: string, value: any) => {
    const newParams = { ...step.params, [param]: value };
    onUpdate({ ...step, params: newParams });
  };

  const needsKeySelection = step.type === 'rsa-encrypt' || step.type === 'rsa-decrypt';

  return (
    <div style={{ opacity: step.enabled ? 1 : 0.5 }}>
      <Card
        size="small"
        style={{
          marginBottom: 8,
          borderColor: getStepColor(step.type),
          borderWidth: step.enabled ? 2 : 1,
          backgroundColor: 'white',
        }}
        actions={[
          <Tooltip title={step.enabled ? '비활성화' : '활성화'} key="toggle">
            <Button
              type="text"
              icon={<CheckOutlined style={{ color: step.enabled ? '#52c41a' : '#d9d9d9' }} />}
              onClick={handleToggleEnabled}
            />
          </Tooltip>,
          <Tooltip title="설정" key="settings">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setShowParams(!showParams)}
            />
          </Tooltip>,
          <Tooltip title="삭제" key="delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
            />
          </Tooltip>,
        ]}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ marginRight: 8 }}>
            <DragOutlined style={{ color: '#999' }} />
          </div>
          <div style={{ color: getStepColor(step.type), marginRight: 8 }}>
            {getStepIcon(step.type)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
              {index + 1}. {moduleInfo?.name || step.type}
              {/* RSA 스텝에서 키가 선택되지 않은 경우 경고 표시 */}
              {needsKeySelection && (!step.params || !step.params.keyId) && (
                <Tooltip title="키를 선택해주세요">
                  <span style={{ marginLeft: 8, color: '#ff4d4f', fontSize: '12px' }}>⚠️</span>
                </Tooltip>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {moduleInfo?.description || ''}
              {needsKeySelection && step.params?.keyId && (
                <span style={{ color: '#52c41a', marginLeft: 8 }}>✓ 키 선택됨</span>
              )}
            </div>
          </div>
        </div>

        {showParams && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            {needsKeySelection && (
              <div style={{ marginBottom: 8 }}>
                <Text strong>키 선택:</Text>
                <Select
                  style={{ width: '100%', marginTop: 4 }}
                  placeholder="키를 선택하세요"
                  value={step.params?.keyId}
                  onChange={(value) => handleParamChange('keyId', value)}
                >
                  {availableKeys.map(key => (
                    <Option key={key.id} value={key.id}>
                      {key.name} ({key.keySize} bits)
                    </Option>
                  ))}
                </Select>
              </div>
            )}

            {needsKeySelection && (
              <div style={{ marginBottom: 8 }}>
                <Text strong>알고리즘:</Text>
                <Select
                  style={{ width: '100%', marginTop: 4 }}
                  value={step.params?.algorithm || 'RSA-OAEP'}
                  onChange={(value) => handleParamChange('algorithm', value)}
                >
                  <Option value="RSA-OAEP">RSA-OAEP (권장)</Option>
                  <Option value="RSA-PKCS1">RSA-PKCS1</Option>
                </Select>
              </div>
            )}

            <div>
              <Text strong>사용자 정의 이름:</Text>
              <Input
                style={{ marginTop: 4 }}
                placeholder={moduleInfo?.name || step.type}
                value={step.name}
                onChange={(e) => onUpdate({ ...step, name: e.target.value })}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

const ChainBuilderPage: React.FC = () => {
  const { templates, loading, saveTemplate, deleteTemplate, executeChain, createEmptyTemplate, createEmptyStep, validateChainSteps } = useChain();
  const { keys } = useKeys();
  const { saveHistoryItem } = useHistory();

  const [currentTemplate, setCurrentTemplate] = useState<ChainTemplate | null>(null);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [form] = Form.useForm();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!currentTemplate && templates.length > 0) {
      setCurrentTemplate(templates[0]);
    }
  }, [templates, currentTemplate]);

  const availableKeys = keys.map(key => ({
    id: key.id,
    name: key.name,
    keySize: key.keySize,
  }));

  const handleCreateNewTemplate = () => {
    const newTemplate = createEmptyTemplate();
    setCurrentTemplate(newTemplate);
  };

  const handleLoadTemplate = (template: ChainTemplate) => {
    setCurrentTemplate({ ...template });
    setShowTemplateModal(false);
  };

  const handleSaveTemplate = async (values: any) => {
    if (!currentTemplate) return;

    try {
      const templateToSave: ChainTemplate = {
        ...currentTemplate,
        name: values.name,
        description: values.description,
        tags: values.tags || [],
      };

      await saveTemplate(templateToSave);
      setCurrentTemplate(templateToSave);
      setShowSaveModal(false);
      message.success('체인 템플릿이 저장되었습니다.');
    } catch (error) {
      message.error('체인 템플릿 저장에 실패했습니다.');
    }
  };

  const handleAddStep = (type: ChainStepType) => {
    if (!currentTemplate) return;

    const newStep = createEmptyStep(type);
    const updatedTemplate = {
      ...currentTemplate,
      steps: [...currentTemplate.steps, newStep],
    };
    setCurrentTemplate(updatedTemplate);
  };

  const handleUpdateStep = (index: number, step: ChainStep) => {
    if (!currentTemplate) return;

    const updatedSteps = [...currentTemplate.steps];
    updatedSteps[index] = step;
    setCurrentTemplate({
      ...currentTemplate,
      steps: updatedSteps,
    });
  };

  const handleDeleteStep = (stepId: string) => {
    if (!currentTemplate) return;

    const updatedSteps = currentTemplate.steps.filter(step => step.id !== stepId);
    setCurrentTemplate({
      ...currentTemplate,
      steps: updatedSteps,
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!currentTemplate || !active || !over || active.id === over.id) {
      return;
    }

    const oldIndex = currentTemplate.steps.findIndex(step => step.id === active.id);
    const newIndex = currentTemplate.steps.findIndex(step => step.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newSteps = arrayMove(currentTemplate.steps, oldIndex, newIndex);
      setCurrentTemplate({
        ...currentTemplate,
        steps: newSteps,
      });
    }
  };

  const handleToggleStep = (stepId: string) => {
    if (!currentTemplate) return;

    const stepIndex = currentTemplate.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    const step = currentTemplate.steps[stepIndex];
    handleUpdateStep(stepIndex, { ...step, enabled: !step.enabled });
  };

  const handleUpdateStepParams = (stepId: string, updates: Partial<ChainStep>) => {
    if (!currentTemplate) return;

    const stepIndex = currentTemplate.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    const step = currentTemplate.steps[stepIndex];
    
    // 키 ID가 변경된 경우, 해당 키의 선호 알고리즘을 자동 설정
    if (updates.params?.keyId && updates.params.keyId !== step.params?.keyId) {
      const selectedKey = keys.find(key => key.id === updates.params?.keyId);
      if (selectedKey && selectedKey.preferredAlgorithm && !updates.params.algorithm) {
        updates.params.algorithm = selectedKey.preferredAlgorithm;
      }
    }
    
    handleUpdateStep(stepIndex, { ...step, ...updates });
  };


  const handleExecuteChain = async () => {
    if (!currentTemplate || !inputText.trim()) {
      message.error('입력 텍스트를 입력해주세요.');
      return;
    }

    const validation = validateChainSteps(currentTemplate.steps);
    if (!validation.valid) {
      notification.error({
        message: '체인 실행 불가',
        description: (
          <div>
            <p style={{ marginBottom: 8 }}>다음 문제들을 해결해주세요:</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {validation.errors.map((error, index) => (
                <li key={index} style={{ marginBottom: 4 }}>{error}</li>
              ))}
            </ul>
          </div>
        ),
        duration: 8,
        style: { width: 400 },
      });
      return;
    }

    setIsExecuting(true);
    try {
      const result = await executeChain(
        currentTemplate.steps,
        inputText,
        currentTemplate.id,
        currentTemplate.name
      );

      setExecutionResult(result);
      setOutputText(result.finalOutput);

      if (result.success) {
        message.success(`체인 실행이 완료되었습니다. (${result.totalDuration}ms)`);
      } else {
        // 더 상세한 오류 정보 제공
        const failedStep = result.steps.find(step => !step.success);
        const errorMsg = failedStep
          ? `${failedStep.stepType} 스텝에서 오류: ${failedStep.error}`
          : '체인 실행 중 오류가 발생했습니다.';
        message.error(errorMsg);
        console.error('Chain execution failed:', result.steps);
      }

      // 히스토리에 저장
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        type: 'chain',
        inputText,
        outputText: result.finalOutput,
        success: result.success,
        timestamp: new Date(),
        chainId: currentTemplate.id,
        chainName: currentTemplate.name,
        chainSteps: currentTemplate.steps.filter(s => s.enabled).length,
        chainDuration: result.totalDuration,
        errorMessage: result.success ? undefined : 'Chain execution failed',
      };

      try {
        await saveHistoryItem(historyItem);
      } catch (error) {
        console.error('Failed to save chain history:', error);
      }
    } catch (error) {
      console.error('Chain execution failed:', error);
      message.error('체인 실행에 실패했습니다.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyOutput = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      message.success('결과가 클립보드에 복사되었습니다.');
    } catch (error) {
      message.error('복사에 실패했습니다.');
    }
  };

  const stepTypes: Array<{ type: ChainStepType; label: string; category: string }> = [
    { type: 'url-encode', label: 'URL 인코딩', category: '인코딩' },
    { type: 'url-decode', label: 'URL 디코딩', category: '인코딩' },
    { type: 'base64-encode', label: 'Base64 인코딩', category: '인코딩' },
    { type: 'base64-decode', label: 'Base64 디코딩', category: '인코딩' },
    { type: 'rsa-encrypt', label: 'RSA 암호화', category: '암호화' },
    { type: 'rsa-decrypt', label: 'RSA 복호화', category: '암호화' },
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>체인 템플릿을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <PageHeader 
        title="체인 빌더"
        subtitle="다양한 암호화/변환 작업을 순차적으로 연결하여 커스텀 체인을 만들고 실행하세요."
        icon={<BulbOutlined style={{ color: '#faad14' }} />}
      />
      <div style={{
        padding: '24px',
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
        flex: 1
      }}>

        <Row gutter={[24, 24]}>
          {/* 왼쪽: 체인 빌더 */}
          <Col xs={24} lg={14}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    체인 구성
                    {currentTemplate && (
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        {currentTemplate.name}
                      </Tag>
                    )}
                  </span>
                  <Space>
                    <Button
                      size="small"
                      onClick={() => setShowTemplateModal(true)}
                    >
                      템플릿 불러오기
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => setShowSaveModal(true)}
                      disabled={!currentTemplate}
                    >
                      저장
                    </Button>
                  </Space>
                </div>
              }
            >
              {/* 스텝 추가 버튼들 */}
              <div style={{ marginBottom: 16 }}>
                <Text strong>스텝 추가:</Text>
                <div style={{ marginTop: 8 }}>
                  {['인코딩', '암호화'].map(category => (
                    <div key={category} style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {category}:
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Space wrap>
                          {stepTypes
                            .filter(item => item.category === category)
                            .map(item => (
                              <Button
                                key={item.type}
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => handleAddStep(item.type)}
                              >
                                {item.label}
                              </Button>
                            ))}
                        </Space>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Divider />

              {/* 체인 스텝들 */}
              {currentTemplate && currentTemplate.steps.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={currentTemplate.steps.map(step => step.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div>
                      {currentTemplate.steps.map((step, index) => (
                        <SortableStepItem
                          key={step.id}
                          step={step}
                          index={index}
                          savedKeys={keys}
                          onToggle={handleToggleStep}
                          onDelete={handleDeleteStep}
                          onUpdateStep={handleUpdateStepParams}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <Empty
                  description="체인에 스텝을 추가해주세요"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>

          {/* 오른쪽: 실행 및 결과 */}
          <Col xs={24} lg={10}>
            <Card
              title="실행 및 결과"
              extra={
                (() => {
                  const canExecute = currentTemplate && currentTemplate.steps.length > 0 && inputText.trim();
                  const validation = currentTemplate ? validateChainSteps(currentTemplate.steps) : { valid: false, errors: [] };
                  const hasValidationErrors = !validation.valid;

                  return (
                    <Space>
                      {hasValidationErrors && (
                        <Tooltip
                          title={
                            <div>
                              <div style={{ marginBottom: 4 }}>실행 불가 사유:</div>
                              <ul style={{ paddingLeft: 16, margin: 0 }}>
                                {validation.errors.map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          }
                        >
                          <Button
                            size="small"
                            danger
                            icon={<span>⚠️</span>}
                          >
                            문제 있음
                          </Button>
                        </Tooltip>
                      )}
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        loading={isExecuting}
                        onClick={handleExecuteChain}
                        disabled={!canExecute || hasValidationErrors}
                      >
                        실행
                      </Button>
                    </Space>
                  );
                })()
              }
            >
              <div style={{ marginBottom: 16 }}>
                <Text strong>입력 텍스트:</Text>
                <TextArea
                  rows={4}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="처리할 텍스트를 입력하세요..."
                  style={{ marginTop: 4 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>결과:</Text>
                  {outputText && (
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={handleCopyOutput}
                    >
                      복사
                    </Button>
                  )}
                </div>
                <TextArea
                  rows={6}
                  value={outputText}
                  readOnly
                  style={{
                    marginTop: 4,
                    backgroundColor: outputText ? '#f6ffed' : '#fafafa',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              {executionResult && (
                <div>
                  <Text strong>실행 정보:</Text>
                  <div style={{ marginTop: 8, fontSize: '12px' }}>
                    <div>총 소요 시간: {executionResult.totalDuration}ms</div>
                    <div>
                      성공한 스텝: {executionResult.steps.filter((s: any) => s.success).length} / {executionResult.steps.length}
                    </div>
                    {executionResult.steps.some((s: any) => !s.success) && (
                      <Alert
                        type="warning"
                        message="일부 스텝에서 오류가 발생했습니다"
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 템플릿 선택 모달 */}
        <Modal
          title="체인 템플릿 선택"
          open={showTemplateModal}
          onCancel={() => setShowTemplateModal(false)}
          footer={null}
          width={600}
        >
          <div style={{ marginBottom: 16 }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                handleCreateNewTemplate();
                setShowTemplateModal(false);
              }}
              style={{ width: '100%' }}
            >
              새 템플릿 만들기
            </Button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {templates.map(template => (
              <Card
                key={template.id}
                size="small"
                hoverable
                onClick={() => handleLoadTemplate(template)}
                style={{ marginBottom: 8, cursor: 'pointer' }}
                actions={[
                  <Tooltip title="템플릿 삭제" key="delete">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        Modal.confirm({
                          title: '템플릿 삭제',
                          content: `"${template.name}" 템플릿을 삭제하시겠습니까?`,
                          okText: '삭제',
                          cancelText: '취소',
                          onOk: () => deleteTemplate(template.id),
                        });
                      }}
                    />
                  </Tooltip>,
                ]}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text strong>{template.name}</Text>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                    {template.description || '설명 없음'}
                  </div>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <Tag>{template.steps.length}개 스텝</Tag>
                  {template.tags?.map(tag => (
                    <Tag key={tag} color="blue">{tag}</Tag>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Modal>

        {/* 템플릿 저장 모달 */}
        <Modal
          title="체인 템플릿 저장"
          open={showSaveModal}
          onCancel={() => {
            setShowSaveModal(false);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          afterOpenChange={(open) => {
            if (open && currentTemplate) {
              // 모달이 열릴 때마다 현재 템플릿 정보로 폼을 설정
              form.setFieldsValue({
                name: currentTemplate.name,
                description: currentTemplate.description,
                tags: currentTemplate.tags,
              });
            }
          }}
        >
          <Form
            form={form}
            onFinish={handleSaveTemplate}
            layout="vertical"
          >
            <Form.Item
              name="name"
              label="템플릿 이름"
              rules={[{ required: true, message: '템플릿 이름을 입력해주세요' }]}
            >
              <Input placeholder="체인 템플릿 이름을 입력하세요" />
            </Form.Item>

            <Form.Item
              name="description"
              label="설명"
            >
              <TextArea
                rows={3}
                placeholder="템플릿 설명을 입력하세요 (선택사항)"
              />
            </Form.Item>

            <Form.Item
              name="tags"
              label="태그"
            >
              <Select
                mode="tags"
                placeholder="태그를 추가하세요 (선택사항)"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default ChainBuilderPage;