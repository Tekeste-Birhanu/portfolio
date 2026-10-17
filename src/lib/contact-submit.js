import { supabase } from './supabase.js';

export async function submitContactMessage(visitorEmail, message) {
  if (!supabase) throw new Error('The contact form is unavailable until Supabase is configured.');
  const { data, error } = await supabase.functions.invoke('submit-contact', {
    body: { visitorEmail, message },
  });
  if (error || data?.success !== true) {
    throw new Error('Your message could not be sent. Please try again.');
  }
}
