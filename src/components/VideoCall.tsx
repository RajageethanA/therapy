import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  MonitorOff,
  Settings,
  MessageSquare,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoCallProps {
  sessionId: string;
  participantName: string;
  participantRole: 'patient' | 'therapist';
  onCallEnd: () => void;
  isHost?: boolean; // true for therapist, false for patient
}

interface PeerConnection {
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

const VideoCall: React.FC<VideoCallProps> = ({
  sessionId,
  participantName,
  participantRole,
  onCallEnd,
  isHost = false
}) => {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callStartTimeRef = useRef<number>(Date.now());

  // Timer for call duration
  useEffect(() => {
    const timer = setInterval(() => {
      if (callStatus === 'connected') {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus]);

  // Format call duration
  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Initialize WebRTC
  useEffect(() => {
    const initializeWebRTC = async () => {
      try {
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        });

        peerConnectionRef.current = peerConnection;

        // Add local stream to peer connection
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setCallStatus('connected');
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          switch (peerConnection.connectionState) {
            case 'connected':
              setCallStatus('connected');
              break;
            case 'disconnected':
            case 'failed':
            case 'closed':
              setCallStatus('disconnected');
              break;
          }
        };

        // Simulate connection for demo (in real app, you'd use signaling server)
        setTimeout(() => {
          setCallStatus('connected');
        }, 2000);

      } catch (error) {
        console.error('Error initializing WebRTC:', error);
        setCallStatus('disconnected');
      }
    };

    initializeWebRTC();

    return () => {
      // Cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  }, [isAudioEnabled]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        // Replace video track with screen share
        if (peerConnectionRef.current && localStreamRef.current) {
          const videoSender = peerConnectionRef.current.getSenders()
            .find(sender => sender.track && sender.track.kind === 'video');

          if (videoSender) {
            await videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream;
          }

          // Handle screen share end
          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            // Switch back to camera
            if (localStreamRef.current && videoSender) {
              videoSender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
              }
            }
          };
        }

        setIsScreenSharing(true);
      } else {
        // Switch back to camera
        if (peerConnectionRef.current && localStreamRef.current) {
          const videoSender = peerConnectionRef.current.getSenders()
            .find(sender => sender.track && sender.track.kind === 'video');

          if (videoSender) {
            await videoSender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
          }
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  }, [isScreenSharing]);

  const endCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    onCallEnd();
  }, [onCallEnd]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  return (
    <div className={cn(
      "video-call-container bg-black text-white",
      isFullscreen ? "fixed inset-0 z-50" : "relative h-96 rounded-lg overflow-hidden"
    )}>
      {/* Call Status Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge 
              variant={callStatus === 'connected' ? 'default' : 'secondary'} 
              className={cn(
                callStatus === 'connected' ? 'bg-green-600' : 'bg-yellow-600'
              )}
            >
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'connected' && 'Connected'}
              {callStatus === 'disconnected' && 'Disconnected'}
            </Badge>
            <span className="text-sm font-medium">{participantName}</span>
            <span className="text-xs text-gray-300">({participantRole})</span>
          </div>
          
          {callStatus === 'connected' && (
            <div className="text-sm font-mono text-gray-300">
              {formatDuration(callDuration)}
            </div>
          )}
        </div>
      </div>

      {/* Video Streams */}
      <div className="relative w-full h-full">
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Screen Share Indicator */}
        {isScreenSharing && (
          <div className="absolute top-4 left-4 bg-blue-600 px-3 py-1 rounded-full text-sm">
            <Monitor className="w-4 h-4 inline mr-2" />
            Screen Sharing
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4">
        <div className="flex items-center justify-center gap-4">
          {/* Audio Control */}
          <Button
            onClick={toggleAudio}
            size="lg"
            variant={isAudioEnabled ? "default" : "destructive"}
            className="rounded-full w-12 h-12 p-0"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          {/* Video Control */}
          <Button
            onClick={toggleVideo}
            size="lg"
            variant={isVideoEnabled ? "default" : "destructive"}
            className="rounded-full w-12 h-12 p-0"
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* Screen Share (only for therapist) */}
          {isHost && (
            <Button
              onClick={toggleScreenShare}
              size="lg"
              variant={isScreenSharing ? "default" : "outline"}
              className="rounded-full w-12 h-12 p-0"
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>
          )}

          {/* Fullscreen Toggle */}
          <Button
            onClick={toggleFullscreen}
            size="lg"
            variant="outline"
            className="rounded-full w-12 h-12 p-0"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>

          {/* End Call */}
          <Button
            onClick={endCall}
            size="lg"
            variant="destructive"
            className="rounded-full w-12 h-12 p-0 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Connection Status Overlay */}
      {callStatus !== 'connected' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            {callStatus === 'connecting' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg">Connecting to {participantName}...</p>
                <p className="text-sm text-gray-300 mt-2">Please wait while we establish the connection</p>
              </>
            )}
            {callStatus === 'disconnected' && (
              <>
                <PhoneOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-lg text-red-400">Call Disconnected</p>
                <p className="text-sm text-gray-300 mt-2">The connection was lost</p>
                <Button onClick={endCall} className="mt-4" variant="outline">
                  Close Call
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;