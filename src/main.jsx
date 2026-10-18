import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import { AdminAuthProvider } from './admin/auth-context.jsx';
import './styles.css';

const [navigationEntry] = window.performance.getEntriesByType('navigation');
if (navigationEntry?.type === 'reload' && window.location.pathname === '/' && window.location.hash) {
  window.history.scrollRestoration = 'manual';
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
}

const router = createBrowserRouter([{ path: '*', element: <AdminAuthProvider><App /></AdminAuthProvider> }]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
