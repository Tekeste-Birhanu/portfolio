import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from './auth-context.jsx';

function AdminAuthLayout({ title, children }) {
  return <section className="admin-auth-page" aria-labelledby="admin-auth-title">
    <p className="eyebrow">Administrator</p>
    <h1 id="admin-auth-title">{title}</h1>
    {children}
  </section>;
}

export function AdminLoginPage() {
  const { status, issue, signInWithPassword, signInWithGoogle } = useAdminAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(location.state?.message ?? null);
  const [error, setError] = useState(null);

  if (status === 'admin') return <Navigate to="/admin/projects" replace />;
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    const result = await signInWithPassword(email.trim(), password);
    if (result.error) setError('Sign-in failed. Check your details and try again.');
    setBusy(false);
  };
  const googleSignIn = async () => {
    setBusy(true);
    setNotice(null);
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setError('Google sign-in is unavailable right now. Try email and password or try again later.');
      setBusy(false);
    }
  };

  return <AdminAuthLayout title="Sign in">
    <div className="admin-auth-card">
      {(issue || notice) && <p className="auth-notice" role="alert">{issue === 'not_admin' ? 'This account is not authorized for administrator access.' : issue === 'email_unverified' ? 'Verify your email address before signing in.' : notice}</p>}
      {status === 'error' && <p className="auth-notice" role="alert">The authentication service is unavailable. Check the Supabase configuration and try again.</p>}
      {error && <p className="auth-notice" role="alert">{error}</p>}
      <form className="admin-auth-form" onSubmit={submit}>
        <label htmlFor="admin-email">Email</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="admin-password">Password</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="button admin-primary-button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <button className="button button-secondary admin-google-button" type="button" disabled={busy} onClick={googleSignIn}>Continue with Google</button>
      <Link className="admin-forgot-link" to="/admin/reset-password">Forgot password?</Link>
    </div>
  </AdminAuthLayout>;
}

export function PasswordRecoveryPage() {
  const { status, issue, recoverySession, sendPasswordReset, updatePassword, signOut } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const recoveryParams = new URLSearchParams(location.hash.slice(1));
  const hasRecoveryLinkError = recoveryParams.has('error') || recoveryParams.has('error_code');
  const isRecoverySession = recoverySession && status === 'admin' && !hasRecoveryLinkError;

  const sendLink = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await sendPasswordReset(email.trim());
    if (result.error) setError('The reset link could not be sent. Please try again shortly.');
    else setNotice('If an administrator account uses that email, a password reset link will arrive shortly.');
    setBusy(false);
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    if (result.error) {
      setError('The password could not be updated. Request a new reset link and try again.');
      setBusy(false);
      return;
    }
    await signOut();
    navigate('/admin', { replace: true, state: { message: 'Password updated. Sign in with your new password.' } });
  };

  return <AdminAuthLayout title={isRecoverySession ? 'Set a new password' : 'Reset password'}>
    <div className="admin-auth-card">
      {(hasRecoveryLinkError || issue === 'not_admin') && <p className="auth-notice" role="alert">This reset link is invalid or has expired. Request a new link.</p>}
      {status === 'error' && <p className="auth-notice" role="alert">The authentication service is unavailable. Try again shortly.</p>}
      {notice && <p className="auth-success" role="status">{notice}</p>}
      {error && <p className="auth-notice" role="alert">{error}</p>}
      {isRecoverySession ? <form className="admin-auth-form" onSubmit={savePassword}>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <label htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        <button className="button admin-primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form> : <form className="admin-auth-form" onSubmit={sendLink}>
        <label htmlFor="reset-email">Email</label>
        <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <button className="button admin-primary-button" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>}
      <Link className="admin-forgot-link" to="/admin">Back to sign in</Link>
    </div>
  </AdminAuthLayout>;
}

export function AdminCallbackPage() {
  const { status, issue } = useAdminAuth();
  const location = useLocation();
  const callbackError = new URLSearchParams(location.search).has('error');
  if (callbackError || issue === 'not_admin') {
    return <Navigate to="/admin" replace state={{ message: 'This account could not be authorized for administrator access.' }} />;
  }
  if (status === 'admin') return <Navigate to="/admin/projects" replace />;
  if (status === 'signed_out' || status === 'error') {
    return <Navigate to="/admin" replace state={{ message: 'Google sign-in could not be completed. Try again or use email and password.' }} />;
  }
  return <AdminAuthLayout title="Completing sign-in"><p role="status" aria-live="polite">Please wait…</p></AdminAuthLayout>;
}

export function RequireAdmin({ children }) {
  const { status, issue, refresh } = useAdminAuth();
  if (status === 'admin') return children;
  if (status === 'signed_out') return <Navigate to="/admin" replace state={issue === 'not_admin' ? { message: 'This account is not authorized for administrator access.' } : undefined} />;
  if (status === 'error') return <AdminAuthLayout title="Access unavailable"><p role="alert">The administrator session could not be verified.</p><button className="button button-secondary" type="button" onClick={refresh}>Try again</button></AdminAuthLayout>;
  return <AdminAuthLayout title="Checking access"><p role="status" aria-live="polite">Please wait…</p></AdminAuthLayout>;
}

export function AdminReadyPage() {
  const { signOut } = useAdminAuth();
  return <AdminAuthLayout title="Administrator access ready">
    <p className="page-intro">The account is authorized. Admin tools will appear here as they are implemented.</p>
    <button className="button button-secondary" type="button" onClick={() => signOut()}>Sign out</button>
  </AdminAuthLayout>;
}
