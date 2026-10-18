import { readBoundedJson, validateContactInput } from './validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function updateNotificationStatus(
  supabaseUrl: string,
  serviceKey: string,
  messageId: string,
  status: 'sent' | 'failed',
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/visitor_messages?id=eq.${encodeURIComponent(messageId)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      notification_status: status,
      notification_attempted_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Notification status update failed (${response.status}).`);
}

async function sendNotification(
  supabaseUrl: string,
  serviceKey: string,
  brevoApiKey: string,
  senderEmail: string,
  senderName: string,
  visitorEmail: string,
  messageBody: string,
) {
  const recipientResponse = await fetch(
    `${supabaseUrl}/rest/v1/contact_methods?method_type=eq.email&is_enabled=eq.true&select=value&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!recipientResponse.ok) throw new Error(`Contact email lookup failed (${recipientResponse.status}).`);

  const recipients = await recipientResponse.json();
  const recipientEmail = Array.isArray(recipients) && typeof recipients[0]?.value === 'string'
    ? recipients[0].value.trim()
    : '';
  if (!recipientEmail || !isValidEmail(recipientEmail)) throw new Error('The public contact email is not configured.');

  const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: recipientEmail }],
      replyTo: { email: visitorEmail },
      subject: 'New message from your portfolio',
      textContent: `You received a new message through your portfolio contact form.\n\nFrom: ${visitorEmail}\n\n${messageBody}`,
    }),
  });
  if (!brevoResponse.ok) throw new Error(`Brevo notification failed (${brevoResponse.status}).`);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Use POST to submit a message.' }, 405);

  const parsedBody = await readBoundedJson(request);
  if (!parsedBody.ok) {
    return parsedBody.reason === 'too_large'
      ? jsonResponse({ error: 'The request is too large.' }, 413)
      : jsonResponse({ error: 'Send a valid email address and message.' }, 400);
  }

  const validated = validateContactInput(parsedBody.value);
  if (!validated.ok) {
    return jsonResponse({ error: 'Enter a valid email address and a message of up to 5,000 characters.' }, 400);
  }
  const { visitorEmail, messageBody } = validated.value;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL');
  const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Developer Portfolio';
  if (!supabaseUrl || !serviceKey) {
    console.error('Contact database configuration is incomplete.');
    return jsonResponse({ error: 'The contact service is temporarily unavailable.' }, 500);
  }

  let savedMessage: { id?: string } | null = null;
  try {
    const saveResponse = await fetch(`${supabaseUrl}/rest/v1/visitor_messages?select=id`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ visitor_email: visitorEmail, message_body: messageBody }),
    });
    if (!saveResponse.ok) {
      console.error(`Contact message save failed (${saveResponse.status}).`);
      return jsonResponse({ error: 'Your message could not be saved. Please try again.' }, 500);
    }
    const rows = await saveResponse.json();
    savedMessage = Array.isArray(rows) ? rows[0] : null;
  } catch (error) {
    console.error(`Contact message save request failed (${error instanceof Error ? error.name : 'unknown error'}).`);
    return jsonResponse({ error: 'Your message could not be saved. Please try again.' }, 500);
  }

  if (!savedMessage?.id) {
    console.error('Contact message save returned no message ID.');
    return jsonResponse({ error: 'Your message could not be saved. Please try again.' }, 500);
  }

  let notificationStatus: 'sent' | 'failed' = 'sent';
  try {
    if (!brevoApiKey || !senderEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(senderEmail)) {
      throw new Error('Brevo notification configuration is incomplete.');
    }
    await sendNotification(supabaseUrl, serviceKey, brevoApiKey, senderEmail, senderName, visitorEmail, messageBody);
  } catch (error) {
    notificationStatus = 'failed';
    console.error(`Contact notification failed (${error instanceof Error ? error.message : 'unknown error'}).`);
  }

  try {
    await updateNotificationStatus(supabaseUrl, serviceKey, savedMessage.id, notificationStatus);
  } catch (error) {
    console.error(`Contact notification status could not be recorded (${error instanceof Error ? error.message : 'unknown error'}).`);
  }

  return jsonResponse({ success: true });
});
