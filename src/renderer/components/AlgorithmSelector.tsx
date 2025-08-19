import React from 'react';
import { Select, Alert, Space } from 'antd';
import { ALGORITHM_INFO } from '../../shared/constants';

export interface AlgorithmSelectorProps {
  value?: 'RSA-OAEP' | 'RSA-PKCS1';
  onChange?: (value: 'RSA-OAEP' | 'RSA-PKCS1') => void;
  onInternalChange?: (value: 'RSA-OAEP' | 'RSA-PKCS1') => void;
  style?: React.CSSProperties;
  placeholder?: string;
  showWarning?: boolean;
  warningStyle?: React.CSSProperties;
}

const AlgorithmSelector: React.FC<AlgorithmSelectorProps> = ({
  value,
  onChange,
  onInternalChange,
  style,
  placeholder = "알고리즘을 선택하세요",
  showWarning = true,
  warningStyle = {}
}) => {
  const handleChange = (newValue: 'RSA-OAEP' | 'RSA-PKCS1') => {
    onChange?.(newValue);
    onInternalChange?.(newValue);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        style={{ width: '100%', ...style }}
        value={value}
        onChange={handleChange}
        optionLabelProp="label"
        placeholder={placeholder}
      >
        <Select.Option 
          value="RSA-OAEP"
          label={`${ALGORITHM_INFO['RSA-OAEP'].name} (권장)`}
        >
          <div>
            <div style={{ fontWeight: 'bold' }}>{ALGORITHM_INFO['RSA-OAEP'].name}</div>
            <div style={{ 
              fontSize: '11px', 
              color: '#52c41a',
              marginTop: '2px'
            }}>
              {ALGORITHM_INFO['RSA-OAEP'].description}
            </div>
          </div>
        </Select.Option>
        <Select.Option 
          value="RSA-PKCS1"
          label={`${ALGORITHM_INFO['RSA-PKCS1'].name} (보안 경고)`}
        >
          <div>
            <div style={{ fontWeight: 'bold' }}>{ALGORITHM_INFO['RSA-PKCS1'].name}</div>
            <div style={{ 
              fontSize: '11px', 
              color: '#ff7875',
              marginTop: '2px'
            }}>
              {ALGORITHM_INFO['RSA-PKCS1'].description}
            </div>
          </div>
        </Select.Option>
      </Select>
      
      {/* PKCS1 보안 경고 */}
      {showWarning && value === 'RSA-PKCS1' && (
        <Alert
          message="보안 알림"
          description="RSA-PKCS1 패딩은 보안상 지원되지 않아 OAEP 패딩이 대신 사용됩니다."
          type="warning"
          showIcon
          style={{ fontSize: '12px', ...warningStyle }}
        />
      )}
    </Space>
  );
};

export default AlgorithmSelector;