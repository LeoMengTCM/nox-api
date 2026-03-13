import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './contexts/user-context';
import { StatusProvider } from './contexts/status-context';
import { ThemeProvider } from './contexts/theme-context';
import { Toaster, TooltipProvider } from './components/ui';
import App from './App';
import './styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <StatusProvider>
    <UserProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
            <App />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </UserProvider>
  </StatusProvider>,
);
