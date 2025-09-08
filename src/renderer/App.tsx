import React from 'react';
import { Layout } from 'antd';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainPage from './pages/MainPage';
import KeyManagerPage from './pages/KeyManagerPage';
import HistoryPage from './pages/HistoryPage';
import URLToolsPage from './pages/URLToolsPage';
import ChainBuilderPage from './pages/ChainBuilderPage';
import UpdateNotification from './components/UpdateNotification';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Content style={{
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#f0f2f5',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            WebkitAppRegion: 'drag',
            height: '100px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #f0f0f0',
            flexShrink: 0
          }}>
            {/* 헤더 영역은 각 페이지에서 PageHeader 컴포넌트로 처리 */}
          </div>
          <div style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative'
          }}>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/keys" element={<KeyManagerPage />} />
              <Route path="/url-tools" element={<URLToolsPage />} />
              <Route path="/chain-builder" element={<ChainBuilderPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
      <UpdateNotification />
    </Layout>
  );
};

export default App;