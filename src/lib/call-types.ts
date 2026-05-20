export type CallStatus = "ringing" | "accepted" | "declined" | "missed" | "ended" | "failed";

export type CallRow = {
  id: string;
  conversation_id: string;
  caller_id: string;
  receiver_id: string;
  status: CallStatus;
  call_type: "video";
  provider: "daily";
  room_url: string | null;
  room_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};
