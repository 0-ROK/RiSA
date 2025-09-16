import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Switch, Select, Button, Tooltip, Alert, Input, Typography, Radio, Space } from 'antd';
import { DeleteOutlined, LockOutlined, UnlockOutlined, MenuOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { ChainStep, SavedKey, ChainStepResult, HttpTemplate } from '../../shared/types';
import { CHAIN_MODULES } from '../../shared/constants';

const { Text } = Typography;

interface SortableStepItemProps {
  step: ChainStep;
  index: number;
  savedKeys: SavedKey[];
  httpTemplates?: HttpTemplate[];
  onToggle: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  onUpdateStep: (stepId: string, updates: Partial<ChainStep>) => void;
  executionResult?: ChainStepResult; // 실행 결과 추가
}

export const SortableStepItem: React.FC<SortableStepItemProps> = ({
  step,
  index,
  savedKeys,
  httpTemplates = [],
  onToggle,
  onDelete,
  onUpdateStep,
  executionResult,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const moduleInfo = CHAIN_MODULES[step.type];
  const needsKeySelection = step.type === 'rsa-encrypt' || step.type === 'rsa-decrypt';
  const needsHttpConfig = step.type === 'http-parse' || step.type === 'http-build';
  const hasValidKey = needsKeySelection && step.params?.keyId;
  const hasWarning = needsKeySelection && (!step.params || !step.params.keyId);
  
  // 실행 결과 상태
  const hasExecutionResult = executionResult && executionResult.stepId === step.id;
  const isSuccess = hasExecutionResult && executionResult.success;
  const isError = hasExecutionResult && !executionResult.success;

  // 경로 템플릿에서 파라미터 추출
  const extractPathParams = (pathTemplate: string): string[] => {
    if (!pathTemplate) return [];
    const matches = pathTemplate.match(/:(\w+)|\{(\w+)\}/g);
    return matches ? matches.map(match => match.replace(/[:{}]/g, '')) : [];
  };

  // 쿼리 템플릿에서 파라미터 추출
  const extractQueryParams = (queryTemplate: string): string[] => {
    if (!queryTemplate) return [];
    try {
      const parsed = JSON.parse(queryTemplate);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // HTTP 템플릿 선택 핸들러
  const handleTemplateSelect = (templateId: string) => {
    const template = httpTemplates.find(t => t.id === templateId);
    if (template) {
      onUpdateStep(step.id, {
        params: {
          ...step.params,
          httpTemplateId: templateId,
          baseUrl: template.baseUrl,
          pathTemplate: template.pathTemplate,
          queryTemplate: template.queryTemplate,
          // 출력 타입 초기화
          outputType: step.params?.outputType || 'full',
        }
      });
    }
  };

  // 현재 선택된 템플릿
  const selectedTemplate = httpTemplates.find(t => t.id === step.params?.httpTemplateId);
  const availablePathParams = selectedTemplate ? extractPathParams(selectedTemplate.pathTemplate) : [];
  const availableQueryParams = selectedTemplate ? extractQueryParams(selectedTemplate.queryTemplate) : [];

  const getStepIcon = () => {
    switch (step.type) {
      case 'rsa-encrypt':
        return <LockOutlined style={{ color: hasValidKey ? '#52c41a' : undefined }} />;
      case 'rsa-decrypt':
        return <UnlockOutlined style={{ color: hasValidKey ? '#52c41a' : undefined }} />;
      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        size="small"
        style={{
          marginBottom: 8,
          opacity: step.enabled ? 1 : 0.6,
          border: hasWarning ? '1px solid #ff4d4f' : 
                  isError ? '1px solid #ff4d4f' :
                  isSuccess ? '1px solid #52c41a' : undefined,
          backgroundColor: isError ? '#fff2f0' : 
                          isSuccess ? '#f6ffed' : undefined,
          width: '100%',
          overflow: 'hidden'
        }}
        styles={{ body: { padding: '12px 16px', overflow: 'hidden' } }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Switch
              size="small"
              checked={step.enabled}
              onChange={() => onToggle(step.id)}
            />
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => onDelete(step.id)}
              style={{ color: '#ff4d4f' }}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 드래그 핸들 */}
          <div
            {...listeners}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              color: '#8c8c8c',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
              e.currentTarget.style.color = '#1890ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#8c8c8c';
            }}
          >
            <MenuOutlined />
          </div>

          {/* 스텝 정보 */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {getStepIcon()}
              <span style={{ fontWeight: 500, fontSize: '14px' }}>
                {step.name || moduleInfo?.name || step.type}
              </span>
              <span style={{ 
                backgroundColor: '#f0f0f0', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '12px',
                color: '#666'
              }}>
                {index + 1}
              </span>
              {hasValidKey && (
                <span style={{ color: '#52c41a', fontSize: '12px' }}>✓</span>
              )}
              {hasWarning && (
                <Tooltip title="키를 선택해주세요">
                  <span style={{ color: '#ff4d4f' }}>⚠️</span>
                </Tooltip>
              )}
              {/* 실행 결과 상태 표시 */}
              {isSuccess && (
                <Tooltip title={`실행 성공 (${executionResult?.duration}ms)`}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
                </Tooltip>
              )}
              {isError && (
                <Tooltip title={`실행 실패: ${executionResult?.error}`}>
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />
                </Tooltip>
              )}
            </div>
            
            {moduleInfo?.description && (
              <div style={{ color: '#8c8c8c', fontSize: '12px', marginBottom: 8 }}>
                {moduleInfo.description}
              </div>
            )}

            {/* RSA 키 및 알고리즘 선택 */}
            {needsKeySelection && (
              <div style={{ marginTop: 8, width: '100%' }}>
                <div style={{ marginBottom: 8 }}>
                  <Select
                    placeholder="RSA 키 선택"
                    value={step.params?.keyId}
                    onChange={(keyId) => {
                      const selectedKey = savedKeys.find(key => key.id === keyId);
                      onUpdateStep(step.id, {
                        params: { 
                          ...step.params, 
                          keyId,
                          // 키 선택 시 해당 키의 선호 알고리즘을 자동 설정 (기존 설정이 없는 경우만)
                          algorithm: step.params?.algorithm || selectedKey?.preferredAlgorithm || 'RSA-OAEP'
                        }
                      });
                    }}
                    style={{ width: '100%', maxWidth: '100%' }}
                    size="small"
                  >
                    {savedKeys.map(key => (
                      <Select.Option key={key.id} value={key.id}>
                        {key.name} ({key.keySize} bits)
                        {key.preferredAlgorithm && (
                          <span style={{ color: '#666', fontSize: '11px' }}> - {key.preferredAlgorithm}</span>
                        )}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                
                {step.params?.keyId && (
                  <div>
                    <Select
                      placeholder="알고리즘 선택"
                      value={step.params?.algorithm || savedKeys.find(k => k.id === step.params?.keyId)?.preferredAlgorithm || 'RSA-OAEP'}
                      onChange={(algorithm) => onUpdateStep(step.id, {
                        params: { ...step.params, algorithm }
                      })}
                      style={{ width: '100%', maxWidth: '100%' }}
                      size="small"
                    >
                      <Select.Option value="RSA-OAEP">RSA-OAEP (권장)</Select.Option>
                      <Select.Option value="RSA-PKCS1">RSA-PKCS1</Select.Option>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* HTTP 설정 */}
            {needsHttpConfig && (
              <div style={{ marginTop: 8, width: '100%' }}>
                {/* 템플릿 선택 */}
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                    템플릿 선택:
                  </Text>
                  <Select
                    placeholder="HTTP 템플릿 선택"
                    value={step.params?.httpTemplateId}
                    onChange={handleTemplateSelect}
                    style={{ width: '100%' }}
                    size="small"
                    allowClear
                  >
                    {httpTemplates.map(template => (
                      <Select.Option key={template.id} value={template.id}>
                        {template.name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {/* HTTP Parse 설정 */}
                {step.type === 'http-parse' && (
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 6 }}>
                      출력 선택:
                    </Text>
                    <Radio.Group
                      value={step.params?.outputType || 'full'}
                      onChange={(e) => onUpdateStep(step.id, {
                        params: { ...step.params, outputType: e.target.value, outputField: undefined, outputParam: undefined }
                      })}
                      style={{ width: '100%' }}
                      size="small"
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Radio value="full">🔗 전체 파싱 결과 (JSON)</Radio>
                        <Radio value="component">🌐 URL 구성요소</Radio>
                        <Radio value="pathParam">🔑 경로 파라미터</Radio>
                        <Radio value="queryParam">❓ 쿼리 파라미터</Radio>
                      </Space>
                    </Radio.Group>

                    {/* URL 구성요소 선택 */}
                    {step.params?.outputType === 'component' && (
                      <div style={{ marginTop: 8, marginLeft: 20 }}>
                        <Select
                          placeholder="구성요소 선택"
                          value={step.params?.outputField}
                          onChange={(value) => onUpdateStep(step.id, {
                            params: { ...step.params, outputField: value }
                          })}
                          style={{ width: '100%' }}
                          size="small"
                        >
                          <Select.Option value="host">호스트 (예: api.github.com)</Select.Option>
                          <Select.Option value="pathname">경로 (예: /repos/owner/repo)</Select.Option>
                        </Select>
                      </div>
                    )}

                    {/* 경로 파라미터 선택 */}
                    {step.params?.outputType === 'pathParam' && (
                      <div style={{ marginTop: 8, marginLeft: 20 }}>
                        <Radio.Group
                          value={step.params?.outputField || 'all'}
                          onChange={(e) => onUpdateStep(step.id, {
                            params: { ...step.params, outputField: e.target.value, outputParam: undefined }
                          })}
                          style={{ width: '100%' }}
                          size="small"
                        >
                          <Space direction="vertical">
                            <Radio value="all">모든 경로 파라미터 (JSON)</Radio>
                            <Radio value="specific" disabled={availablePathParams.length === 0}>
                              특정 파라미터 값
                            </Radio>
                          </Space>
                        </Radio.Group>

                        {step.params?.outputField === 'specific' && availablePathParams.length > 0 && (
                          <div style={{ marginTop: 6, marginLeft: 20 }}>
                            <Select
                              placeholder="파라미터 선택"
                              value={step.params?.outputParam}
                              onChange={(value) => onUpdateStep(step.id, {
                                params: { ...step.params, outputParam: value }
                              })}
                              style={{ width: '100%' }}
                              size="small"
                            >
                              {availablePathParams.map(param => (
                                <Select.Option key={param} value={param}>
                                  {param}
                                </Select.Option>
                              ))}
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 쿼리 파라미터 선택 */}
                    {step.params?.outputType === 'queryParam' && (
                      <div style={{ marginTop: 8, marginLeft: 20 }}>
                        <Radio.Group
                          value={step.params?.outputField || 'all'}
                          onChange={(e) => onUpdateStep(step.id, {
                            params: { ...step.params, outputField: e.target.value, outputParam: undefined }
                          })}
                          style={{ width: '100%' }}
                          size="small"
                        >
                          <Space direction="vertical">
                            <Radio value="all">모든 쿼리 파라미터 (JSON)</Radio>
                            <Radio value="specific">특정 파라미터 값</Radio>
                          </Space>
                        </Radio.Group>

                        {step.params?.outputField === 'specific' && (
                          <div style={{ marginTop: 6, marginLeft: 20 }}>
                            <Input
                              placeholder="파라미터 이름 (예: page)"
                              value={step.params?.outputParam || ''}
                              onChange={(e) => onUpdateStep(step.id, {
                                params: { ...step.params, outputParam: e.target.value }
                              })}
                              size="small"
                            />
                            {availableQueryParams.length > 0 && (
                              <div style={{ marginTop: 4, fontSize: '11px', color: '#666' }}>
                                템플릿 파라미터: {availableQueryParams.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* HTTP Build 설정 */}
                {step.type === 'http-build' && (
                  <>
                    {/* 템플릿이 선택되지 않은 경우 직접 URL 입력 */}
                    {!selectedTemplate && (
                      <div style={{ marginBottom: 8 }}>
                        <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                          베이스 URL:
                        </Text>
                        <Input
                          placeholder="https://api.example.com"
                          value={step.params?.baseUrl || ''}
                          onChange={(e) => onUpdateStep(step.id, {
                            params: { ...step.params, baseUrl: e.target.value }
                          })}
                          size="small"
                        />
                      </div>
                    )}

                    {/* 템플릿이 선택된 경우 매핑 설정 */}
                    {selectedTemplate && (
                      <div style={{ marginBottom: 8 }}>
                        <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                          입력 매핑 설정:
                        </Text>
                        <div style={{
                          backgroundColor: '#f8f9fa',
                          padding: 8,
                          borderRadius: 4,
                          marginBottom: 8,
                          fontSize: '11px',
                          color: '#666'
                        }}>
                          템플릿: {selectedTemplate.name}<br/>
                          URL: {selectedTemplate.baseUrl}{selectedTemplate.pathTemplate}
                          {selectedTemplate.queryTemplate && ` (쿼리: ${selectedTemplate.queryTemplate})`}
                        </div>

                        {/* 경로 파라미터 매핑 */}
                        {availablePathParams.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: '11px', display: 'block', marginBottom: 4 }}>
                              🔑 경로 파라미터:
                            </Text>
                            {availablePathParams.map(param => (
                              <div key={param} style={{ marginBottom: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ minWidth: 60, fontSize: '11px', fontWeight: 500 }}>
                                    {param}:
                                  </span>
                                  <Select
                                    placeholder="매핑 선택"
                                    value={step.params?.paramMappings?.[param]?.type || 'auto'}
                                    onChange={(value) => {
                                      const paramMappings = { ...step.params?.paramMappings };
                                      paramMappings[param] = { type: value };
                                      onUpdateStep(step.id, {
                                        params: { ...step.params, paramMappings }
                                      });
                                    }}
                                    style={{ flex: 1 }}
                                    size="small"
                                  >
                                    <Select.Option value="auto">🔄 이전 출력 전체</Select.Option>
                                    <Select.Option value="field">📌 JSON 필드</Select.Option>
                                    <Select.Option value="fixed">📎 고정 값</Select.Option>
                                  </Select>
                                </div>

                                {step.params?.paramMappings?.[param]?.type === 'field' && (
                                  <Input
                                    placeholder="필드 경로 (예: $.id)"
                                    value={step.params?.paramMappings?.[param]?.value || ''}
                                    onChange={(e) => {
                                      const paramMappings = { ...step.params?.paramMappings };
                                      paramMappings[param] = {
                                        ...paramMappings[param],
                                        value: e.target.value
                                      };
                                      onUpdateStep(step.id, {
                                        params: { ...step.params, paramMappings }
                                      });
                                    }}
                                    size="small"
                                    style={{ marginTop: 4, marginLeft: 68 }}
                                  />
                                )}

                                {step.params?.paramMappings?.[param]?.type === 'fixed' && (
                                  <Input
                                    placeholder="고정 값"
                                    value={step.params?.paramMappings?.[param]?.value || ''}
                                    onChange={(e) => {
                                      const paramMappings = { ...step.params?.paramMappings };
                                      paramMappings[param] = {
                                        ...paramMappings[param],
                                        value: e.target.value
                                      };
                                      onUpdateStep(step.id, {
                                        params: { ...step.params, paramMappings }
                                      });
                                    }}
                                    size="small"
                                    style={{ marginTop: 4, marginLeft: 68 }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 쿼리 파라미터 매핑 */}
                        {availableQueryParams.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: '11px', display: 'block', marginBottom: 4 }}>
                              ❓ 쿼리 파라미터:
                            </Text>
                            {availableQueryParams.map(param => (
                              <div key={param} style={{ marginBottom: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ minWidth: 60, fontSize: '11px', fontWeight: 500 }}>
                                    {param}:
                                  </span>
                                  <Select
                                    placeholder="매핑 선택"
                                    value={step.params?.queryMappings?.[param]?.type || 'auto'}
                                    onChange={(value) => {
                                      const queryMappings = { ...step.params?.queryMappings };
                                      queryMappings[param] = { type: value };
                                      onUpdateStep(step.id, {
                                        params: { ...step.params, queryMappings }
                                      });
                                    }}
                                    style={{ flex: 1 }}
                                    size="small"
                                  >
                                    <Select.Option value="auto">🔄 이전 출력 전체</Select.Option>
                                    <Select.Option value="field">📌 JSON 필드</Select.Option>
                                    <Select.Option value="fixed">📎 고정 값</Select.Option>
                                    <Select.Option value="skip">⏭️ 생략</Select.Option>
                                  </Select>
                                </div>

                                {step.params?.queryMappings?.[param]?.type === 'field' && (
                                  <Input
                                    placeholder="필드 경로 (예: $.page)"
                                    value={step.params?.queryMappings?.[param]?.value || ''}
                                    onChange={(e) => {
                                      const queryMappings = { ...step.params?.queryMappings };
                                      queryMappings[param] = {
                                        ...queryMappings[param],
                                        value: e.target.value
                                      };
                                      onUpdateStep(step.id, {
                                        params: { ...step.params, queryMappings }
                                      });
                                    }}
                                    size="small"
                                    style={{ marginTop: 4, marginLeft: 68 }}
                                  />
                                )}

                                {step.params?.queryMappings?.[param]?.type === 'fixed' && (
                                  <Input
                                    placeholder="고정 값"
                                    value={step.params?.queryMappings?.[param]?.value || ''}
                                    onChange={(e) => {
                                      const queryMappings = { ...step.params?.queryMappings };
                                      queryMappings[param] = {
                                        ...queryMappings[param],
                                        value: e.target.value
                                      };
                                      onUpdateStep(step.id, {
                                        params: { ...step.params, queryMappings }
                                      });
                                    }}
                                    size="small"
                                    style={{ marginTop: 4, marginLeft: 68 }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>
            )}

            {/* 오류 메시지 표시 */}
            {isError && executionResult?.error && (
              <Alert
                message="실행 오류"
                description={
                  <div style={{ 
                    wordBreak: 'break-word',
                    maxWidth: '100%',
                    fontSize: '12px'
                  }}>
                    {executionResult.error}
                  </div>
                }
                type="error"
                style={{ 
                  marginTop: 8,
                  maxWidth: '100%',
                  width: '100%'
                }}
                showIcon
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};