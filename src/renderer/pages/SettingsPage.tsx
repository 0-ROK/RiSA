import React, { useState } from 'react';
import { 
  Layout, 
  Card, 
  Form, 
  Select, 
  Input, 
  Switch, 
  Button, 
  Space, 
  Typography, 
  message,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  SettingOutlined, 
  FolderOutlined, 
  ExportOutlined,
  ImportOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useSettings } from '../store/SettingsContext';
import { 
  RSA_KEY_SIZES, 
  RSA_ALGORITHMS, 
  ENCRYPTION_LEVELS, 
  THEMES, 
  ENVIRONMENTS 
} from '../../shared/constants';

const { Content } = Layout;
const { Title, Text } = Typography;

const SettingsPage: React.FC = () => {
  const { settings, updateSettings, loading } = useSettings();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      await updateSettings(values);
      message.success('설정이 저장되었습니다.');
    } catch (error) {
      message.error('설정 저장 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFolder = async (field: 'defaultSavePath' | 'tempPath') => {
    try {
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        form.setFieldValue(field, folderPath);
      }
    } catch (error) {
      message.error('폴더 선택 중 오류가 발생했습니다.');
    }
  };

  const handleExportSettings = async () => {
    try {
      const success = await window.electronAPI.exportSettings();
      if (success) {
        message.success('설정이 내보내기되었습니다.');
      } else {
        message.warning('내보내기가 취소되었습니다.');
      }
    } catch (error) {
      message.error('설정 내보내기 중 오류가 발생했습니다.');
    }
  };

  const handleImportSettings = async () => {
    try {
      const success = await window.electronAPI.importSettings();
      if (success) {
        message.success('설정이 가져오기되었습니다. 애플리케이션을 다시 시작해주세요.');
        // Reload the page to reflect imported settings
        window.location.reload();
      } else {
        message.warning('가져오기가 취소되었습니다.');
      }
    } catch (error) {
      message.error('설정 가져오기 중 오류가 발생했습니다.');
    }
  };

  const handleReset = () => {
    form.resetFields();
    message.info('설정이 초기화되었습니다. 저장을 클릭하여 적용하세요.');
  };

  return (
    <Content style={{ padding: '24px', background: '#f0f2f5' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Title level={2}>
          <SettingOutlined style={{ marginRight: 8 }} />
          설정
        </Title>
        
        <Form
          form={form}
          layout="vertical"
          initialValues={settings}
          onFinish={handleSave}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Card title="기본 설정" style={{ marginBottom: 24 }}>
                <Form.Item
                  label="환경"
                  name="environment"
                  tooltip="개발 환경과 운영 환경을 구분합니다"
                >
                  <Select>
                    {ENVIRONMENTS.map(env => (
                      <Select.Option key={env} value={env}>
                        {env === 'development' ? '개발' : '운영'}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="테마"
                  name="theme"
                  tooltip="애플리케이션의 색상 테마를 설정합니다"
                >
                  <Select>
                    {THEMES.map(theme => (
                      <Select.Option key={theme} value={theme}>
                        {theme === 'light' ? '라이트' : '다크'}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="자동 백업"
                  name="autoBackup"
                  valuePropName="checked"
                  tooltip="키와 설정을 자동으로 백업합니다"
                >
                  <Switch />
                </Form.Item>
              </Card>

              <Card title="RSA 암호화 설정">
                <Form.Item
                  label="RSA 키 크기"
                  name="rsaKeySize"
                  tooltip="키 크기가 클수록 보안이 강화되지만 속도는 느려집니다"
                >
                  <Select>
                    {RSA_KEY_SIZES.map(size => (
                      <Select.Option key={size} value={size}>
                        {size} bits
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="암호화 알고리즘"
                  name="algorithm"
                  tooltip="사용할 RSA 패딩 방식을 선택합니다"
                >
                  <Select>
                    {RSA_ALGORITHMS.map(algo => (
                      <Select.Option key={algo} value={algo}>
                        {algo}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="암호화 레벨"
                  name="encryptionLevel"
                  tooltip="암호화 처리 방식을 설정합니다"
                >
                  <Select>
                    {ENCRYPTION_LEVELS.map(level => (
                      <Select.Option key={level} value={level}>
                        {level === 'basic' ? '기본' : '고급'}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Card>
            </Col>

            <Col span={12}>
              <Card title="경로 설정" style={{ marginBottom: 24 }}>
                <Form.Item
                  label="기본 저장 경로"
                  name="defaultSavePath"
                  tooltip="암호화된 파일과 키가 저장될 기본 경로입니다"
                >
                  <Input.Group compact>
                    <Input 
                      style={{ width: 'calc(100% - 40px)' }}
                      placeholder="기본 저장 경로를 선택하세요"
                    />
                    <Button 
                      icon={<FolderOutlined />}
                      onClick={() => handleSelectFolder('defaultSavePath')}
                    />
                  </Input.Group>
                </Form.Item>

                <Form.Item
                  label="임시 파일 경로"
                  name="tempPath"
                  tooltip="임시 파일이 저장될 경로입니다"
                >
                  <Input.Group compact>
                    <Input 
                      style={{ width: 'calc(100% - 40px)' }}
                      placeholder="임시 파일 경로를 선택하세요"
                    />
                    <Button 
                      icon={<FolderOutlined />}
                      onClick={() => handleSelectFolder('tempPath')}
                    />
                  </Input.Group>
                </Form.Item>
              </Card>

              <Card title="설정 관리">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text type="secondary">
                    설정을 파일로 내보내거나 가져올 수 있습니다.
                  </Text>
                  
                  <Space wrap>
                    <Button 
                      icon={<ExportOutlined />}
                      onClick={handleExportSettings}
                    >
                      설정 내보내기
                    </Button>
                    
                    <Button 
                      icon={<ImportOutlined />}
                      onClick={handleImportSettings}
                    >
                      설정 가져오기
                    </Button>
                    
                    <Button 
                      icon={<ReloadOutlined />}
                      onClick={handleReset}
                      danger
                    >
                      초기화
                    </Button>
                  </Space>
                </Space>
              </Card>
            </Col>
          </Row>

          <Divider />

          <Space>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={saving || loading}
              size="large"
            >
              설정 저장
            </Button>
            
            <Button 
              onClick={() => form.resetFields()}
              size="large"
            >
              취소
            </Button>
          </Space>
        </Form>
      </div>
    </Content>
  );
};

export default SettingsPage;