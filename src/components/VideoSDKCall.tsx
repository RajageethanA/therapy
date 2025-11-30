import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
  MeetingConsumer,
} from '@videosdk.live/react-sdk';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Monitor,
  Maximize2,
  Minimize2,
  Users,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as jose from 'jose';

// VideoSDK credentials from environment variables
const VIDEOSDK_API_KEY = import.meta.env.VITE_VIDEOSDK_API_KEY || '';
const VIDEOSDK_SECRET = import.meta.env.VITE_VIDEOSDK_SECRET || '';

// Generate JWT token for VideoSDK
const getToken = async (): Promise<string> => {
  try {
    if (!VIDEOSDK_API_KEY || !VIDEOSDK_SECRET) {
      console.error('VideoSDK API Key or Secret not configured');
      throw new Error('VideoSDK credentials not configured');
    }

    // Create JWT payload
    const payload = {
      apikey: VIDEOSDK_API_KEY,
      permissions: ['allow_join', 'allow_mod'],
    };

    // Encode secret to Uint8Array
    const secret = new TextEncoder().encode(VIDEOSDK_SECRET);

    // Generate JWT token using jose
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    console.log('Generated VideoSDK token successfully');
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
};

// Create meeting function
const createMeeting = async (token: string): Promise<string> => {
  try {
    const response = await fetch('https://api.videosdk.live/v2/rooms', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create meeting failed:', response.status, errorText);
      throw new Error(`Failed to create meeting: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.roomId) {
      throw new Error('No roomId in response');
    }
    return data.roomId;
  } catch (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }
};

// Validate meeting function
const validateMeeting = async (token: string, meetingId: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://api.videosdk.live/v2/rooms/validate/${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return data.roomId === meetingId;
  } catch (error) {
    console.error('Error validating meeting:', error);
    return false;
  }
};

// Participant Video Component
const ParticipantView: React.FC<{ participantId: string; isLocal?: boolean }> = ({ 
  participantId, 
  isLocal = false 
}) => {
  const micRef = useRef<HTMLAudioElement>(null);
  const { webcamStream, micStream, webcamOn, micOn, isLocal: isLocalParticipant, displayName } = useParticipant(participantId);

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
        micRef.current.play().catch((error) => {
          console.error('Error playing audio:', error);
        });
      } else {
        micRef.current.srcObject = null;
      }
    }
  }, [micStream, micOn]);

  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden bg-gray-800",
      isLocal ? "w-32 h-24 absolute top-4 right-4 z-10 border-2 border-white/20" : "w-full h-full"
    )}>
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
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-white">
                {displayName?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <p className="text-white text-sm">{displayName || 'Participant'}</p>
            <VideoOff className="w-4 h-4 text-gray-400 mx-auto mt-1" />
          </div>
        </div>
      )}
      
      {/* Audio element for remote participant */}
      {!isLocal && <audio ref={micRef} autoPlay muted={isLocalParticipant} />}
      
      {/* Participant name badge */}
      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
        {!micOn && <MicOff className="w-3 h-3 text-red-400" />}
        <span>{displayName || 'Participant'}</span>
        {isLocal && <span className="text-gray-400">(You)</span>}
      </div>
    </div>
  );
};

// Meeting View Component
const MeetingView: React.FC<{
  onCallEnd: () => void;
  participantName: string;
  isHost: boolean;
}> = ({ onCallEnd, participantName, isHost }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callStartTimeRef = useRef<number>(Date.now());

  const { join, leave, toggleMic, toggleWebcam, localMicOn, localWebcamOn, participants, meetingId } = useMeeting({
    onMeetingJoined: () => {
      console.log('Meeting joined successfully');
      callStartTimeRef.current = Date.now();
    },
    onMeetingLeft: () => {
      console.log('Meeting left');
      onCallEnd();
    },
    onParticipantJoined: (participant) => {
      console.log('Participant joined:', participant.displayName);
    },
    onParticipantLeft: (participant) => {
      console.log('Participant left:', participant.displayName);
    },
    onError: (error) => {
      console.error('Meeting error:', error);
    },
  });

  // Join meeting on mount
  useEffect(() => {
    join();
    return () => {
      // Cleanup on unmount
    };
  }, []);

  // Timer for call duration
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleLeave = () => {
    leave();
    onCallEnd();
  };

  const participantIds = [...participants.keys()];
  const remoteParticipantId = participantIds.find(id => !participants.get(id)?.local);
  const localParticipantId = participantIds.find(id => participants.get(id)?.local);

  return (
    <div className={cn(
      "video-call-container bg-black text-white",
      isFullscreen ? "fixed inset-0 z-50" : "relative h-[500px] rounded-lg overflow-hidden"
    )}>
      {/* Call Status Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-green-600">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
              Connected
            </Badge>
            <span className="text-sm font-medium">{participantName}</span>
            <div className="flex items-center gap-1 text-gray-300 text-sm">
              <Users className="w-4 h-4" />
              <span>{participantIds.length}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm font-mono text-gray-300 bg-black/40 px-2 py-1 rounded">
              {formatDuration(callDuration)}
            </div>
            <div className="text-xs text-gray-400">
              Room: {meetingId}
            </div>
          </div>
        </div>
      </div>

      {/* Video Streams */}
      <div className="relative w-full h-full">
        {/* Remote Participant (Main) */}
        {remoteParticipantId ? (
          <ParticipantView participantId={remoteParticipantId} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
              <p className="text-lg text-white">Waiting for {participantName} to join...</p>
              <p className="text-sm text-gray-400 mt-2">Share the room ID with them</p>
              <div className="mt-4 bg-black/40 px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-400">Room ID</p>
                <p className="text-lg font-mono text-white">{meetingId}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Local Participant (Picture-in-Picture) */}
        {localParticipantId && (
          <ParticipantView participantId={localParticipantId} isLocal />
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-4">
        <div className="flex items-center justify-center gap-4">
          {/* Audio Control */}
          <Button
            onClick={() => toggleMic()}
            size="lg"
            variant={localMicOn ? "default" : "destructive"}
            className="rounded-full w-12 h-12 p-0"
          >
            {localMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          {/* Video Control */}
          <Button
            onClick={() => toggleWebcam()}
            size="lg"
            variant={localWebcamOn ? "default" : "destructive"}
            className="rounded-full w-12 h-12 p-0"
          >
            {localWebcamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            onClick={() => setIsFullscreen(!isFullscreen)}
            size="lg"
            variant="outline"
            className="rounded-full w-12 h-12 p-0"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>

          {/* End Call */}
          <Button
            onClick={handleLeave}
            size="lg"
            variant="destructive"
            className="rounded-full w-12 h-12 p-0 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main VideoSDK Call Component
interface VideoSDKCallProps {
  sessionId: string;
  participantName: string;
  participantRole: 'patient' | 'therapist';
  onCallEnd: () => void;
  isHost?: boolean;
  meetingId?: string; // If provided, join existing meeting; otherwise create new
}

const VideoSDKCall: React.FC<VideoSDKCallProps> = ({
  sessionId,
  participantName,
  participantRole,
  onCallEnd,
  isHost = false,
  meetingId: existingMeetingId,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(existingMeetingId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = participantRole === 'therapist' ? `Dr. ${participantName}` : participantName;

  useEffect(() => {
    const initializeMeeting = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get token
        const authToken = await getToken();
        setToken(authToken);

        if (existingMeetingId) {
          // Validate existing meeting
          const isValid = await validateMeeting(authToken, existingMeetingId);
          if (isValid) {
            setMeetingId(existingMeetingId);
          } else {
            throw new Error('Invalid meeting ID');
          }
        } else if (isHost) {
          // Create new meeting if host
          const newMeetingId = await createMeeting(authToken);
          setMeetingId(newMeetingId);
          console.log('Created new meeting:', newMeetingId);
        } else {
          throw new Error('Meeting ID required for participants');
        }
      } catch (err) {
        console.error('Error initializing meeting:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize video call');
      } finally {
        setIsLoading(false);
      }
    };

    initializeMeeting();
  }, [existingMeetingId, isHost]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Initializing video call...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait</p>
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
          <p className="text-lg mb-2">Failed to start video call</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <Button onClick={onCallEnd} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!token || !meetingId) {
    return null;
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
      token={token}
    >
      <MeetingView
        onCallEnd={onCallEnd}
        participantName={participantName}
        isHost={isHost}
      />
    </MeetingProvider>
  );
};

export default VideoSDKCall;

// Export helper functions for use in other components
export { getToken, createMeeting, validateMeeting, VIDEOSDK_API_KEY };
