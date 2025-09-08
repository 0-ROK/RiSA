import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Switch, Select, Button, Tooltip } from 'antd';
import { DeleteOutlined, LockOutlined, UnlockOutlined, MenuOutlined } from '@ant-design/icons';
import { ChainStep, SavedKey } from '../../shared/types';
import { CHAIN_MODULES } from '../../shared/constants';

interface SortableStepItemProps {
  step: ChainStep;
  index: number;
  savedKeys: SavedKey[];
  onToggle: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  onUpdateStep: (stepId: string, updates: Partial<ChainStep>) => void;
}

export const SortableStepItem: React.FC<SortableStepItemProps> = ({
  step,
  index,
  savedKeys,
  onToggle,
  onDelete,
  onUpdateStep,
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
  const hasValidKey = needsKeySelection && step.params?.keyId;
  const hasWarning = needsKeySelection && (!step.params || !step.params.keyId);

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
          border: hasWarning ? '1px solid #ff4d4f' : undefined,
        }}
        styles={{ body: { padding: '12px 16px' } }}
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
          <div style={{ flex: 1 }}>
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
            </div>
            
            {moduleInfo?.description && (
              <div style={{ color: '#8c8c8c', fontSize: '12px', marginBottom: 8 }}>
                {moduleInfo.description}
              </div>
            )}

            {/* RSA 키 선택 */}
            {needsKeySelection && (
              <div style={{ marginTop: 8 }}>
                <Select
                  placeholder="RSA 키 선택"
                  value={step.params?.keyId}
                  onChange={(keyId) => onUpdateStep(step.id, {
                    params: { ...step.params, keyId }
                  })}
                  style={{ width: '100%' }}
                  size="small"
                >
                  {savedKeys.map(key => (
                    <Select.Option key={key.id} value={key.id}>
                      {key.name} ({key.keySize} bits)
                    </Select.Option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};