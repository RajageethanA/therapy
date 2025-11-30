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
  AlertCircle,
} from "lucide-react";

// Request media permissions
const requestMediaPermissions = async (): Promise<{ audio: boolean; video: boolean }> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    // Stop tracks after getting permission
    stream.getTracks().forEach(track => track.stop());
    return { audio: true, video: true };
  } catch (error) {
    console.error("Permission error:", error);
    // Try audio only
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.getTracks().forEach(track => track.stop());
      return { audio: true, video: false };
    } catch {
      return { audio: false, video: false };
    }
  }
};

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
function ParticipantView({ participantId, isLarge = false }: { participantId: string; isLarge?: boolean }) {
  const micRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { webcamStream, micStream, webcamOn, micOn, isLocal, displayName } =
    useParticipant(participantId);

  // Handle audio stream - IMPORTANT: Only mute local audio to prevent echo
  useEffect(() => {
    if (micRef.current) {
      if (micOn && micStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(micStream.track);
        micRef.current.srcObject = mediaStream;
        // Set muted attribute based on whether it's local participant
        micRef.current.muted = isLocal;
        micRef.current
          .play()
          .catch((error) => console.error("Audio play failed:", error));
      } else {
        micRef.current.srcObject = null;
      }
    }
  }, [micStream, micOn, isLocal]);

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
    <div className={`relative rounded-xl overflow-hidden shadow-lg ${
      isLarge 
        ? "w-full h-full" 
        : "w-36 h-24 border-2 border-white/20"
    }`}>
      {/* Audio element - muted only for local to prevent echo */}
      <audio ref={micRef} autoPlay playsInline muted={isLocal} />
      {webcamOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover bg-gray-900 ${!isLarge && "scale-x-[-1]"}`}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className={`rounded-full bg-primary/20 flex items-center justify-center ${isLarge ? "w-24 h-24" : "w-12 h-12"}`}>
            <span className={`font-bold text-white ${isLarge ? "text-4xl" : "text-xl"}`}>
              {displayName?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
        </div>
      )}
      
      {/* Name overlay */}
      <div className={`absolute left-2 right-2 flex items-center justify-between ${isLarge ? "bottom-4" : "bottom-2"}`}>
        <div className={`bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-2 ${isLarge ? "px-3 py-1.5" : "px-2 py-1"}`}>
          <span className={`text-white font-medium ${isLarge ? "text-sm" : "text-xs"}`}>
            {isLarge ? displayName || "Participant" : "You"}
          </span>
          {isLocal && isLarge && <Badge variant="secondary" className="text-xs">You</Badge>}
        </div>
        <div className="flex gap-1">
          {!micOn && (
            <div className={`bg-red-500/90 rounded-lg ${isLarge ? "p-1.5" : "p-1"}`}>
              <MicOff className={`text-white ${isLarge ? "w-3.5 h-3.5" : "w-3 h-3"}`} />
            </div>
          )}
          {!webcamOn && (
            <div className={`bg-red-500/90 rounded-lg ${isLarge ? "p-1.5" : "p-1"}`}>
              <VideoOff className={`text-white ${isLarge ? "w-3.5 h-3.5" : "w-3 h-3"}`} />
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
    <div className={`bg-gray-900 text-white flex flex-col ${isFullscreen ? "fixed inset-0 z-50" : "h-[450px] rounded-xl overflow-hidden"}`}>
      {/* Header */}
      <div className="bg-gray-800/80 backdrop-blur-sm px-3 py-2 flex items-center justify-between border-b border-gray-700">
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
      <div className="flex-1 p-2 relative">
        {participantIds.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-gray-600 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Connecting...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Remote participant (large/main view) */}
            <div className="w-full h-full">
              {participantIds.filter(id => !participants.get(id)?.local).length > 0 ? (
                participantIds.filter(id => !participants.get(id)?.local).map((participantId) => (
                  <ParticipantView participantId={participantId} key={participantId} isLarge={true} />
                ))
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-7 h-7 text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-base">Waiting for other participant...</p>
                    <p className="text-gray-500 text-xs mt-1">Share the meeting ID to invite them</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Local participant (small, picture-in-picture) */}
            <div className="absolute bottom-3 right-3 z-10">
              {participantIds.filter(id => participants.get(id)?.local).map((participantId) => (
                <ParticipantView participantId={participantId} key={participantId} isLarge={false} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800/80 backdrop-blur-sm px-3 py-2 border-t border-gray-700">
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
  const [permissionStatus, setPermissionStatus] = useState<"checking" | "granted" | "denied">("checking");
  const [permissionDetails, setPermissionDetails] = useState({ audio: false, video: false });

  const displayName =
    participantRole === "therapist" ? `Dr. ${participantName}` : participantName;

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const permissions = await requestMediaPermissions();
      setPermissionDetails(permissions);
      if (permissions.audio || permissions.video) {
        setPermissionStatus("granted");
      } else {
        setPermissionStatus("denied");
      }
    };
    checkPermissions();
  }, []);

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

  // Permission checking state
  if (permissionStatus === "checking") {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">Requesting camera & microphone access...</p>
        <p className="text-muted-foreground mt-2">Please allow access when prompted</p>
      </Card>
    );
  }

  // Permission denied state
  if (permissionStatus === "denied") {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-600" />
        </div>
        <p className="text-lg font-medium mb-2">Camera & Microphone Access Required</p>
        <p className="text-muted-foreground mb-4">
          Please allow camera and microphone access in your browser settings to join the video call.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
          <Button onClick={onCallEnd} variant="ghost">
            Go Back
          </Button>
        </div>
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
