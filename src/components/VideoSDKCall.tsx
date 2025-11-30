import React, { useEffect, useRef, useState } from "react";
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
} from "@videosdk.live/react-sdk";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Copy,
  Users,
  Maximize2,
  Minimize2,
} from "lucide-react";

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
    <div className={`relative rounded-xl overflow-hidden ${isLocal ? "w-48 h-36" : "flex-1 min-h-[300px]"}`}>
      <audio ref={micRef} autoPlay muted={isLocal} />
      {webcamOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover bg-gray-900"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {displayName?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
        </div>
      )}
      
      {/* Name overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="text-white text-sm font-medium">{displayName || "Participant"}</span>
          {isLocal && <Badge variant="secondary" className="text-xs">You</Badge>}
        </div>
        <div className="flex gap-1.5">
          {!micOn && (
            <div className="bg-red-500/90 p-1.5 rounded-lg">
              <MicOff className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          {!webcamOn && (
            <div className="bg-red-500/90 p-1.5 rounded-lg">
              <VideoOff className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Controls Component
function Controls() {
  const { leave, toggleMic, toggleWebcam } = useMeeting();
  const [micOn, setMicOn] = useState(true);
  const [webcamOn, setWebcamOn] = useState(true);

  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        onClick={() => {
          toggleMic();
          setMicOn(!micOn);
        }}
        size="lg"
        variant={micOn ? "outline" : "destructive"}
        className="rounded-full w-14 h-14 p-0"
      >
        {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
      </Button>

      <Button
        onClick={() => {
          toggleWebcam();
          setWebcamOn(!webcamOn);
        }}
        size="lg"
        variant={webcamOn ? "outline" : "destructive"}
        className="rounded-full w-14 h-14 p-0"
      >
        {webcamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
      </Button>

      <Button
        onClick={() => leave()}
        size="lg"
        variant="destructive"
        className="rounded-full w-14 h-14 p-0 bg-red-600 hover:bg-red-700"
      >
        <PhoneOff className="w-6 h-6" />
      </Button>
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  const { join, participants } = useMeeting({
    onMeetingJoined: () => {
      setJoined("JOINED");
      startTimeRef.current = Date.now();
    },
    onMeetingLeft: () => {
      onMeetingLeave();
    },
  });

  const joinMeeting = () => {
    setJoined("JOINING");
    join();
  };

  // Timer
  useEffect(() => {
    if (joined === "JOINED") {
      const timer = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [joined]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
  };

  const participantIds = [...participants.keys()];

  if (joined === "JOINING") {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Joining the meeting...</p>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Video className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Ready to Join?</h3>
        <p className="text-gray-400 mb-6">Meeting ID: {meetingId}</p>
        <Button onClick={joinMeeting} size="lg" className="px-8">
          Join Meeting
        </Button>
      </Card>
    );
  }

  return (
    <div className={`bg-gray-900 text-white flex flex-col ${isFullscreen ? "fixed inset-0 z-50" : "h-[600px] rounded-xl overflow-hidden"}`}>
      {/* Header */}
      <div className="bg-gray-800/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <Badge className="bg-green-600 hover:bg-green-600">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
            Live
          </Badge>
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="w-4 h-4" />
            <span className="text-sm">{participantIds.length}</span>
          </div>
          <span className="text-sm font-mono text-gray-300 bg-gray-700/50 px-2 py-1 rounded">
            {formatDuration(callDuration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyMeetingId}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <Copy className="w-4 h-4 mr-2" />
            <span className="font-mono text-xs">{meetingId}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 relative flex gap-4">
        {participantIds.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-gray-600 border-t-primary rounded-full animate-spin" />
          </div>
        ) : participantIds.length === 1 ? (
          <ParticipantView participantId={participantIds[0]} key={participantIds[0]} />
        ) : (
          <>
            {/* Remote participant (large) */}
            {participantIds.filter(id => !participants.get(id)?.local).map((participantId) => (
              <ParticipantView participantId={participantId} key={participantId} />
            ))}
            {/* Local participant (small, overlay) */}
            <div className="absolute bottom-20 right-4">
              {participantIds.filter(id => participants.get(id)?.local).map((participantId) => (
                <ParticipantView participantId={participantId} key={participantId} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800/80 backdrop-blur-sm px-4 py-4 border-t border-gray-700">
        <Controls />
      </div>
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
    <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <Video className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Video Call</h2>
      <p className="text-muted-foreground mb-6">
        {isHost ? "Start a new meeting session" : "Enter the meeting ID to join"}
      </p>
      
      {isHost ? (
        <Button onClick={() => getMeetingAndToken()} size="lg" className="px-8">
          <Video className="w-5 h-5 mr-2" />
          Create Meeting
        </Button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="text"
            placeholder="Enter Meeting ID"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => getMeetingAndToken(meetingId)}
            disabled={!meetingId}
            size="lg"
          >
            Join Meeting
          </Button>
        </div>
      )}
    </Card>
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
      <Card className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <VideoOff className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-lg font-medium mb-2">VideoSDK token not configured</p>
        <p className="text-muted-foreground mb-4">Add VITE_VIDEOSDK_TOKEN to your .env file</p>
        <Button onClick={onCallEnd} variant="outline">
          Go Back
        </Button>
      </Card>
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
