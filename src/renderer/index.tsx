import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App';
import { KeyProvider } from './store/KeyContext';
import { HistoryProvider } from './store/HistoryContext';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <KeyProvider>
        <HistoryProvider>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#1890ff',
              },
            }}
          >
            <App />
          </ConfigProvider>
        </HistoryProvider>
      </KeyProvider>
    </HashRouter>
  </React.StrictMode>
);