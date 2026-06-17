// app/api/store/checkout/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { startCheckout } from "@/app/lib/goga/store-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string;
      items?: { productId?: string }[];
    };
    const items = (body.items ?? [])
      .filter((i) => i.productId)
      .map((i) => ({ productId: i.productId! }));
    if (!body.email || items.length === 0) {
      return NextResponse.json(
        { error: "email and items are required" },
        { status: 400 },
      );
    }
    const { redirectUrl, orderId } = await startCheckout(items, body.email);
    return NextResponse.json({ redirectUrl, orderId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "checkout failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
