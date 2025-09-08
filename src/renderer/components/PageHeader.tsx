import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5;
  style?: React.CSSProperties;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  extra,
  level = 2,
  style
}) => {
  return (
    <div
      style={{
        WebkitAppRegion: 'drag',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 24px',
        paddingTop: '24px',
        paddingBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        userSelect: 'none',
        ...style
      }}
    >
      <div>
        <Title level={level} style={{ marginBottom: subtitle ? '8px' : '0', display: 'flex', alignItems: 'center' }}>
          {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
          {title}
        </Title>
        {subtitle && (
          <Typography.Text type="secondary" style={{ fontSize: '14px', display: 'block' }}>
            {subtitle}
          </Typography.Text>
        )}
      </div>
      
      {extra && (
        <div style={{ WebkitAppRegion: 'no-drag', flexShrink: 0 }}>
          {extra}
        </div>
      )}
    </div>
  );
};

export default PageHeader;