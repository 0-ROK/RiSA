import React from 'react';
import { Layout } from 'antd';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainPage from './pages/MainPage';
import SettingsPage from './pages/SettingsPage';
import KeyManagerPage from './pages/KeyManagerPage';
import { useSettings } from './store/SettingsContext';

const { Content } = Layout;

const App: React.FC = () => {
  const { settings } = useSettings();

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Content style={{ 
          height: '100vh',
          overflow: 'auto',
          backgroundColor: settings.theme === 'dark' ? '#141414' : '#f0f2f5'
        }}>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/keys" element={<KeyManagerPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;