-- 0005_hotel_balance_view.sql
-- Computed per-hotel balance from p_order_hotel.sell_price (money in) minus
-- p_refund_hotel.uncharge (money out / refunded to the supplier). The legacy
-- `hotel_balance` table remains for ad-hoc historical adjustments; this view
-- is the live truth derived from the booking workflow.
--
-- p_refund_hotel has both `uncharge` (supplier uncharge) and `client_uncharge`
-- (client uncharge). Using `uncharge` per the task spec — this is the value
-- the legacy system reconciles against the order's sell_price.

create or replace view hotel_balance_computed as
select
  h.id                                                        as hotel_id,
  coalesce(sum(o.sell_price), 0)::numeric(14,2)               as total_sold,
  coalesce(sum(r.uncharge), 0)::numeric(14,2)                 as total_refunded,
  (coalesce(sum(o.sell_price), 0) - coalesce(sum(r.uncharge), 0))::numeric(14,2)
                                                              as balance
from hotel h
left join p_order_hotel  o on o.hotel_id = h.id
left join p_refund_hotel r on r.hotel_id = h.id
group by h.id;

-- Indexes on the FK columns to keep the per-hotel SELECT cheap as the order
-- volume grows. p_order_hotel_hotel_idx already exists from 0003 but the
-- if-not-exists makes the re-run safe; p_refund_hotel_hotel_idx is new.
create index if not exists p_order_hotel_hotel_idx  on p_order_hotel(hotel_id);
create index if not exists p_refund_hotel_hotel_idx on p_refund_hotel(hotel_id);
