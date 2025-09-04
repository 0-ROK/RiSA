import React from 'react';
import { Layout } from 'antd';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainPage from './pages/MainPage';
import KeyManagerPage from './pages/KeyManagerPage';
import HistoryPage from './pages/HistoryPage';
import UpdateNotification from './components/UpdateNotification';

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
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/keys" element={<KeyManagerPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </Content>
      </Layout>
      <UpdateNotification />
    </Layout>
  );
};

export default App;