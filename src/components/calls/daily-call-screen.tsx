"use client";

import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export function DailyCallScreen({
  roomUrl,
  callId,
  supabase,
  onClose,
  displayName,
}: {
  roomUrl: string;
  callId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  displayName: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let destroyed = false;
    let frame: any = null;

    const markEnded = async () => {
      await supabase
        .from("calls")
        .update({ status: "ended", ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", callId)
        .in("status", ["ringing", "accepted"]);
    };

    const init = async () => {
      const DailyIframe = (await import("@daily-co/daily-js")).default;
      if (!containerRef.current || destroyed) return;

      frame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "0",
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      });

      frame.on("left-meeting", async () => {
        await markEnded();
        onClose();
      });
      frame.on("error", async () => {
        await supabase.from("calls").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", callId);
        onClose();
      });
      frame.on("camera-error", async () => {
        await supabase.from("calls").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", callId);
        onClose();
      });

      await frame.join({ url: roomUrl, userName: displayName });
    };

    void init();

    return () => {
      destroyed = true;
      if (frame) {
        void frame.leave();
        frame.destroy();
      }
    };
  }, [roomUrl, callId, supabase, onClose, displayName]);

  return (
    <div className="fixed inset-0 z-[110] bg-black">
      <div className="absolute left-3 top-3 z-20 rounded-full border border-white/20 bg-black/45 px-3 py-1 text-xs text-white">meChat call</div>
      <button
        onClick={onClose}
        className="absolute right-3 top-3 z-20 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white"
      >
        End
      </button>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
