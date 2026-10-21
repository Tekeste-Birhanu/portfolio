import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles.css';
const App = lazy(() => import('./App.jsx'));
const AdminApp = lazy(() => import('./admin.jsx'));

function RouteLoading() {
  return (
    <div className="app-route-loading" role="status">
      Loading page…
    </div>
  );
}

const [navigationEntry] = window.performance.getEntriesByType('navigation');
if (navigationEntry?.type === 'reload' && window.location.pathname === '/' && window.location.hash) {
  window.history.scrollRestoration = 'manual';
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
}

const router = createBrowserRouter([
  {
    path: '/admin/*',
    element: (
      <Suspense fallback={<RouteLoading />}>
        <AdminApp />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<RouteLoading />}>
        <App />
      </Suspense>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
