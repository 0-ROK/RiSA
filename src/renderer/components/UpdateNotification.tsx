import React, { useEffect, useState } from 'react';
import { Modal, Button, Progress, Typography, Space } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

const UpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    // 업데이트 이벤트 리스너 등록
    window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateAvailable(info);
    });

    window.electronAPI.onDownloadProgress((progress: DownloadProgress) => {
      setDownloadProgress(progress);
    });

    window.electronAPI.onUpdateDownloaded((info: UpdateInfo) => {
      setUpdateDownloaded(info);
      setDownloadProgress(null);
      setUpdateError(null);
    });

    // 업데이트 에러 핸들링
    window.electronAPI.onUpdateError?.((error: string) => {
      setUpdateError(error);
      setDownloadProgress(null);
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  const handleDownloadUpdate = () => {
    // === 자동 다운로드 ===
    // electron-updater가 GitHub Releases에서 직접 다운로드
    window.electronAPI.startDownload?.();
    setUpdateAvailable(null);
    // 다운로드 진행 상황은 onDownloadProgress로 추적됨
  };

  const handleManualDownload = () => {
    // === 수동 다운로드 (Fallback) ===
    // 자동 다운로드 실패 시 랜딩 페이지로 이동
    // 랜딩 페이지는 GitHub Pages에서 실제 다운로드 링크를 가져와 표시
    const repoUrl = 'https://0-rok.github.io/RiSA';
    window.open(repoUrl, '_blank');
    setUpdateAvailable(null);
  };

  const handleRestartAndInstall = () => {
    window.electronAPI.restartAndInstall();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatReleaseNotes = (releaseNotes: string): React.ReactNode => {
    try {
      // HTML 태그가 있는지 확인
      const hasHtmlTags = /<[^>]*>/g.test(releaseNotes);
      
      if (hasHtmlTags) {
        // HTML 태그 제거하고 마크다운 스타일로 변환
        let formatted = releaseNotes
          .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '## $1\n')
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
          .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
          .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
          .replace(/<ul[^>]*>/gi, '')
          .replace(/<\/ul>/gi, '')
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<\/li>/gi, '\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<p[^>]*>/gi, '')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]*>/g, '') // 남은 모든 HTML 태그 제거
          .replace(/&nbsp;/gi, ' ')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&amp;/gi, '&')
          .trim();
        
        return <Text style={{ fontSize: 13, fontFamily: 'inherit' }}>{formatted}</Text>;
      }
      
      // 일반 텍스트인 경우 그대로 표시
      return <Text style={{ fontSize: 13, fontFamily: 'inherit' }}>{releaseNotes}</Text>;
    } catch (error) {
      console.error('릴리즈 노트 포맷팅 오류:', error);
      return <Text style={{ fontSize: 13, fontFamily: 'inherit' }}>{releaseNotes}</Text>;
    }
  };

  return (
    <>
      {/* 업데이트 사용 가능 알림 */}
      <Modal
        title={
          <Space>
            <DownloadOutlined />
            업데이트 사용 가능
          </Space>
        }
        open={!!updateAvailable}
        footer={[
          <Button key="manual" onClick={handleManualDownload}>
            수동 다운로드
          </Button>,
          <Button key="cancel" onClick={() => setUpdateAvailable(null)}>
            나중에
          </Button>,
          <Button key="auto" type="primary" onClick={handleDownloadUpdate}>
            자동 다운로드
          </Button>
        ]}
        onCancel={() => setUpdateAvailable(null)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>새로운 버전이 사용 가능합니다!</Text>
          <Title level={4} style={{ margin: 0 }}>
            버전 {updateAvailable?.version}
          </Title>
          {updateAvailable?.releaseDate && (
            <Text type="secondary">
              릴리즈 날짜: {new Date(updateAvailable.releaseDate).toLocaleDateString()}
            </Text>
          )}
          {updateAvailable?.releaseNotes && (
            <div>
              <Text strong>릴리즈 노트:</Text>
              <div 
                style={{ 
                  marginTop: 8, 
                  maxHeight: 200, 
                  overflow: 'auto',
                  padding: 12,
                  backgroundColor: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5
                }}
              >
                {formatReleaseNotes(updateAvailable.releaseNotes)}
              </div>
            </div>
          )}
        </Space>
      </Modal>

      {/* 다운로드 진행 상황 */}
      <Modal
        title={
          <Space>
            <DownloadOutlined />
            업데이트 다운로드 중
          </Space>
        }
        open={!!downloadProgress}
        footer={null}
        closable={false}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>업데이트를 다운로드하고 있습니다...</Text>
          <Progress
            percent={Math.round(downloadProgress?.percent || 0)}
            status="active"
          />
          {downloadProgress && (
            <div>
              <Text type="secondary">
                {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
              </Text>
              <br />
              <Text type="secondary">
                속도: {formatBytes(downloadProgress.bytesPerSecond)}/초
              </Text>
            </div>
          )}
        </Space>
      </Modal>

      {/* 업데이트 다운로드 완료 */}
      <Modal
        title={
          <Space>
            <ReloadOutlined />
            업데이트 준비 완료
          </Space>
        }
        open={!!updateDownloaded}
        onOk={handleRestartAndInstall}
        onCancel={() => setUpdateDownloaded(null)}
        okText="지금 재시작"
        cancelText="나중에 재시작"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>업데이트 다운로드가 완료되었습니다.</Text>
          <Title level={4} style={{ margin: 0 }}>
            버전 {updateDownloaded?.version}
          </Title>
          <Text type="secondary">
            업데이트를 적용하려면 앱을 재시작해야 합니다.
          </Text>
        </Space>
      </Modal>

      {/* 업데이트 에러 알림 */}
      <Modal
        title="업데이트 오류"
        open={!!updateError}
        footer={[
          <Button key="manual" type="primary" onClick={handleManualDownload}>
            수동 다운로드
          </Button>,
          <Button key="close" onClick={() => setUpdateError(null)}>
            닫기
          </Button>
        ]}
        onCancel={() => setUpdateError(null)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="danger">자동 업데이트 중 오류가 발생했습니다.</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {updateError}
          </Text>
          <Text>아래 버튼을 클릭하여 수동으로 다운로드할 수 있습니다.</Text>
        </Space>
      </Modal>
    </>
  );
};

export default UpdateNotification;