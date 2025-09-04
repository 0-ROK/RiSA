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
    // 다운로드 시작 요청
    window.electronAPI.startDownload?.();
    setUpdateAvailable(null);
    // 다운로드 진행 상황은 onDownloadProgress로 추적됨
  };

  const handleManualDownload = () => {
    // 수동 다운로드를 위해 GitHub releases 페이지로 이동
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
              <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                <Text>{updateAvailable.releaseNotes}</Text>
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