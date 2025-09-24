import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import { getPlatformServices } from '../services';

const { Text } = Typography;

type PlatformOS = 'macos' | 'windows' | 'linux' | 'unknown';
type PlatformArch = 'arm64' | 'x64' | 'ia32' | 'unknown';

type PlatformInfo = {
  os: PlatformOS;
  arch: PlatformArch;
};

type GithubAsset = {
  name: string;
  browser_download_url: string;
  size?: number;
};

type SelectedAsset = {
  url: string;
  label: string;
  size?: number;
};

const services = getPlatformServices();

const RELEASE_LATEST_URL = 'https://github.com/0-ROK/RiSA/releases/latest';
const GITHUB_RELEASE_API = 'https://api.github.com/repos/0-ROK/RiSA/releases/latest';

const detectPlatform = async (): Promise<PlatformInfo> => {
  if (typeof navigator === 'undefined') {
    return { os: 'unknown', arch: 'unknown' };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  const uaData: any = (navigator as any).userAgentData;

  const hasTouchCapabilities = typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;

  if (platform.includes('mac') || userAgent.includes('mac')) {
    let arch: PlatformArch = 'x64';

    const lowerUA = userAgent;
    if (
      lowerUA.includes('arm64') ||
      lowerUA.includes('apple silicon')
    ) {
      arch = 'arm64';
    }

    if (navigator.platform === 'MacIntel' && hasTouchCapabilities) {
      arch = 'arm64';
    }

    if (uaData?.platform && String(uaData.platform).toLowerCase() === 'macos' && typeof uaData.getHighEntropyValues === 'function') {
      try {
        const entropy = await uaData.getHighEntropyValues(['architecture']);
        const architecture = String(entropy?.architecture || '').toLowerCase();
        if (architecture.includes('arm')) {
          arch = 'arm64';
        } else if (architecture.includes('x86')) {
          arch = 'x64';
        }
      } catch {
        // Ignore failures and fall back to heuristics
      }
    }

    return { os: 'macos', arch };
  }

  if (platform.includes('win') || userAgent.includes('windows')) {
    return { os: 'windows', arch: 'unknown' };
  }

  if (platform.includes('linux') || userAgent.includes('linux')) {
    return { os: 'linux', arch: 'unknown' };
  }

  return { os: 'unknown', arch: 'unknown' };
};

const formatFileSize = (bytes?: number): string | undefined => {
  if (!bytes || Number.isNaN(bytes)) {
    return undefined;
  }

  if (bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

const selectAssetForPlatform = (assets: GithubAsset[], platform: PlatformInfo): SelectedAsset | null => {
  const normalizedAssets = assets.filter(asset => !asset.name.toLowerCase().includes('blockmap'));

  const findByPredicates = (predicates: Array<(assetName: string) => boolean>): GithubAsset | undefined =>
    predicates.reduce<GithubAsset | undefined>((found, predicate) => {
      if (found) return found;
      return normalizedAssets.find(asset => predicate(asset.name.toLowerCase()));
    }, undefined);

  const pickMacAsset = (): GithubAsset | undefined => {
    const isArm = platform.arch === 'arm64';
    return findByPredicates([
      (name) => name.includes('mac') && name.includes(isArm ? 'arm64' : 'x64') && name.endsWith('.dmg'),
      (name) => name.includes('mac') && name.includes(isArm ? 'arm64' : 'x64') && name.endsWith('.zip'),
      (name) => name.includes('mac') && name.includes(isArm ? 'arm64' : 'x64'),
      (name) => name.includes('mac') && name.endsWith('.dmg'),
      (name) => name.includes('mac'),
    ]);
  };

  const pickWindowsAsset = (): GithubAsset | undefined =>
    findByPredicates([
      (name) => name.includes('win') && name.endsWith('.exe'),
      (name) => name.includes('windows') && name.endsWith('.exe'),
      (name) => name.endsWith('.exe'),
      (name) => name.includes('win'),
    ]);

  const pickLinuxAsset = (): GithubAsset | undefined =>
    findByPredicates([
      (name) => name.endsWith('.appimage'),
      (name) => name.endsWith('.deb'),
      (name) => name.includes('linux'),
    ]);

  let selected: GithubAsset | undefined;
  let label = '';

  switch (platform.os) {
    case 'macos':
      selected = pickMacAsset();
      label = platform.arch === 'arm64' ? 'macOS (Apple Silicon)' : 'macOS (Intel)';
      break;
    case 'windows':
      selected = pickWindowsAsset();
      label = 'Windows';
      break;
    case 'linux':
      selected = pickLinuxAsset();
      label = 'Linux';
      break;
    default:
    // fall through
  }

  if (selected) {
    const size = formatFileSize(selected.size);
    const suffix = size ? ` · ${size}` : '';
    const extensionMatch = selected.name.split('.').pop();
    const extensionLabel = extensionMatch ? extensionMatch.toUpperCase() : 'Download';
    return {
      url: selected.browser_download_url,
      label: `${label} ${extensionLabel}${suffix}`.trim(),
      size: selected.size,
    };
  }

  if (normalizedAssets.length > 0) {
    const fallbackAsset = normalizedAssets[0];
    const size = formatFileSize(fallbackAsset.size);
    return {
      url: fallbackAsset.browser_download_url,
      label: `${fallbackAsset.name}${size ? ` · ${size}` : ''}`,
      size: fallbackAsset.size,
    };
  }

  return null;
};

const getPrimaryLabel = (platform: PlatformInfo, hasDirectAsset: boolean, loading: boolean): string => {
  if (loading) {
    return '최신 버전 확인 중...';
  }

  if (!hasDirectAsset) {
    return 'GitHub 릴리즈 열기';
  }

  switch (platform.os) {
    case 'macos':
      return platform.arch === 'arm64' ? 'macOS (Apple Silicon) 다운로드' : 'macOS (Intel) 다운로드';
    case 'windows':
      return 'Windows 다운로드';
    case 'linux':
      return 'Linux 다운로드';
    default:
      return 'GitHub 릴리즈 열기';
  }
};

const statusMessage = (loading: boolean, error: string | null, asset: SelectedAsset | null): string => {
  if (loading) {
    return '최신 GitHub 릴리즈 정보를 불러오는 중입니다...';
  }
  if (error) {
    return '릴리즈 정보를 불러오지 못했습니다. GitHub 릴리즈 페이지에서 직접 파일을 선택하세요.';
  }
  if (asset) {
    return `추천 설치 파일: ${asset.label}`;
  }
  return '플랫폼에 맞는 설치 파일을 찾지 못했습니다. GitHub 릴리즈 페이지에서 직접 선택하세요.';
};

const WebDownloadPrompt: React.FC = () => {
  if (services.environment !== 'web') {
    return null;
  }

  const [platform, setPlatform] = useState<PlatformInfo>({ os: 'unknown', arch: 'unknown' });
  const [visible, setVisible] = useState<boolean>(true);
  const [asset, setAsset] = useState<SelectedAsset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (services.environment !== 'web') return;

    let cancelled = false;

    const initialise = async () => {
      setLoading(true);
      setError(null);

      let platformInfo: PlatformInfo = { os: 'unknown', arch: 'unknown' };

      try {
        platformInfo = await detectPlatform();
        if (cancelled) {
          return;
        }
        setPlatform(platformInfo);
      } catch {
        if (cancelled) {
          return;
        }
        setPlatform({ os: 'unknown', arch: 'unknown' });
      }

      try {
        const response = await fetch(GITHUB_RELEASE_API, {
          headers: {
            Accept: 'application/vnd.github+json',
          },
        });

        if (!response.ok) {
          throw new Error(`GitHub API 요청 실패 (status: ${response.status})`);
        }

        const release = await response.json();
        const assets = Array.isArray(release?.assets)
          ? release.assets
            .map((item: GithubAsset) => ({
              name: String(item?.name ?? ''),
              browser_download_url: String(item?.browser_download_url ?? ''),
              size: typeof item?.size === 'number' ? item.size : undefined,
            }))
            .filter((assetItem: GithubAsset) => assetItem.name && assetItem.browser_download_url)
          : [];

        if (cancelled) {
          return;
        }

        const selected = selectAssetForPlatform(assets, platformInfo);
        setAsset(selected);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setAsset(null);
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initialise();

    return () => {
      cancelled = true;
    };
  }, []);

  const primaryLabel = useMemo(
    () => getPrimaryLabel(platform, Boolean(asset), loading),
    [platform, asset, loading]
  );

  const handleDismiss = () => {
    setVisible(false);
  };

  const handleDownloadClick = () => {
    const target = asset?.url ?? RELEASE_LATEST_URL;
    window.open(target, '_blank', 'noopener,noreferrer');
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
            브라우저에서도 키 생성과 암·복호화를 체험할 수 있지만, 민감한 데이터는 데스크톱 앱에서 처리하는 것이 더 안전합니다.
          </Text>
          <Text type={error ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
            {statusMessage(loading, error, asset)}
          </Text>
        </div>

        <Space size="middle" wrap>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownloadClick}
            loading={loading}
            disabled={loading && !asset}
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
