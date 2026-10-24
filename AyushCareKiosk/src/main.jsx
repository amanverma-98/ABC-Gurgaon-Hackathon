import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { KeyboardProvider } from './context/KeyboardContext';
import OnscreenKeyboard from './components/common/OnscreenKeyboard';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KeyboardProvider>
      <App />
      <OnscreenKeyboard />
    </KeyboardProvider>
  </StrictMode>,
);
