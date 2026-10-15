import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { I18nProvider } from './utils/i18n';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import { reportClientError } from './utils/clientLog';

window.addEventListener('error', (event) => reportClientError('error', event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => reportClientError('rejection', event.reason));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
