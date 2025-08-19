import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { 
  LockOutlined, 
  KeyOutlined,
  HomeOutlined 
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;
const { Title } = Typography;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '암호화/복호화',
    },
    {
      key: '/keys',
      icon: <KeyOutlined />,
      label: '키 관리',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider
      width={250}
      style={{
        background: '#001529',
        height: '100vh',
      }}
    >
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #303030',
        textAlign: 'center'
      }}>
        <LockOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: 8 }} />
        <Title 
          level={4} 
          style={{ 
            color: 'white', 
            margin: 0, 
            display: 'inline-block' 
          }}
        >
          RiSA
        </Title>
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ 
          borderRight: 0,
          paddingTop: '16px'
        }}
      />
    </Sider>
  );
};

export default Sidebar;