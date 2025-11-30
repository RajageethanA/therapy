import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
} from '@videosdk.live/react-sdk';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Maximize2,
  Minimize2,
  Users,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Token server URL - Backend endpoint that generates VideoSDK tokens
const TOKEN_SERVER_URL = import.meta.env.VITE_VIDEOSDK_TOKEN_SERVER || 'http://localhost:5000/videosdk/token';

// Function to get auth token from server
export const getAuthToken = async (): Promise<string> => {
  try {
    console.log('Fetching token from:', TOKEN_SERVER_URL);
    const response = await fetch(TOKEN_SERVER_URL);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token server error:', response.status, errorText);
      throw new Error(`Token server error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Token received successfully');
    return data.token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    throw error;
  }
};

// API call to create a meeting room
export const createMeeting = async ({ token }: { token: string }): Promise<string> => {
  const res = await fetch('https://api.videosdk.live/v2/rooms', {
    method: 'POST',
    headers: {
      authorization: `${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Create meeting failed:', res.status, errorText);
    throw new Error(`Failed to create meeting: ${res.status} - ${errorText}`);
  }
  
  const { roomId } = await res.json();
  console.log('Meeting created:', roomId);
  return roomId;
};

// Participant View Component - renders each participant's video
function ParticipantView({ participantId }: { participantId: string }) {
  const micRef = useRef<HTMLAudioElement>(null);
  const { webcamStream, micStream, webcamOn, micOn, isLocal, displayName } = 
    useParticipant(participantId);

  const videoStream = useMemo(() => {
    if (webcamOn && webcamStream) {
      const mediaStream = new MediaStream();
      mediaStream.addTrack(webcamStream.track);
      return mediaStream;
    }
    return null;
  }, [webcamStream, webcamOn]);

  useEffect(() => {
    if (micRef.current) {
      if (micOn && micStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(micStream.track);
        micRef.current.srcObject = mediaStream;
        micRef.current
          .play()
          .catch((error) => console.error('Audio play failed:', error));
      } else {
        micRef.current.srcObject = null;
      }
    }
  }, [micStream, micOn]);

  return (
    <div className={cn(
      "relative rounded-xl overflow-hidden bg-gray-900",
      isLocal ? "w-40 h-32 absolute top-4 right-4 z-10 border-2 border-white/30" : "flex-1 min-h-[400px]"
    )}>
      {/* Audio element for mic */}
      <audio ref={micRef} autoPlay playsInline muted={isLocal} />
      
      {/* Video */}
      {webcamOn && videoStream ? (
        <video
          autoPlay
          playsInline
          muted={isLocal}
          ref={(ref) => {
            if (ref) {
              ref.srcObject = videoStream;
            }
          }}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        </div>
      )}
      
      {/* Name and status overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div className="bg-black/60 px-2 py-1 rounded text-white text-sm flex items-center gap-2">
          <span>{displayName || 'Participant'}</span>
          {isLocal && <Badge variant="secondary" className="text-xs">You</Badge>}
        </div>
        <div className="flex gap-1">
          {!micOn && (
            <div className="bg-red-500/80 p-1 rounded">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
          {!webcamOn && (
            <div className="bg-red-500/80 p-1 rounded">
              <VideoOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Controls Component - mic, webcam, leave buttons
function Controls() {
  const { leave, toggleMic, toggleWebcam } = useMeeting();
  const [micOn, setMicOn] = useState(true);
  const [webcamOn, setWebcamOn] = useState(true);

  const handleToggleMic = () => {
    toggleMic();
    setMicOn(!micOn);
  };

  const handleToggleWebcam = () => {
    toggleWebcam();
    setWebcamOn(!webcamOn);
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        onClick={handleToggleMic}
        size="lg"
        variant={micOn ? "outline" : "destructive"}
        className="rounded-full w-14 h-14 p-0"
      >
        {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
      </Button>

      <Button
        onClick={handleToggleWebcam}
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

// Meeting View Component - the actual meeting interface
function MeetingView({ 
  meetingId, 
  onMeetingLeave 
}: { 
  meetingId: string; 
  onMeetingLeave: () => void;
}) {
  const [joined, setJoined] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callStartTimeRef = useRef<number>(Date.now());

  const { join, participants } = useMeeting({
    onMeetingJoined: () => {
      setJoined('JOINED');
      callStartTimeRef.current = Date.now();
    },
    onMeetingLeft: () => {
      onMeetingLeave();
    },
    onParticipantJoined: (participant) => {
      console.log('Participant joined:', participant.displayName);
    },
    onParticipantLeft: (participant) => {
      console.log('Participant left:', participant.displayName);
    },
  });

  const joinMeeting = () => {
    setJoined('JOINING');
    join();
  };

  // Auto-join on mount
  useEffect(() => {
    joinMeeting();
  }, []);

  // Timer for call duration
  useEffect(() => {
    if (joined === 'JOINED') {
      const timer = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [joined]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    alert('Room ID copied: ' + meetingId);
  };

  const participantIds = [...participants.keys()];

  if (joined === 'JOINING') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Joining the meeting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-gray-900 text-white flex flex-col",
      isFullscreen ? "fixed inset-0 z-50" : "h-[600px] rounded-lg overflow-hidden"
    )}>
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-green-600">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
            Live
          </Badge>
          <div className="flex items-center gap-1 text-gray-300 text-sm">
            <Users className="w-4 h-4" />
            <span>{participantIds.length}</span>
          </div>
          <span className="text-sm font-mono text-gray-300">
            {formatDuration(callDuration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyMeetingId}
            className="text-gray-300 hover:text-white"
          >
            <span className="mr-2">📋</span>
            <span className="font-mono text-xs">Room: {meetingId}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 relative">
        {participantIds.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">Connecting...</p>
            </div>
          </div>
        ) : (
          participantIds.map((participantId) => (
            <ParticipantView key={participantId} participantId={participantId} />
          ))
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        <Controls />
      </div>
    </div>
  );
}

// Join Screen Component - shows before joining
function JoinScreen({
  meetingId,
  setMeetingId,
  onCreateMeeting,
  onJoinMeeting,
  isHost,
}: {
  meetingId: string;
  setMeetingId: (id: string) => void;
  onCreateMeeting: () => void;
  onJoinMeeting: () => void;
  isHost: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] bg-gray-900 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-6">Video Call</h2>
      
      {isHost ? (
        <div className="text-center">
          <p className="text-gray-400 mb-4">Create a new meeting room for your session</p>
          <Button onClick={onCreateMeeting} size="lg">
            Create Meeting
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-gray-400 mb-4">Enter the Room ID provided by your therapist</p>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 mb-4"
          />
          <Button 
            onClick={onJoinMeeting} 
            size="lg"
            disabled={!meetingId}
          >
            Join Meeting
          </Button>
        </div>
      )}
    </div>
  );
}

// Main VideoSDK Call Component
interface VideoSDKCallProps {
  sessionId: string;
  participantName: string;
  participantRole: 'patient' | 'therapist';
  onCallEnd: () => void;
  isHost?: boolean;
  meetingId?: string;
}

const VideoSDKCall: React.FC<VideoSDKCallProps> = ({
  sessionId,
  participantName,
  participantRole,
  onCallEnd,
  isHost = false,
  meetingId: existingMeetingId,
}) => {
  const [meetingId, setMeetingId] = useState<string>(existingMeetingId || '');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = participantRole === 'therapist' ? `Dr. ${participantName}` : participantName;

  // Fetch token on mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getAuthToken();
        setAuthToken(token);
      } catch (err) {
        console.error('Failed to get auth token:', err);
        setError('Failed to connect to video service. Please make sure the backend server is running.');
      }
    };
    fetchToken();
  }, []);

  // Auto-join if meetingId is provided and token is ready
  useEffect(() => {
    if (existingMeetingId && authToken) {
      setMeetingId(existingMeetingId);
      setIsJoined(true);
    }
  }, [existingMeetingId, authToken]);

  const handleCreateMeeting = async () => {
    if (!authToken) {
      setError('Video service not ready. Please wait or refresh the page.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const newMeetingId = await createMeeting({ token: authToken });
      setMeetingId(newMeetingId);
      setIsJoined(true);
    } catch (err) {
      console.error('Failed to create meeting:', err);
      setError(err instanceof Error ? err.message : 'Failed to create meeting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinMeeting = () => {
    if (!authToken) {
      setError('Video service not ready. Please wait or refresh the page.');
      return;
    }
    if (!meetingId) {
      setError('Please enter a Room ID');
      return;
    }
    setIsJoined(true);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Creating meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-md p-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-lg mb-2">Error</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <Button onClick={() => setError(null)} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show loading while fetching token
  if (!authToken) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Connecting to video service...</p>
        </div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <JoinScreen
        meetingId={meetingId}
        setMeetingId={setMeetingId}
        onCreateMeeting={handleCreateMeeting}
        onJoinMeeting={handleJoinMeeting}
        isHost={isHost}
      />
    );
  }

  return (
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
      <MeetingView meetingId={meetingId} onMeetingLeave={onCallEnd} />
    </MeetingProvider>
  );
};

export default VideoSDKCall;
