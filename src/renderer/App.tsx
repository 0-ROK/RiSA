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
    <Layout style={{ height: '100vh' }}>
      <Sidebar />
      <Layout>
        <Content style={{ 
          margin: 0, 
          padding: 0,
          backgroundColor: settings.theme === 'dark' ? '#141414' : '#ffffff'
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