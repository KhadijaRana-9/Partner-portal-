-- =============================================================================
-- 1. Admin-configurable payment account details (was hardcoded in Checkout.jsx)
-- 2. Customer-initiated return requests (new order-lifecycle step)
-- =============================================================================

alter table public.platform_settings add column if not exists jazzcash_account text default '';
alter table public.platform_settings add column if not exists easypaisa_account text default '';
alter table public.platform_settings add column if not exists bank_details text default '';
alter table public.platform_settings add column if not exists crypto_details text default '';
alter table public.platform_settings add column if not exists cash_instructions text
  default 'Pay in cash when your order is delivered. Your order will be reviewed and confirmed by our team before dispatch.';

update public.platform_settings set
  jazzcash_account = coalesce(nullif(jazzcash_account, ''), 'JazzCash: 0300-1234567 (Digitalsofts)'),
  easypaisa_account = coalesce(nullif(easypaisa_account, ''), 'Easypaisa: 0300-7654321 (Digitalsofts)'),
  bank_details = coalesce(nullif(bank_details, ''), 'HBL — Account 1234-5678901-2 — Digitalsofts Pvt Ltd'),
  crypto_details = coalesce(nullif(crypto_details, ''), 'USDT (TRC20): TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
where id = true;

-- ---------------------------------------------------------------------------
-- Extend the order lifecycle with a customer-initiated return request step:
--   delivered -> return_requested -> (admin) returned | delivered (rejected back)
-- CHECK constraints can't be altered in place, so drop + recreate.
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'pending_payment', 'payment_submitted', 'payment_approved', 'order_confirmed',
  'processing', 'delivered', 'return_requested', 'rejected', 'cancelled', 'returned', 'refunded'
));

alter table public.orders add column if not exists return_reason text;

-- Customer (the owning affiliate) requests a return on their own delivered
-- order. Ownership is enforced here, not just in RLS, since this mutates
-- status rather than being a plain row update.
create or replace function public.request_order_return(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_affiliate_id uuid; v_status text;
begin
  v_affiliate_id := public.auth_affiliate_id();
  if v_affiliate_id is null then raise exception 'not authenticated'; end if;

  select status into v_status from public.orders where id = p_order_id and affiliate_id = v_affiliate_id;
  if v_status is null then raise exception 'order not found or not owned by you'; end if;
  if v_status <> 'delivered' then raise exception 'only delivered orders can be returned'; end if;

  update public.orders set status = 'return_requested', return_reason = p_reason, updated_at = now()
  where id = p_order_id;
end;
$$;

grant execute on function public.request_order_return(uuid, text) to authenticated;
