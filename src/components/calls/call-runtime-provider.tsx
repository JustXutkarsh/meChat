"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Avatar } from "@/components/avatar";
import { DailyCallScreen } from "@/components/calls/daily-call-screen";
import { useSupabaseClient } from "@/lib/supabase";
import type { CallRow } from "@/lib/call-types";
import type { Profile } from "@/lib/types";

type ActiveCallState = {
  call: CallRow;
  roomUrl: string;
  otherUser?: Profile | null;
};

type CallRuntimeValue = {
  startVideoCall: (args: { conversationId: string; receiverId: string }) => Promise<void>;
};

const CallRuntimeContext = createContext<CallRuntimeValue | null>(null);

export function useCallRuntime() {
  const ctx = useContext(CallRuntimeContext);
  if (!ctx) throw new Error("useCallRuntime must be used inside CallRuntimeProvider");
  return ctx;
}

export function CallRuntimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const supabase = useSupabaseClient();
  const currentUserId = user?.id;

  const [incomingCall, setIncomingCall] = useState<ActiveCallState | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<ActiveCallState | null>(null);
  const [inCall, setInCall] = useState<ActiveCallState | null>(null);
  const [callFeedback, setCallFeedback] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const incomingRef = useRef<ActiveCallState | null>(null);
  const outgoingRef = useRef<ActiveCallState | null>(null);
  const inCallRef = useRef<ActiveCallState | null>(null);

  useEffect(() => { incomingRef.current = incomingCall; }, [incomingCall]);
  useEffect(() => { outgoingRef.current = outgoingCall; }, [outgoingCall]);
  useEffect(() => { inCallRef.current = inCall; }, [inCall]);

  const closeAll = useCallback(() => {
    setIncomingCall(null);
    setOutgoingCall(null);
    setInCall(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!outgoingCall && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [outgoingCall]);

  useEffect(() => {
    if (!callFeedback) return;
    const t = window.setTimeout(() => setCallFeedback(null), 2200);
    return () => clearTimeout(t);
  }, [callFeedback]);

  const fetchProfile = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, age, email, phone, avatar_url")
      .eq("id", id)
      .maybeSingle();
    return (data ?? null) as Profile | null;
  }, [supabase]);

  const startVideoCall = useCallback(async ({ conversationId, receiverId }: { conversationId: string; receiverId: string }) => {
    const res = await fetch("/api/calls/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, receiverId }),
    });

    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Could not start call.");

    const other = await fetchProfile(receiverId);
    const active = {
      call: payload.call as CallRow,
      roomUrl: payload.roomUrl as string,
      otherUser: other,
    };
    setOutgoingCall(active);

    timeoutRef.current = window.setTimeout(async () => {
      await supabase
        .from("calls")
        .update({ status: "missed", ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", active.call.id)
        .eq("status", "ringing");
    }, 45_000);
  }, [fetchProfile, supabase]);

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const token = await getToken({ template: "supabase" });
      if (token) await supabase.realtime.setAuth(token);
      if (!active) return;

      channel = supabase
      .channel(`calls:${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls", filter: `receiver_id=eq.${currentUserId}` }, async (payload) => {
        const call = payload.new as CallRow;
        if (call.status !== "ringing") return;
        const callerProfile = await fetchProfile(call.caller_id);
        setIncomingCall({ call, roomUrl: call.room_url || "", otherUser: callerProfile });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls" }, async (payload) => {
        const call = payload.new as CallRow;
        if (call.caller_id !== currentUserId && call.receiver_id !== currentUserId) return;

        const outgoingCurrent = outgoingRef.current;
        if (outgoingCurrent && outgoingCurrent.call.id === call.id) {
          if (call.status === "accepted") {
            setInCall({ ...outgoingCurrent, call, roomUrl: call.room_url || outgoingCurrent.roomUrl });
            setOutgoingCall(null);
          }
          if (["declined", "missed", "ended", "failed"].includes(call.status)) {
            if (call.status === "declined") setCallFeedback("Call declined");
            if (call.status === "missed") setCallFeedback("No answer");
            if (call.status === "failed") setCallFeedback("Call failed");
            setOutgoingCall(null);
          }
        }

        const incomingCurrent = incomingRef.current;
        if (incomingCurrent && incomingCurrent.call.id === call.id && ["ended", "missed", "declined", "failed"].includes(call.status)) {
          setIncomingCall(null);
        }

        const inCallCurrent = inCallRef.current;
        if (inCallCurrent && inCallCurrent.call.id === call.id && ["ended", "missed", "declined", "failed"].includes(call.status)) {
          setInCall(null);
        }
      })
      .subscribe();
    };

    void setup();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, fetchProfile, getToken]);

  const acceptIncoming = async () => {
    if (!incomingCall) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("calls")
      .update({ status: "accepted", started_at: now, updated_at: now })
      .eq("id", incomingCall.call.id)
      .select("*")
      .single();

    if (data) {
      setInCall({ ...incomingCall, call: data as CallRow, roomUrl: (data as CallRow).room_url || incomingCall.roomUrl });
      setIncomingCall(null);
    }
  };

  const declineIncoming = async () => {
    if (!incomingCall) return;
    const now = new Date().toISOString();
    await supabase.from("calls").update({ status: "declined", ended_at: now, updated_at: now }).eq("id", incomingCall.call.id);
    setIncomingCall(null);
  };

  const cancelOutgoing = async () => {
    if (!outgoingCall) return;
    const now = new Date().toISOString();
    await supabase
      .from("calls")
      .update({ status: "ended", ended_at: now, updated_at: now })
      .eq("id", outgoingCall.call.id)
      .eq("status", "ringing");
    setOutgoingCall(null);
  };

  const handleCallClose = async () => {
    if (!inCall) return;
    const now = new Date().toISOString();
    await supabase
      .from("calls")
      .update({ status: "ended", ended_at: now, updated_at: now })
      .eq("id", inCall.call.id)
      .in("status", ["ringing", "accepted"]);
    closeAll();
  };

  const value = useMemo<CallRuntimeValue>(() => ({ startVideoCall }), [startVideoCall]);

  return (
    <CallRuntimeContext.Provider value={value}>
      {children}

      {outgoingCall ? (
        <div className="fixed inset-0 z-[105] grid place-items-center bg-black/70 backdrop-blur-md">
          <div className="glass-card w-[92%] max-w-sm rounded-3xl p-6 text-center">
            <div className="mx-auto mb-4 w-fit rounded-full p-1 [animation:pulse-soft_1.8s_ease-in-out_infinite]">
              <Avatar name={outgoingCall.otherUser?.full_name || outgoingCall.otherUser?.username || "Friend"} imageUrl={outgoingCall.otherUser?.avatar_url} />
            </div>
            <p className="text-lg font-semibold">{outgoingCall.otherUser?.full_name || outgoingCall.otherUser?.username || "Friend"}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Calling...</p>
            <button onClick={() => void cancelOutgoing()} className="mt-6 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white">Cancel</button>
          </div>
        </div>
      ) : null}

      {incomingCall ? (
        <div className="fixed inset-0 z-[105] grid place-items-center bg-black/70 backdrop-blur-md">
          <div className="glass-card w-[92%] max-w-sm rounded-3xl p-6 text-center">
            <div className="mx-auto mb-4 w-fit rounded-full p-1 [animation:pulse-soft_1.8s_ease-in-out_infinite]">
              <Avatar name={incomingCall.otherUser?.full_name || incomingCall.otherUser?.username || "Caller"} imageUrl={incomingCall.otherUser?.avatar_url} />
            </div>
            <p className="text-lg font-semibold">{incomingCall.otherUser?.full_name || incomingCall.otherUser?.username || "Caller"}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Incoming video call</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => void declineIncoming()} className="rounded-full border border-red-500/70 px-4 py-2 text-sm text-red-300">Decline</button>
              <button onClick={() => void acceptIncoming()} className="neon-button rounded-full px-4 py-2 text-sm font-semibold text-white">Accept</button>
            </div>
          </div>
        </div>
      ) : null}

      {inCall ? (
        <DailyCallScreen
          roomUrl={inCall.roomUrl}
          callId={inCall.call.id}
          supabase={supabase}
          onClose={() => void handleCallClose()}
          onCameraBlocked={() =>
            setCallFeedback("Camera or microphone permission was blocked. Please allow access in browser settings.")
          }
          displayName={user?.fullName || user?.username || "meChat user"}
        />
      ) : null}

      {callFeedback ? (
        <div className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-full border border-[var(--border)] bg-[rgba(11,17,32,0.9)] px-4 py-2 text-sm text-[var(--text-primary)]">
          {callFeedback}
        </div>
      ) : null}
    </CallRuntimeContext.Provider>
  );
}
