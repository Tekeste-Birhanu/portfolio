import { invalidatePublicPortfolioCache } from './public-content.js';
import { supabase } from './supabase.js';
import { CONTACT_METHOD_ICONS } from './contact-methods.js';

function db() {
  if (!supabase) throw new Error('Supabase is not configured. Check the local environment settings.');
  return supabase;
}

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

export async function getMailboxData() {
  const client = db();
  const [methodsResult, messagesResult] = await Promise.all([
    client.from('contact_methods').select('id, label, method_type, icon_key, value, is_enabled, sort_order').order('sort_order', { ascending: true }),
    client.from('visitor_messages').select('id, visitor_email, message_body, created_at, is_read, notification_status, notification_attempted_at').order('created_at', { ascending: false }),
  ]);
  return {
    contactMethods: unwrap(methodsResult) ?? [],
    messages: unwrap(messagesResult) ?? [],
  };
}

export async function saveContactMethods(methods) {
  const client = db();
  const saved = unwrap(await client.rpc('save_admin_contact_methods', {
    p_methods: methods.map((method, sortOrder) => ({
      id: method.id,
      label: method.label.trim(),
      method_type: method.method_type,
      icon_key: method.method_type === 'email' ? 'email' : method.icon_key,
      value: method.value.trim(),
      is_enabled: method.method_type === 'email' || method.is_enabled,
      sort_order: sortOrder,
    })),
  }));
  invalidatePublicPortfolioCache();
  return saved ?? [];
}

export async function getVisitorMessage(messageId) {
  const client = db();
  const message = unwrap(await client.from('visitor_messages')
    .select('id, visitor_email, message_body, created_at, is_read, notification_status, notification_attempted_at')
    .eq('id', messageId)
    .maybeSingle());
  if (!message) return null;
  if (!message.is_read) {
    unwrap(await client.from('visitor_messages').update({ is_read: true }).eq('id', messageId));
    return { ...message, is_read: true };
  }
  return message;
}

export async function deleteVisitorMessage(messageId) {
  const client = db();
  unwrap(await client.from('visitor_messages').delete().eq('id', messageId));
}

export function validateContactMethods(methods) {
  const errors = new Map();
  let emailCount = 0;
  methods.forEach((method) => {
    if (!method.label.trim()) errors.set(`${method.id}-label`, 'Enter a label.');
    if (method.method_type === 'email') {
      emailCount += 1;
      if (method.icon_key && method.icon_key !== 'email') errors.set(`${method.id}-icon`, 'Email uses the Email icon.');
      if (method.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(method.value.trim())) {
        errors.set(`${method.id}-value`, 'Enter a valid email address.');
      }
    } else {
      if (!CONTACT_METHOD_ICONS.some((icon) => icon.value === method.icon_key)) {
        errors.set(`${method.id}-icon`, 'Choose an icon.');
      }
      if (method.icon_key === 'phone') {
        const phone = method.value.trim();
        const digitCount = phone.replace(/\D/g, '').length;
        if (!/^\+?[0-9][0-9 ()-]{5,24}$/.test(phone) || digitCount < 7 || digitCount > 15) {
          errors.set(`${method.id}-value`, 'Enter a phone number with 7 to 15 digits.');
        }
      } else {
        try {
          const url = new URL(method.value.trim());
          if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
        } catch {
          errors.set(`${method.id}-value`, 'Enter a complete HTTP or HTTPS link.');
        }
      }
    }
  });
  if (emailCount !== 1) errors.set('email-method', 'Exactly one Email contact method is required.');
  return errors;
}
