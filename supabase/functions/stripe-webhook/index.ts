// ============================================================
//  Edge Function: stripe-webhook
//  Fonte da verdade do acesso. Atualiza `subscriptions` quando o
//  pagamento é aprovado, renovado, atrasado ou cancelado.
//  Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
//  Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** verificação de assinatura HMAC do Stripe (sem SDK) */
async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(',').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=');
    acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

serve(async (req) => {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  if (secret && !(await verifyStripeSignature(raw, sig, secret))) {
    return new Response('assinatura inválida', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('json inválido', { status: 400 });
  }

  const type = event.type as string;
  const obj = (event.data as { object: Record<string, unknown> })?.object ?? {};

  const customer = obj.customer as string | undefined;
  const subId = (obj.subscription as string) ?? (obj.id as string);
  const status = obj.status as string | undefined;
  const periodEnd = obj.current_period_end as number | undefined;

  try {
    if (customer && ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(type)) {
      // localiza o usuário pelo customer id salvo anteriormente
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('provider_customer_id', customer)
        .maybeSingle();

      if (existing?.user_id) {
        await supabase
          .from('subscriptions')
          .update({
            provider_sub_id: subId,
            status: type === 'customer.subscription.deleted' ? 'canceled' : status ?? 'inactive',
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', existing.user_id);

        await supabase
          .from('profiles')
          .update({ plan: status === 'active' || status === 'trialing' ? 'pro' : 'free' })
          .eq('id', existing.user_id);
      }
    }

    // primeiro pagamento: liga customer → usuário (metadata.user_id vem do checkout)
    if (type === 'checkout.session.completed') {
      const userId = (obj.metadata as Record<string, string>)?.user_id ?? (obj.client_reference_id as string);
      if (userId && customer) {
        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            provider: 'stripe',
            provider_customer_id: customer,
            provider_sub_id: subId,
            plan: 'pro',
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
        await supabase.from('profiles').update({ plan: 'pro' }).eq('id', userId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
