import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './sionUiPatches';
import App from './App';
import { initializeMemoryReminderEngine } from './services/memoryReminder';

initializeMemoryReminderEngine();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
