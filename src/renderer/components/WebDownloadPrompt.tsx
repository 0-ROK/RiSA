import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import { getPlatformServices } from '../services';

const { Text } = Typography;

type Platform = 'mac' | 'windows' | 'linux' | 'unknown';

const services = getPlatformServices();

const STORAGE_KEY = 'risa.web.downloadPrompt.dismissed';

const detectPlatform = (): Platform => {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('macintosh') || userAgent.includes('mac os')) return 'mac';
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('linux')) return 'linux';

  return 'unknown';
};

const getDownloadUrl = (platform: Platform): string => {
  const base = 'https://ri-sa-kklc.vercel.app';
  switch (platform) {
    case 'mac':
      return `${base}/?platform=macos#download`;
    case 'windows':
      return `${base}/?platform=windows#download`;
    case 'linux':
      return `${base}/?platform=linux#download`;
    default:
      return `${base}/#download`;
  }
};

const getPrimaryLabel = (platform: Platform): string => {
  switch (platform) {
    case 'mac':
      return 'macOS 설치 파일 받기';
    case 'windows':
      return 'Windows 다운로드 확인';
    case 'linux':
      return 'Linux 다운로드 확인';
    default:
      return '다운로드 섹션 열기';
  }
};

const WebDownloadPrompt: React.FC = () => {
  if (services.environment !== 'web') {
    return null;
  }

  const [platform, setPlatform] = useState<Platform>('unknown');
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (services.environment !== 'web') return;
    setPlatform(detectPlatform());
  }, []);

  const downloadUrl = useMemo(() => getDownloadUrl(platform), [platform]);
  const primaryLabel = useMemo(() => getPrimaryLabel(platform), [platform]);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore storage failures
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 1000,
        background: '#ffffff',
        border: '1px solid #d9d9d9',
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
        padding: '16px 24px',
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      <Space
        direction="horizontal"
        size="large"
        align="center"
        style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 16 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Text strong style={{ fontSize: 15 }}>
            로컬 앱을 설치하면 모든 RSA 암·복호화 기능을 사용할 수 있어요.
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            웹 데모에서는 키 생성과 암·복호화가 제한되므로, 데스크톱 앱을 다운로드해 보세요.
          </Text>
        </div>

        <Space size="middle" wrap>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {primaryLabel}
          </Button>
          <Button type="text" icon={<CloseOutlined />} onClick={handleDismiss}>
            닫기
          </Button>
        </Space>
      </Space>
    </div>
  );
};

export default WebDownloadPrompt;
