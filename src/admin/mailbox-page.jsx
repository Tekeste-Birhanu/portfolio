import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from './projects-page.jsx';
import { deleteVisitorMessage, getMailboxData, getVisitorMessage, saveContactMethods, validateContactMethods } from '../lib/mailbox-admin.js';
import { CONTACT_METHOD_ICONS } from '../lib/contact-methods.js';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : dateFormatter.format(date);
}

function notificationLabel(status) {
  return status === 'sent' ? 'Notification sent' : status === 'failed' ? 'Notification failed' : 'Notification pending';
}

export function AdminMailboxPage() {
  const [messages, setMessages] = useState([]);
  const [methods, setMethods] = useState([]);
  const [savedMethods, setSavedMethods] = useState([]);
  const [errors, setErrors] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [savingMethods, setSavingMethods] = useState(false);
  const [busyMessageId, setBusyMessageId] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [draggedId, setDraggedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    setError('');
    try {
      const data = await getMailboxData();
      setMessages(data.messages);
      setMethods(data.contactMethods);
      setSavedMethods(data.contactMethods);
    } catch (loadError) {
      setLoadFailed(true);
      setError(loadError.message || 'Mailbox data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, attempt]);

  const methodsChanged = JSON.stringify(methods) !== JSON.stringify(savedMethods);
  const dirtyValidation = useMemo(() => validateContactMethods(methods), [methods]);

  const updateMethod = (id, updates) => {
    setMethods((current) => current.map((method) => method.id === id ? { ...method, ...updates } : method));
    setErrors(new Map());
    setNotice('');
    setError('');
  };

  const addMethod = () => {
    const id = crypto.randomUUID();
    setMethods((current) => [...current, {
      id,
      label: '',
      method_type: 'link',
      icon_key: 'website',
      value: '',
      is_enabled: true,
      sort_order: current.length,
    }]);
    setNotice('');
    setError('');
  };

  const removeMethod = (method) => {
    const saved = savedMethods.some((savedMethod) => savedMethod.id === method.id);
    if (saved && !window.confirm(`Remove the “${method.label || 'untitled'}” contact method?`)) return;
    setMethods((current) => current.filter((item) => item.id !== method.id).map((item, index) => ({ ...item, sort_order: index })));
    setNotice('');
    setError('');
  };

  const reorderMethods = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setMethods((current) => {
      const next = [...current];
      const fromIndex = next.findIndex((method) => method.id === fromId);
      const toIndex = next.findIndex((method) => method.id === toId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((method, index) => ({ ...method, sort_order: index }));
    });
    setNotice('');
  };

  const moveMethodByKey = (methodId, direction) => {
    const index = methods.findIndex((method) => method.id === methodId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= methods.length) return;
    reorderMethods(methodId, methods[targetIndex].id);
    setNotice(`Draft order changed: ${methods[index].label || 'Contact method'} is at position ${targetIndex + 1} of ${methods.length}. Save contact methods to apply it.`);
  };

  const handleSaveMethods = async (event) => {
    event.preventDefault();
    const validationErrors = validateContactMethods(methods);
    setErrors(validationErrors);
    setError('');
    setNotice('');
    if (validationErrors.size) {
      document.getElementById(`${validationErrors.keys().next().value}`)?.focus();
      return;
    }
    setSavingMethods(true);
    try {
      const saved = await saveContactMethods(methods);
      setMethods(saved);
      setSavedMethods(saved);
      setNotice('Contact methods saved.');
    } catch (saveError) {
      setError(saveError.message || 'Contact methods could not be saved.');
    } finally {
      setSavingMethods(false);
    }
  };

  const handleDelete = async (message) => {
    if (!window.confirm(`Permanently delete the message from ${message.visitor_email}? This cannot be undone.`)) return;
    setBusyMessageId(message.id);
    setError('');
    setNotice('');
    try {
      await deleteVisitorMessage(message.id);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setNotice('Message deleted.');
    } catch (deleteError) {
      setError(deleteError.message || 'The message could not be deleted.');
    } finally {
      setBusyMessageId(null);
    }
  };

  return <AdminLayout title="Mailbox" activeSection="mailbox">
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="auth-success" role="status">{notice}</p>}
    {loading ? <p role="status">Loading Mailbox…</p> : loadFailed ? <button className="button button-secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button> : <div className="admin-mailbox-page">
      <section className="admin-profile-section" aria-labelledby="mailbox-messages-title">
        <div className="admin-mailbox-section-heading">
          <h2 id="mailbox-messages-title">Messages</h2>
          <span>{messages.filter((message) => !message.is_read).length} unread</span>
        </div>
        {messages.length === 0 ? <p className="empty-state">No messages.</p> : <ul className="admin-message-list">
          {messages.map((message) => <li className={`admin-message-row${message.is_read ? '' : ' is-unread'}`} key={message.id}>
            <Link className="admin-message-open" to={`/admin/mailbox/${message.id}`}>
              <span className="admin-message-row-heading"><strong>{message.visitor_email}</strong><time dateTime={message.created_at}>{formatDate(message.created_at)}</time></span>
              <span className="admin-message-preview">{message.message_body}</span>
              <span className={`admin-message-notification${message.notification_status === 'failed' ? ' is-failed' : ''}`}>{notificationLabel(message.notification_status)}</span>
            </Link>
            <div className="admin-message-actions">
              <button className="button button-danger" type="button" disabled={busyMessageId === message.id} onClick={() => void handleDelete(message)}>Delete</button>
            </div>
          </li>)}
        </ul>}
      </section>

      <section className="admin-profile-section" aria-labelledby="mailbox-contact-methods-title">
        <h2 id="mailbox-contact-methods-title">Contact methods</h2>
        <form onSubmit={handleSaveMethods} noValidate>
          {methods.length === 0 ? <p className="admin-error" role="alert">The required Email contact method could not be found. Reload or contact support.</p> : <>
          <p className="admin-list-help" id="contact-method-order-help">Drag to reorder contact methods, or focus a handle and press the up or down arrow key.</p>
          <ul className="admin-contact-method-list" aria-describedby="contact-method-order-help">
            {methods.map((method) => <li
              className={`admin-contact-method${draggedId === method.id ? ' is-dragging' : ''}`}
              key={method.id}
              data-method-id={method.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); reorderMethods(draggedId, method.id); setDraggedId(null); }}
            >
              <button className="admin-drag-handle" type="button" draggable="true" aria-label={`Reorder ${method.label || 'contact method'}, position ${methods.indexOf(method) + 1} of ${methods.length}. Use the up or down arrow key to move.`} aria-keyshortcuts="ArrowUp ArrowDown" title="Drag to reorder, or use the arrow keys" onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDraggedId(method.id); }} onDragEnd={() => setDraggedId(null)} onKeyDown={(event) => {
                if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                event.preventDefault();
                moveMethodByKey(method.id, event.key === 'ArrowUp' ? -1 : 1);
              }}>⠿</button>
              <div className="admin-contact-method-fields">
                <label>
                  <span>Label</span>
                  <input id={`${method.id}-label`} value={method.label} onChange={(event) => updateMethod(method.id, { label: event.target.value })} aria-invalid={errors.has(`${method.id}-label`)} aria-describedby={errors.has(`${method.id}-label`) ? `${method.id}-label-error` : undefined} />
                  {errors.has(`${method.id}-label`) && <span id={`${method.id}-label-error`} className="admin-field-error">{errors.get(`${method.id}-label`)}</span>}
                </label>
                <label>
                  <span>Icon</span>
                  {method.method_type === 'email'
                    ? <input value="Email" readOnly aria-label="Email icon" />
                    : <select id={`${method.id}-icon`} value={method.icon_key ?? 'website'} aria-invalid={errors.has(`${method.id}-icon`)} aria-describedby={errors.has(`${method.id}-icon`) ? `${method.id}-icon-error` : undefined} onChange={(event) => updateMethod(method.id, { icon_key: event.target.value })}>
                      {CONTACT_METHOD_ICONS.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
                    </select>}
                  {errors.has(`${method.id}-icon`) && <span id={`${method.id}-icon-error`} className="admin-field-error">{errors.get(`${method.id}-icon`)}</span>}
                </label>
                <label className="is-wide">
                  <span>{method.method_type === 'email' ? 'Email address' : method.icon_key === 'phone' ? 'Phone number' : 'Link address'}</span>
                  <input id={`${method.id}-value`} type={method.method_type === 'email' ? 'email' : method.icon_key === 'phone' ? 'tel' : 'url'} value={method.value} placeholder={method.method_type === 'email' ? 'you@example.com' : method.icon_key === 'phone' ? '+1 555 123 4567' : 'https://…'} onChange={(event) => updateMethod(method.id, { value: event.target.value })} aria-invalid={errors.has(`${method.id}-value`)} aria-describedby={errors.has(`${method.id}-value`) ? `${method.id}-value-error` : undefined} />
                  {errors.has(`${method.id}-value`) && <span id={`${method.id}-value-error`} className="admin-field-error">{errors.get(`${method.id}-value`)}</span>}
                </label>
              </div>
              <div className="admin-contact-method-controls">
                <label className="admin-contact-enabled"><input type="checkbox" checked={method.is_enabled} disabled={method.method_type === 'email'} onChange={(event) => updateMethod(method.id, { is_enabled: event.target.checked })} /> Enabled</label>
                {method.method_type === 'link' && <button className="button button-danger" type="button" onClick={() => removeMethod(method)}>Remove</button>}
              </div>
            </li>)}
          </ul>
          </>}
          {errors.get('email-method') && <p className="admin-field-error" role="alert">{errors.get('email-method')}</p>}
          <div className="admin-contact-method-actions">
            <button className="button button-secondary" type="button" onClick={addMethod}>Add contact method</button>
            <button className="button admin-primary-button" type="submit" disabled={savingMethods || !methodsChanged || dirtyValidation.size > 0}>{savingMethods ? 'Saving…' : 'Save contact methods'}</button>
          </div>
        </form>
      </section>
    </div>}
  </AdminLayout>;
}

