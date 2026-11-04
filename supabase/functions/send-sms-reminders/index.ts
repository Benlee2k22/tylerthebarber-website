import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!sid || !token || !from) return new Response(JSON.stringify({ error: 'Twilio secrets are not configured.' }), { status: 500 });

  const db = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const fromWindow = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const toWindow = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const { data: bookings, error } = await db.from('appointments')
    .select('id,customer_name,phone,appointment_date,start_time,services(name)')
    .eq('status', 'confirmed').eq('sms_opt_in', true).is('reminder_sent_at', null)
    .gte('appointment_date', fromWindow.toISOString().slice(0, 10))
    .lte('appointment_date', toWindow.toISOString().slice(0, 10));
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0;
  for (const booking of bookings || []) {
    const localAppointment = new Date(`${booking.appointment_date}T${booking.start_time}`);
    if (localAppointment < fromWindow || localAppointment > toWindow) continue;
    const serviceName = (booking.services as { name?: string } | null)?.name || 'your appointment';
    const body = `Reminder: ${serviceName} with Tyler the Barber is tomorrow at ${booking.start_time.slice(0, 5)}. Reply to Tyler directly if you need to change your booking.`;
    const form = new URLSearchParams({ To: booking.phone, From: from, Body: body });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (response.ok) {
      await db.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', booking.id);
      sent += 1;
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
