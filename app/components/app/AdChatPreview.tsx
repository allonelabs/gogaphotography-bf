// Stub — videos editor lives in zone-3 (V3-E). Restore later.
import type { ReactNode } from "react";
import type { AdConfig } from "@/app/lib/ad-config";
export interface AdChatPreviewProps {
  readonly businessId?: string;
  readonly config?: AdConfig;
  readonly durationFrames?: number;
  readonly children?: ReactNode;
}
export function AdChatPreview(_props: AdChatPreviewProps): ReactNode {
  return null;
}
export default AdChatPreview;
