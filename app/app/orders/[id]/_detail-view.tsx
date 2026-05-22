"use client";

import { useState } from "react";
import { OrderTabs, type OrderTab } from "./_tabs";
import { GeneralForm } from "./_general-form";
import { LineItemsPanel } from "./_line-items";
import { TouristsPanel } from "./_tourists";

export type LineItem = Record<string, any> & { id: number };

export type OrderDetail = {
  id: number;
  order_number: number | null;
  c_semblance: string | null;
  client_id: number | null;
  client_first_name: string | null;
  client_last_name: string | null;
  client_pasport_number: string | null;
  client_phone: string | null;
  client_category: string | null;
  client_address: string | null;
  client_country: string | null;
  client_region: string | null;
  client_city: string | null;
  client_birthday: string | null;
  company_parameters_id: number | null;
  cm_name: string | null;
  cm_juridical_address: string | null;
  cm_address: string | null;
  cm_identification: string | null;
  cm_director: string | null;
  cm_bank_name: string | null;
  cm_bank_code: string | null;
  cm_bank_number: string | null;
  cm_currency: string | null;
  order_date: string | null;
  level: number | null;
  c_pay_type: string | null;
  c_pay_proviso: string | null;
  all_sell_price: number | null;
  days: number | null;
  in_pay: boolean | null;
  info: string | null;
  geter_invoice_number: string | null;
  self_invoice_number: string | null;
  avia_invoice_number: string | null;
  additional_number: string | null;
  tourists: LineItem[];
  hotels: LineItem[];
  avias: LineItem[];
  transfers: LineItem[];
  excursions: LineItem[];
  ensures: LineItem[];
  visas: LineItem[];
  services: LineItem[];
};

export function OrderDetailView({
  order,
  kind = "order",
}: {
  order: OrderDetail;
  kind?: "order" | "refund";
}) {
  const [tab, setTab] = useState<OrderTab>("general");

  return (
    <>
      <OrderTabs active={tab} onChange={setTab} />
      <div className="py-6">
        {tab === "general" && <GeneralForm order={order} kind={kind} />}
        {tab === "items" && <LineItemsPanel order={order} kind={kind} />}
        {tab === "tourists" && <TouristsPanel order={order} kind={kind} />}
      </div>
    </>
  );
}
