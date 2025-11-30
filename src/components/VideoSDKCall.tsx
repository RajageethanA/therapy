import React, { useEffect, useRef, useState } from "react";
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
} from "@videosdk.live/react-sdk";

// Auth token - Generate from https://app.videosdk.live/api-keys
// Select BOTH "allow_join" AND "allow_mod" permissions
export const authToken: string = import.meta.env.VITE_VIDEOSDK_TOKEN || "";

// API call to create a meeting
export const createMeeting = async ({ token }: { token: string }) => {
  const res = await fetch(`https://api.videosdk.live/v2/rooms`, {
    method: "POST",
    headers: {
      authorization: `${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const { roomId }: { roomId: string } = await res.json();
  return roomId;
};

// Participant View Component
function ParticipantView({ participantId }: { participantId: string }) {
  const micRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { webcamStream, micStream, webcamOn, micOn, isLocal, displayName } =
    useParticipant(participantId);

  useEffect(() => {
    if (micRef.current) {
      if (micOn && micStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(micStream.track);
        micRef.current.srcObject = mediaStream;
        micRef.current
          .play()
          .catch((error) => console.error("Audio play failed", error));
      } else {
        micRef.current.srcObject = null;
      }
    }
  }, [micStream, micOn]);

  useEffect(() => {
    if (videoRef.current) {
      if (webcamOn && webcamStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(webcamStream.track);
        videoRef.current.srcObject = mediaStream;
        videoRef.current
          .play()
          .catch((error) => console.error("Video play failed", error));
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [webcamStream, webcamOn]);

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "10px",
        margin: "10px",
        backgroundColor: isLocal ? "#f0f9ff" : "#fff",
      }}
    >
      <p style={{ fontWeight: "bold", marginBottom: "8px" }}>
        {displayName} {isLocal && "(You)"} | Webcam: {webcamOn ? "ON" : "OFF"} |
        Mic: {micOn ? "ON" : "OFF"}
      </p>
      <audio ref={micRef} autoPlay muted={isLocal} />
      {webcamOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{
            width: "300px",
            height: "200px",
            backgroundColor: "#000",
            borderRadius: "4px",
          }}
        />
      ) : (
        <div
          style={{
            width: "300px",
            height: "200px",
            backgroundColor: "#333",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          Camera Off
        </div>
      )}
    </div>
  );
}

// Controls Component
function Controls() {
  const { leave, toggleMic, toggleWebcam } = useMeeting();
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
      <button
        onClick={() => leave()}
        style={{
          padding: "10px 20px",
          backgroundColor: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Leave
      </button>
      <button
        onClick={() => toggleMic()}
        style={{
          padding: "10px 20px",
          backgroundColor: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Toggle Mic
      </button>
      <button
        onClick={() => toggleWebcam()}
        style={{
          padding: "10px 20px",
          backgroundColor: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Toggle Webcam
      </button>
    </div>
  );
}

// Meeting View Component
function MeetingView({
  onMeetingLeave,
  meetingId,
}: {
  onMeetingLeave: () => void;
  meetingId: string;
}) {
  const [joined, setJoined] = useState<string | null>(null);
  const { join, participants } = useMeeting({
    onMeetingJoined: () => {
      setJoined("JOINED");
    },
    onMeetingLeft: () => {
      onMeetingLeave();
    },
  });

  const joinMeeting = () => {
    setJoined("JOINING");
    join();
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#f9fafb",
        minHeight: "400px",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ marginBottom: "10px" }}>Meeting Id: {meetingId}</h3>
      {joined && joined === "JOINED" ? (
        <div>
          <Controls />
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {[...participants.keys()].map((participantId) => (
              <ParticipantView
                participantId={participantId}
                key={participantId}
              />
            ))}
          </div>
        </div>
      ) : joined && joined === "JOINING" ? (
        <p>Joining the meeting...</p>
      ) : (
        <button
          onClick={joinMeeting}
          style={{
            padding: "15px 30px",
            backgroundColor: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Join Meeting
        </button>
      )}
    </div>
  );
}

// Join Screen Component
function JoinScreen({
  getMeetingAndToken,
  isHost,
}: {
  getMeetingAndToken: (meeting?: string) => void;
  isHost: boolean;
}) {
  const [meetingId, setMeetingId] = useState<string>("");

  return (
    <div
      style={{
        padding: "40px",
        textAlign: "center",
        backgroundColor: "#f9fafb",
        borderRadius: "8px",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>Video Call</h2>
      {isHost ? (
        <button
          onClick={() => getMeetingAndToken()}
          style={{
            padding: "15px 30px",
            backgroundColor: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Create Meeting
        </button>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Enter Meeting Id"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            style={{
              padding: "10px",
              width: "250px",
              marginRight: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          <button
            onClick={() => getMeetingAndToken(meetingId)}
            disabled={!meetingId}
            style={{
              padding: "10px 20px",
              backgroundColor: meetingId ? "#3b82f6" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: meetingId ? "pointer" : "not-allowed",
            }}
          >
            Join
          </button>
        </div>
      )}
    </div>
  );
}

// Main VideoSDK Call Component
interface VideoSDKCallProps {
  sessionId: string;
  participantName: string;
  participantRole: "patient" | "therapist";
  onCallEnd: () => void;
  isHost?: boolean;
  meetingId?: string;
}

const VideoSDKCall: React.FC<VideoSDKCallProps> = ({
  participantName,
  participantRole,
  onCallEnd,
  isHost = false,
  meetingId: existingMeetingId,
}) => {
  const [meetingId, setMeetingId] = useState<string | null>(
    existingMeetingId || null
  );

  const displayName =
    participantRole === "therapist" ? `Dr. ${participantName}` : participantName;

  const getMeetingAndToken = async (id?: string) => {
    const newMeetingId =
      id == null ? await createMeeting({ token: authToken }) : id;
    setMeetingId(newMeetingId);
  };

  const onMeetingLeave = () => {
    setMeetingId(null);
    onCallEnd();
  };

  // Auto-join if meetingId provided
  useEffect(() => {
    if (existingMeetingId && !meetingId) {
      setMeetingId(existingMeetingId);
    }
  }, [existingMeetingId]);

  if (!authToken) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        <p>VideoSDK token not configured.</p>
        <p>Add VITE_VIDEOSDK_TOKEN to your .env file.</p>
        <button onClick={onCallEnd} style={{ marginTop: "10px" }}>
          Go Back
        </button>
      </div>
    );
  }

  return authToken && meetingId ? (
    <MeetingProvider
      config={{
        meetingId,
        micEnabled: true,
        webcamEnabled: true,
        name: displayName,
        debugMode: false,
      }}
      token={authToken}
    >
      <MeetingView meetingId={meetingId} onMeetingLeave={onMeetingLeave} />
    </MeetingProvider>
  ) : (
    <JoinScreen getMeetingAndToken={getMeetingAndToken} isHost={isHost} />
  );
};

export default VideoSDKCall;

// Export for therapist Sessions.tsx compatibility
export const getAuthToken = async () => authToken;