export function AdminMessageDetailPage() {
  const { messageId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setMissing(false);
    try {
      const item = await getVisitorMessage(messageId);
      setMessage(item);
      setMissing(!item);
    } catch (loadError) {
      setError(loadError.message || 'The message could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async () => {
    if (!message || !window.confirm(`Permanently delete the message from ${message.visitor_email}? This cannot be undone.`)) return;
    setBusy(true);
    setError('');
    try {
      await deleteVisitorMessage(message.id);
      navigate('/admin/mailbox', { replace: true });
    } catch (deleteError) {
      setError(deleteError.message || 'The message could not be deleted.');
      setBusy(false);
    }
  };

  return <AdminLayout title="Message" activeSection="mailbox">
    <Link className="admin-editor-back" to="/admin/mailbox">← Mailbox</Link>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading message…</p> : missing ? <p className="empty-state">This message is no longer available.</p> : error ? <button className="button button-secondary" type="button" onClick={() => void load()}>Retry</button> : message && <article className="admin-profile-section admin-message-detail">
      <header><div className="admin-message-detail-meta"><a href={`mailto:${message.visitor_email}`}>{message.visitor_email}</a><time dateTime={message.created_at}>{formatDate(message.created_at)}</time></div><button className="button button-danger" type="button" disabled={busy} onClick={() => void handleDelete()}>Delete message</button></header>
      <p className="admin-message-notification is-detail">{notificationLabel(message.notification_status)}</p>
      {message.notification_status === 'failed' && <p className="admin-message-warning" role="status">The message was saved, but its email notification failed.</p>}
      <p className="admin-message-body">{message.message_body}</p>
    </article>}
  </AdminLayout>;
}
