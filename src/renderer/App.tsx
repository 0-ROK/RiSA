import React, { Suspense, lazy } from 'react';
import { Layout, Spin } from 'antd';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';

// Route-level code splitting
const MainPage = lazy(() => import('./pages/MainPage'));
const KeyManagerPage = lazy(() => import('./pages/KeyManagerPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const EncodingToolsPage = lazy(() => import('./pages/EncodingToolsPage'));
const ChainBuilderPage = lazy(() => import('./pages/ChainBuilderPage'));
const HttpParserPage = lazy(() => import('./pages/HttpParserPage'));
const UpdateNotification = lazy(() => import('./components/UpdateNotification'));

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Content style={{
          height: '100vh',
          overflow: 'auto',
          backgroundColor: '#f0f2f5'
        }}>
          <Suspense
            fallback={
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/keys" element={<KeyManagerPage />} />
              <Route path="/encoding-tools" element={<EncodingToolsPage />} />
              <Route path="/http-parser" element={<HttpParserPage />} />
              <Route path="/chain-builder" element={<ChainBuilderPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </Suspense>
        </Content>
      </Layout>
      <Suspense fallback={null}>
        <UpdateNotification />
      </Suspense>
    </Layout>
  );
};

export default App;
