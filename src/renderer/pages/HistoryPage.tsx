import React, { useState } from 'react';
import {
    Card,
    Table,
    Space,
    Typography,
    Button,
    Tag,
    Modal,
    Input,
    Select,
    DatePicker,
    Form,
    Popconfirm,
    Tooltip,
    Alert,
    notification,
    message
} from 'antd';
import {
    HistoryOutlined,
    EyeOutlined,
    CopyOutlined,
    DeleteOutlined,
    ClearOutlined,
    FilterOutlined,
    CheckOutlined,
    CloseCircleOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { useHistory } from '../store/HistoryContext';
import { useKeys } from '../store/KeyContext';
import { HistoryItem, HistoryFilter } from '../../shared/types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const HistoryPage: React.FC = () => {
    const { history, loading, deleteHistoryItem, clearHistory, filter, setFilter } = useHistory();
    const { keys } = useKeys();
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
    const [form] = Form.useForm();

    const handleViewItem = (item: HistoryItem) => {
        setSelectedHistoryItem(item);
        setViewModalVisible(true);
    };

    const handleCopyText = async (text: string, type: 'input' | 'output') => {
        try {
            await navigator.clipboard.writeText(text);

            const size = text.length;
            const sizeText = size > 1000 ? `${Math.round(size / 1000)}KB` : `${size}자`;
            const typeName = type === 'input' ? '입력 텍스트' : '출력 텍스트';

            notification.success({
                message: `${typeName} 복사됨`,
                description: `${sizeText}의 ${typeName}가 클립보드에 복사되었습니다.`,
                icon: <CheckOutlined style={{ color: '#52c41a' }} />,
                placement: 'topRight',
                duration: 3,
            });
        } catch (error) {
            notification.error({
                message: '복사 실패',
                description: '클립보드에 복사하는 중 오류가 발생했습니다.',
                icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
                placement: 'topRight',
                duration: 4,
            });
        }
    };

    const handleDeleteItem = async (item: HistoryItem) => {
        try {
            await deleteHistoryItem(item.id);
            message.success('히스토리 항목이 삭제되었습니다.');
        } catch (error) {
            message.error('히스토리 항목 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleClearAllHistory = async () => {
        try {
            await clearHistory();
            message.success('모든 히스토리가 삭제되었습니다.');
        } catch (error) {
            message.error('히스토리 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleApplyFilter = (values: any) => {
        const newFilter: HistoryFilter = {};

        if (values.type) newFilter.type = values.type;
        if (values.keyId) newFilter.keyId = values.keyId;
        if (values.algorithm) newFilter.algorithm = values.algorithm;
        if (values.success !== undefined) newFilter.success = values.success;
        if (values.dateRange && values.dateRange.length === 2) {
            newFilter.dateFrom = values.dateRange[0].toDate();
            newFilter.dateTo = values.dateRange[1].toDate();
        }

        setFilter(Object.keys(newFilter).length > 0 ? newFilter : null);
        setFilterModalVisible(false);
        message.success('필터가 적용되었습니다.');
    };

    const handleClearFilter = () => {
        setFilter(null);
        form.resetFields();
        message.success('필터가 해제되었습니다.');
    };

    const getKeyName = (keyId: string) => {
        const key = keys.find(k => k.id === keyId);
        return key ? key.name : '(삭제된 키)';
    };

    const columns = [
        {
            title: '시간',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 160,
            render: (timestamp: Date) => (
                <Text style={{ fontSize: '12px' }}>
                    {new Date(timestamp).toLocaleString('ko-KR')}
                </Text>
            ),
            sorter: (a: HistoryItem, b: HistoryItem) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            defaultSortOrder: 'descend' as const,
        },
        {
            title: '유형',
            dataIndex: 'type',
            key: 'type',
            width: 80,
            render: (type: 'encrypt' | 'decrypt' | 'url-encode' | 'url-decode' | 'chain') => {
                const tagInfo = {
                    'encrypt': { color: 'blue', text: '암호화' },
                    'decrypt': { color: 'green', text: '복호화' },
                    'url-encode': { color: 'purple', text: 'URL 인코딩' },
                    'url-decode': { color: 'orange', text: 'URL 디코딩' },
                    'chain': { color: 'gold', text: '체인 실행' }
                };
                return (
                    <Tag color={tagInfo[type].color}>
                        {tagInfo[type].text}
                    </Tag>
                );
            },
        },
        {
            title: '키',
            dataIndex: 'keyName',
            key: 'keyName',
            width: 150,
            render: (keyName: string, record: HistoryItem) => {
                // URL 작업이나 체인 작업의 경우
                if (record.type === 'url-encode' || record.type === 'url-decode' || record.type === 'chain') {
                    if (record.type === 'chain') {
                        return (
                            <div>
                                <Text strong style={{ fontSize: '13px' }}>
                                    {record.chainName || 'Unknown Chain'}
                                </Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                    {record.chainSteps || 0}개 스텝, {record.chainDuration || 0}ms
                                </Text>
                            </div>
                        );
                    }
                    return (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            N/A
                        </Text>
                    );
                }
                return (
                    <div>
                        <Text strong style={{ fontSize: '13px' }}>{keyName}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                            {record.keySize} bits, {record.algorithm}
                        </Text>
                    </div>
                );
            },
        },
        {
            title: '상태',
            dataIndex: 'success',
            key: 'success',
            width: 80,
            render: (success: boolean) => (
                <Tag color={success ? 'success' : 'error'}>
                    {success ? '성공' : '실패'}
                </Tag>
            ),
        },
        {
            title: '입력 텍스트 (미리보기)',
            dataIndex: 'inputText',
            key: 'inputText',
            ellipsis: true,
            render: (inputText: string) => (
                <Text
                    ellipsis={{ tooltip: true }}
                    style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        maxWidth: '200px'
                    }}
                >
                    {inputText.substring(0, 50)}...
                </Text>
            ),
        },
        {
            title: '작업',
            key: 'actions',
            width: 120,
            render: (_: any, record: HistoryItem) => (
                <Space size="small">
                    <Tooltip title="상세 보기">
                        <Button
                            icon={<EyeOutlined />}
                            size="small"
                            onClick={() => handleViewItem(record)}
                        />
                    </Tooltip>

                    <Tooltip title="입력 복사">
                        <Button
                            icon={<CopyOutlined />}
                            size="small"
                            onClick={() => handleCopyText(record.inputText, 'input')}
                        />
                    </Tooltip>

                    <Tooltip title="삭제">
                        <Popconfirm
                            title="이 히스토리 항목을 삭제하시겠습니까?"
                            description="삭제된 히스토리는 복구할 수 없습니다."
                            onConfirm={() => handleDeleteItem(record)}
                            okText="삭제"
                            cancelText="취소"
                        >
                            <Button
                                icon={<DeleteOutlined />}
                                size="small"
                                danger
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px', minHeight: '100%' }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24
                }}>
                    <Title level={2}>
                        <HistoryOutlined style={{ marginRight: 8 }} />
                        암호화/복호화 히스토리
                    </Title>

                    <Space>
                        <Button
                            icon={<FilterOutlined />}
                            onClick={() => setFilterModalVisible(true)}
                        >
                            필터
                        </Button>
                        {filter && (
                            <Button
                                onClick={handleClearFilter}
                            >
                                필터 해제
                            </Button>
                        )}
                        <Popconfirm
                            title="모든 히스토리를 삭제하시겠습니까?"
                            description="삭제된 히스토리는 복구할 수 없습니다."
                            onConfirm={handleClearAllHistory}
                            okText="삭제"
                            cancelText="취소"
                        >
                            <Button
                                icon={<ClearOutlined />}
                                danger
                                disabled={history.length === 0}
                            >
                                전체 삭제
                            </Button>
                        </Popconfirm>
                    </Space>
                </div>

                {filter && (
                    <Alert
                        message="필터가 적용된 상태입니다"
                        description={
                            <div>
                                {filter.type && (
                                    <Tag>유형: {
                                        filter.type === 'encrypt' ? '암호화' :
                                        filter.type === 'decrypt' ? '복호화' :
                                        filter.type === 'url-encode' ? 'URL 인코딩' :
                                        filter.type === 'url-decode' ? 'URL 디코딩' :
                                        '체인 실행'
                                    }</Tag>
                                )}
                                {filter.algorithm && <Tag>알고리즘: {filter.algorithm}</Tag>}
                                {filter.success !== undefined && <Tag>상태: {filter.success ? '성공' : '실패'}</Tag>}
                                {filter.keyId && <Tag>키: {getKeyName(filter.keyId)}</Tag>}
                                {filter.dateFrom && filter.dateTo && (
                                    <Tag>
                                        기간: {dayjs(filter.dateFrom).format('YYYY-MM-DD')} ~ {dayjs(filter.dateTo).format('YYYY-MM-DD')}
                                    </Tag>
                                )}
                            </div>
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Card>
                    <Table
                        columns={columns}
                        dataSource={history}
                        rowKey={(record) => record.id}
                        loading={loading}
                        pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}개`,
                        }}
                        locale={{
                            emptyText: '히스토리가 없습니다. 암호화/복호화 또는 URL 인코딩/디코딩을 실행하면 히스토리가 기록됩니다.',
                        }}
                        scroll={{ x: 1000 }}
                    />
                </Card>

                {/* 상세 보기 모달 */}
                <Modal
                    title={`히스토리 상세 - ${
                        selectedHistoryItem?.type === 'encrypt' ? '암호화' :
                        selectedHistoryItem?.type === 'decrypt' ? '복호화' :
                        selectedHistoryItem?.type === 'url-encode' ? 'URL 인코딩' :
                        selectedHistoryItem?.type === 'url-decode' ? 'URL 디코딩' :
                        '체인 실행'
                    }`}
                    open={viewModalVisible}
                    onCancel={() => {
                        setViewModalVisible(false);
                        setSelectedHistoryItem(null);
                    }}
                    width={800}
                    style={{ top: 20 }}
                    bodyStyle={{
                        maxHeight: 'calc(100vh - 200px)',
                        overflowY: 'auto',
                        padding: '24px'
                    }}
                    footer={[
                        <Button key="close" onClick={() => setViewModalVisible(false)}>
                            닫기
                        </Button>
                    ]}
                >
                    {selectedHistoryItem && (
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            <div style={{
                                padding: '12px',
                                backgroundColor: '#f0f2f5',
                                borderRadius: '4px',
                                marginBottom: '16px'
                            }}>
                                <Space direction="vertical" size="small">
                                    <Text><strong>시간:</strong> {new Date(selectedHistoryItem.timestamp).toLocaleString('ko-KR')}</Text>
                                    {selectedHistoryItem.type === 'chain' ? (
                                        <>
                                            <Text><strong>체인명:</strong> {selectedHistoryItem.chainName || 'Unknown'}</Text>
                                            <Text><strong>스텝 수:</strong> {selectedHistoryItem.chainSteps || 0}개</Text>
                                            <Text><strong>실행 시간:</strong> {selectedHistoryItem.chainDuration || 0}ms</Text>
                                        </>
                                    ) : (selectedHistoryItem.type === 'encrypt' || selectedHistoryItem.type === 'decrypt') && (
                                        <>
                                            <Text><strong>키:</strong> {selectedHistoryItem.keyName}</Text>
                                            <Text><strong>키 크기:</strong> {selectedHistoryItem.keySize} bits</Text>
                                            <Text><strong>알고리즘:</strong> {selectedHistoryItem.algorithm}</Text>
                                        </>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text><strong>상태:</strong></Text>
                                        <Tag color={selectedHistoryItem.success ? 'success' : 'error'}>
                                            {selectedHistoryItem.success ? '성공' : '실패'}
                                        </Tag>
                                    </div>
                                    {!selectedHistoryItem.success && selectedHistoryItem.errorMessage && (
                                        <Text type="danger"><strong>오류:</strong> {selectedHistoryItem.errorMessage}</Text>
                                    )}
                                </Space>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text strong>입력 텍스트</Text>
                                    <Button
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={() => handleCopyText(selectedHistoryItem.inputText, 'input')}
                                    >
                                        복사
                                    </Button>
                                </div>
                                <TextArea
                                    value={selectedHistoryItem.inputText}
                                    readOnly
                                    rows={6}
                                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                />
                            </div>

                            {selectedHistoryItem.success && selectedHistoryItem.outputText && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text strong>
                                            {selectedHistoryItem.type === 'encrypt' ? '암호화 결과' : '복호화 결과'}
                                        </Text>
                                        <Button
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() => handleCopyText(selectedHistoryItem.outputText, 'output')}
                                        >
                                            복사
                                        </Button>
                                    </div>
                                    <TextArea
                                        value={selectedHistoryItem.outputText}
                                        readOnly
                                        rows={selectedHistoryItem.type === 'encrypt' ? 8 : 6}
                                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                    />
                                </div>
                            )}
                        </Space>
                    )}
                </Modal>

                {/* 필터 모달 */}
                <Modal
                    title="히스토리 필터"
                    open={filterModalVisible}
                    onCancel={() => {
                        setFilterModalVisible(false);
                        form.resetFields();
                    }}
                    footer={null}
                    width={500}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleApplyFilter}
                        initialValues={{
                            type: filter?.type,
                            keyId: filter?.keyId,
                            algorithm: filter?.algorithm,
                            success: filter?.success,
                            dateRange: filter?.dateFrom && filter?.dateTo ? [
                                dayjs(filter.dateFrom),
                                dayjs(filter.dateTo)
                            ] : null,
                        }}
                    >
                        <Form.Item
                            label="유형"
                            name="type"
                        >
                            <Select placeholder="모든 유형" allowClear>
                                <Select.Option value="encrypt">암호화</Select.Option>
                                <Select.Option value="decrypt">복호화</Select.Option>
                                <Select.Option value="url-encode">URL 인코딩</Select.Option>
                                <Select.Option value="url-decode">URL 디코딩</Select.Option>
                                <Select.Option value="chain">체인 실행</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="키"
                            name="keyId"
                        >
                            <Select placeholder="모든 키" allowClear showSearch>
                                {keys.map(key => (
                                    <Select.Option key={key.id} value={key.id}>
                                        {key.name} ({key.keySize} bits)
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="알고리즘"
                            name="algorithm"
                        >
                            <Select placeholder="모든 알고리즘" allowClear>
                                <Select.Option value="RSA-OAEP">RSA-OAEP</Select.Option>
                                <Select.Option value="RSA-PKCS1">RSA-PKCS1</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="상태"
                            name="success"
                        >
                            <Select placeholder="모든 상태" allowClear>
                                <Select.Option value={true}>성공</Select.Option>
                                <Select.Option value={false}>실패</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="기간"
                            name="dateRange"
                        >
                            <RangePicker
                                style={{ width: '100%' }}
                                placeholder={['시작일', '종료일']}
                            />
                        </Form.Item>

                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => setFilterModalVisible(false)}>
                                취소
                            </Button>
                            <Button onClick={() => form.resetFields()}>
                                초기화
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SearchOutlined />}
                            >
                                적용
                            </Button>
                        </Space>
                    </Form>
                </Modal>
            </div>
        </div>
    );
};

export default HistoryPage;
