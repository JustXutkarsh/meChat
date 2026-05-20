import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return bad("Unauthorized", 401);

  const { conversationId, receiverId } = (await req.json()) as {
    conversationId?: string;
    receiverId?: string;
  };

  if (!conversationId || !receiverId) return bad("conversationId and receiverId are required.");
  if (receiverId === userId) return bad("Cannot call yourself.");

  const dailyApiKey = process.env.DAILY_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!dailyApiKey) return bad("Server is missing Daily API key.", 500);
  if (!supabaseUrl || !serviceRole) return bad("Server is missing Supabase service role config.", 500);

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const { data: participants, error: participantsError } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);
  if (participantsError) return bad("Could not validate conversation.", 500);

  const participantIds = new Set((participants ?? []).map((row) => row.user_id));
  if (!participantIds.has(userId) || !participantIds.has(receiverId)) {
    return bad("Not allowed to call for this conversation.", 403);
  }

  const { data: friendshipRows, error: friendshipError } = await supabase
    .from("friend_requests")
    .select("status")
    .in("sender_id", [userId, receiverId])
    .in("receiver_id", [userId, receiverId])
    .eq("status", "accepted")
    .limit(1);

  if (friendshipError) return bad("Could not verify friendship.", 500);
  if (!friendshipRows?.length) return bad("Only accepted friends can call.", 403);

  const { data: blockRows, error: blockError } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .in("blocker_id", [userId, receiverId])
    .in("blocked_id", [userId, receiverId]);

  if (blockError) return bad("Could not verify block status.", 500);
  if ((blockRows ?? []).length) return bad("Calling is not allowed between these users.", 403);

  const roomName = `mechat-${conversationId.replace(/[^a-zA-Z0-9_-]/g, "")}-${crypto.randomUUID()}`;
  const exp = Math.floor(Date.now() / 1000) + 60 * 60;

  const roomRes = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dailyApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "public",
      properties: {
        enable_chat: false,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
        exp,
      },
    }),
  });

  if (!roomRes.ok) {
    return bad("Could not create call room.", 500);
  }

  const dailyRoom = (await roomRes.json()) as { name: string; url: string };
  console.info("[calls/start] Daily room created", { roomName: dailyRoom.name, hasRoomUrl: Boolean(dailyRoom.url) });

  const { data: call, error: callError } = await supabase
    .from("calls")
    .insert({
      conversation_id: conversationId,
      caller_id: userId,
      receiver_id: receiverId,
      status: "ringing",
      call_type: "video",
      provider: "daily",
      room_url: dailyRoom.url,
      room_name: dailyRoom.name,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (callError || !call) return bad("Could not save call record.", 500);

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", userId)
    .maybeSingle();

  const callerName = callerProfile?.full_name || callerProfile?.username || "Someone";

  await supabase.from("notifications").insert({
    user_id: receiverId,
    actor_id: userId,
    type: "video_call",
    title: "Incoming video call",
    body: `${callerName} is calling you`,
    metadata: {
      callId: call.id,
      conversationId,
      roomUrl: dailyRoom.url,
      roomName: dailyRoom.name,
    },
  });

  return NextResponse.json({ call, roomUrl: dailyRoom.url, roomName: dailyRoom.name });
}
