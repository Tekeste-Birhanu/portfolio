import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { AdminAuthProvider } from "./admin/auth-context.jsx";
import {
  AdminCallbackPage,
  AdminLoginPage,
  AdminReadyPage,
  PasswordRecoveryPage,
  RequireAdmin,
} from "./admin/auth-pages.jsx";
import {
  AdminProjectEditor,
  AdminProjectsPage,
} from "./admin/projects-page.jsx";
import { AdminProfilePage } from "./admin/profile-page.jsx";
import {
  AdminMailboxPage,
  AdminMessageDetailPage,
} from "./admin/mailbox-page.jsx";
import "./admin.css";

function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminLoginPage />} />
      <Route path="callback" element={<AdminCallbackPage />} />
      <Route path="reset-password" element={<PasswordRecoveryPage />} />
      <Route
        path="projects"
        element={
          <RequireAdmin>
            <AdminProjectsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="projects/new"
        element={
          <RequireAdmin>
            <AdminProjectEditor isNew />
          </RequireAdmin>
        }
      />
      <Route
        path="projects/:projectId"
        element={
          <RequireAdmin>
            <AdminProjectEditor />
          </RequireAdmin>
        }
      />
      <Route
        path="profile"
        element={
          <RequireAdmin>
            <AdminProfilePage />
          </RequireAdmin>
        }
      />
      <Route
        path="mailbox"
        element={
          <RequireAdmin>
            <AdminMailboxPage />
          </RequireAdmin>
        }
      />
      <Route
        path="mailbox/:messageId"
        element={
          <RequireAdmin>
            <AdminMessageDetailPage />
          </RequireAdmin>
        }
      />
      <Route
        path="*"
        element={
          <RequireAdmin>
            <AdminReadyPage />
          </RequireAdmin>
        }
      />
    </Routes>
  );
}

export default function AdminApp() {
  useEffect(() => {
    const root = document.documentElement;
    let hideTimeout = 0;
    const showScrollbar = () => {
      root.classList.add("scrollbar-visible");
      window.clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(
        () => root.classList.remove("scrollbar-visible"),
        900,
      );
    };

    window.addEventListener("scroll", showScrollbar, { passive: true });
    return () => {
      window.removeEventListener("scroll", showScrollbar);
      window.clearTimeout(hideTimeout);
      root.classList.remove("scrollbar-visible");
    };
  }, []);

  return (
    <AdminAuthProvider>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <main
        className="main-content admin-main-content"
        id="main-content"
        tabIndex="-1"
      >
        <AdminRoutes />
      </main>
    </AdminAuthProvider>
  );
}
