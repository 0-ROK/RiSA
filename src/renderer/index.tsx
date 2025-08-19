import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App';
import { KeyProvider } from './store/KeyContext';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <KeyProvider>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#1890ff',
            },
          }}
        >
          <App />
        </ConfigProvider>
      </KeyProvider>
    </HashRouter>
  </React.StrictMode>
);