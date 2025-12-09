import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/UserContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Calendar, Clock, Video, FileText, User, Mail, Phone, Star, Award, MapPin, Activity } from 'lucide-react';
import { format } from 'date-fns';
import VideoSDKCall from '@/components/VideoSDKCall';
type Session = {
  id: string;
  patientId: string;
  therapistId: string;
  therapistName?: string;
  patientName?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  videoCallRoomId?: string;
  videoCallStatus?: 'active' | 'ended' | 'scheduled';
  meetingId?: string; // VideoSDK meeting room ID
  videoCallRequest?: {
    status: 'pending' | 'accepted' | 'declined';
    requestedAt: any;
    respondedAt?: any;
    requestedBy: string; // patient ID
  };
};

type Therapist = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  avatar?: string;
  bio?: string;
  specializations?: string[];
  experience?: string;
  education?: string;
  languages?: string[];
  rating?: number;
  reviewCount?: number;
  sessionPrice?: number;
  availability?: string;
};

export default function Sessions() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [therapists, setTherapists] = useState<Record<string, Therapist>>({});
  const [loading, setLoading] = useState(true);
  const [activeVideoCall, setActiveVideoCall] = useState<{
    sessionId: string;
    therapistName: string;
    therapistId: string;
    meetingId?: string; // VideoSDK meeting room ID
  } | null>(null);
  const [requestingVideoCall, setRequestingVideoCall] = useState<string | null>(null);
  const [roomIdInput, setRoomIdInput] = useState<Record<string, string>>({}); // Room ID input per session

  // Function to request video call
  const requestVideoCall = async (sessionId: string, therapistId: string, therapistName: string) => {
    setRequestingVideoCall(sessionId);
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        videoCallRequest: {
          status: 'pending',
          requestedAt: new Date(),
          requestedBy: user?.id
        }
      });

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? {
              ...session,
              videoCallRequest: {
                status: 'pending' as const,
                requestedAt: new Date(),
                requestedBy: user?.id || ''
              }
            }
          : session
      ));

      alert(`Video call request sent to ${therapistName}! They will receive a notification and can accept or decline your request.`);
      
    } catch (error) {
      console.error('Error requesting video call:', error);
      alert('Failed to send video call request. Please try again.');
    } finally {
      setRequestingVideoCall(null);
    }
  };

  // Function to join video call (when therapist accepts and starts the call)
  const joinVideoCall = (sessionId: string, therapistId: string, therapistName: string, meetingId: string) => {
    setActiveVideoCall({
      sessionId,
      therapistName,
      therapistId,
      meetingId, // VideoSDK meeting room ID from the session
    });
  };

  // Function to end video call
  const endVideoCall = () => {
    setActiveVideoCall(null);
  };

  useEffect(() => {
    if (!user?.id) {
      console.log('No user ID found:', user);
      return;
    }
    
    console.log('Loading sessions for patient:', user.id, user.name);
    let cancelled = false;
    
    (async () => {
      try {
        const sessionsRef = collection(db, 'sessions');
        const q = query(
          sessionsRef, 
          where('patientId', '==', user.id)
          // Removed orderBy to avoid index issues, will sort manually
        );
        
        console.log('Querying sessions with patientId:', user.id);
        const snap = await getDocs(q);
        console.log('Found', snap.docs.length, 'sessions');
        
        if (!cancelled) {
          const sessionData = snap.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() } as Session;
            console.log('Session data:', data);
            return data;
          });
          
          // Sort manually by date (newest first)
          sessionData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setSessions(sessionData);
          console.log('Processed sessions:', sessionData);

          // Fetch therapist details for all unique therapists
          const therapistIds = [...new Set(sessionData.map(s => s.therapistId))];
          console.log('Unique therapist IDs:', therapistIds);
          const therapistsData: Record<string, Therapist> = {};
          
          for (const therapistId of therapistIds) {
            try {
              console.log('Fetching therapist data for:', therapistId);
              // Use doc() to get therapist by ID directly
              const therapistDocRef = doc(db, 'users', therapistId);
              const therapistSnap = await getDoc(therapistDocRef);
              
              if (therapistSnap.exists()) {
                const therapistData = {
                  id: therapistSnap.id,
                  ...therapistSnap.data()
                } as Therapist;
                therapistsData[therapistId] = therapistData;
                console.log('Found therapist:', therapistData);
              } else {
                console.warn(`Therapist ${therapistId} not found`);
              }
            } catch (e) {
              console.error('Error fetching therapist:', therapistId, e);
            }
          }
          
          console.log('All therapists data:', therapistsData);
          setTherapists(therapistsData);
        }
      } catch (e) {
        console.error('Error loading sessions:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const upcomingSessions = sessions.filter(s => s.status === 'pending' || s.status === 'confirmed');
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Confirmation</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Sessions</h1>
          <p className="text-muted-foreground text-lg">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">My Sessions</h1>
        <p className="text-muted-foreground text-lg">Manage your therapy appointments</p>
      </div>

      {/* Upcoming Sessions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Upcoming Sessions</h2>
        <div className="space-y-4">
          {upcomingSessions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No upcoming sessions scheduled.</p>
              </CardContent>
            </Card>
          ) : (
            upcomingSessions.map((session, index) => {
              const therapist = therapists[session.therapistId];
              const isConfirmed = session.status === 'confirmed';
              
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`glass-card hover-lift ${isConfirmed ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-6">
                        {/* Therapist Avatar */}
                        <div className="relative">
                          <img
                            src={therapist?.avatar || "/image.png"}
                            alt={therapist?.name || 'Therapist'}
                            className={`w-20 h-20 rounded-full border-2 ${isConfirmed ? 'border-green-500/50' : 'border-yellow-500/50'}`}
                          />
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${isConfirmed ? 'bg-green-500' : 'bg-yellow-500'} rounded-full flex items-center justify-center`}>
                            {isConfirmed ? (
                              <Video className="w-3 h-3 text-white" />
                            ) : (
                              <Clock className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          {/* Therapist Header */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-2xl font-bold">
                                {session.therapistName || therapist?.name || 'Your Therapist'}
                              </h3>
                              {getStatusBadge(session.status)}
                            </div>
                            
                            {/* Therapist Details Grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                              {therapist?.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-blue-500" />
                                  <span className="text-muted-foreground">{therapist.email}</span>
                                </div>
                              )}
                              {therapist?.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-green-500" />
                                  <span className="text-muted-foreground">{therapist.phone}</span>
                                </div>
                              )}
                              {therapist?.rating && (
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4 text-yellow-500" />
                                  <span className="text-muted-foreground">{therapist.rating} ({therapist.reviewCount || 0} reviews)</span>
                                </div>
                              )}
                              {therapist?.experience && (
                                <div className="flex items-center gap-2">
                                  <Award className="w-4 h-4 text-purple-500" />
                                  <span className="text-muted-foreground">{therapist.experience} experience</span>
                                </div>
                              )}
                            </div>

                            {/* Therapist Specializations */}
                            {therapist?.specializations && therapist.specializations.length > 0 && (
                              <div className="mb-4">
                                <div className="flex flex-wrap gap-1">
                                  {therapist.specializations.slice(0, 3).map((spec, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {spec}
                                    </Badge>
                                  ))}
                                  {therapist.specializations.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{therapist.specializations.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Therapist Bio */}
                            {therapist?.bio && (
                              <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  About Your Therapist
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {therapist.bio}
                                </p>
                              </div>
                            )}
                            
                            {/* Session Details */}
                            <div className="flex gap-4 text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="font-medium">{format(new Date(session.date), 'PPP')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                <span className="font-medium">{session.time}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-2">
                            {session.status === 'confirmed' && (
                              <>
                                {/* Video Call Request Logic */}
                                {!session.videoCallRequest ? (
                                  // No request sent yet - show request button
                                  <Button 
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    disabled={requestingVideoCall === session.id}
                                    onClick={() => requestVideoCall(
                                      session.id, 
                                      session.therapistId, 
                                      session.therapistName || therapists[session.therapistId]?.name || 'Therapist'
                                    )}
                                  >
                                    <Video className="w-4 h-4 mr-2" />
                                    {requestingVideoCall === session.id ? 'Requesting...' : 'Request Video Call'}
                                  </Button>
                                ) : session.videoCallRequest.status === 'pending' ? (
                                  // Request pending - check if 5 minutes have passed
                                  (() => {
                                    const requestedAt = session.videoCallRequest.requestedAt?.toDate?.() || new Date(session.videoCallRequest.requestedAt);
                                    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                                    const canRequestAgain = requestedAt < fiveMinutesAgo;
                                    
                                    return canRequestAgain ? (
                                      // 5 minutes passed - allow new request
                                      <Button 
                                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                                        disabled={requestingVideoCall === session.id}
                                        onClick={() => requestVideoCall(
                                          session.id, 
                                          session.therapistId, 
                                          session.therapistName || therapists[session.therapistId]?.name || 'Therapist'
                                        )}
                                      >
                                        <Video className="w-4 h-4 mr-2" />
                                        {requestingVideoCall === session.id ? 'Requesting...' : 'Request Video Call Again'}
                                      </Button>
                                    ) : (
                                      // Still waiting - show waiting state
                                      <Button variant="outline" className="flex-1" disabled>
                                        <Clock className="w-4 h-4 mr-2" />
                                        Video Call Requested - Awaiting Therapist
                                      </Button>
                                    );
                                  })()
                                ) : session.videoCallRequest.status === 'accepted' && session.videoCallStatus === 'active' ? (
                                  // Request accepted and call is active - show room ID input and join button
                                  <div className="flex-1 flex flex-col gap-2">
                                    {session.meetingId || session.videoCallRoomId ? (
                                      // Room ID available from Firebase - auto join
                                      <>
                                        <Button 
                                          className="w-full bg-green-600 hover:bg-green-700"
                                          onClick={() => joinVideoCall(
                                            session.id, 
                                            session.therapistId, 
                                            session.therapistName || therapists[session.therapistId]?.name || 'Therapist',
                                            session.meetingId || session.videoCallRoomId || ''
                                          )}
                                        >
                                          <Video className="w-4 h-4 mr-2" />
                                          Join Video Session
                                        </Button>
                                        <p className="text-xs text-muted-foreground text-center">
                                          Room ID: <span className="font-mono font-bold">{session.meetingId || session.videoCallRoomId}</span>
                                        </p>
                                      </>
                                    ) : (
                                      // No Room ID in Firebase - need manual entry
                                      <>
                                        <div className="flex gap-2">
                                          <Input
                                            placeholder="Enter Room ID from Therapist"
                                            value={roomIdInput[session.id] || ''}
                                            onChange={(e) => setRoomIdInput(prev => ({
                                              ...prev,
                                              [session.id]: e.target.value
                                            }))}
                                            className="flex-1"
                                          />
                                          <Button 
                                            className="bg-green-600 hover:bg-green-700"
                                            disabled={!roomIdInput[session.id]}
                                            onClick={() => joinVideoCall(
                                              session.id, 
                                              session.therapistId, 
                                              session.therapistName || therapists[session.therapistId]?.name || 'Therapist',
                                              roomIdInput[session.id] || ''
                                            )}
                                          >
                                            <Video className="w-4 h-4 mr-2" />
                                            Join
                                          </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          Ask your therapist for the Room ID to join the video call
                                        </p>
                                      </>
                                    )}
                                  </div>
                                ) : session.videoCallRequest.status === 'declined' ? (
                                  // Request declined - allow new request
                                  <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => requestVideoCall(
                                      session.id, 
                                      session.therapistId, 
                                      session.therapistName || therapists[session.therapistId]?.name || 'Therapist'
                                    )}
                                  >
                                    <Video className="w-4 h-4 mr-2" />
                                    Request Video Call Again
                                  </Button>
                                ) : session.videoCallRequest.status === 'accepted' ? (
                                  // Request accepted - show room ID input to join
                                  <div className="flex-1 flex flex-col gap-2">
                                    {session.meetingId || session.videoCallRoomId ? (
                                      // Room ID available from Firebase - auto join
                                      <>
                                        <Button 
                                          className="w-full bg-green-600 hover:bg-green-700"
                                          onClick={() => joinVideoCall(
                                            session.id, 
                                            session.therapistId, 
                                            session.therapistName || therapists[session.therapistId]?.name || 'Therapist',
                                            session.meetingId || session.videoCallRoomId || ''
                                          )}
                                        >
                                          <Video className="w-4 h-4 mr-2" />
                                          Join Video Session
                                        </Button>
                                        <p className="text-xs text-muted-foreground text-center">
                                          ✅ Room ID: <span className="font-mono font-bold">{session.meetingId || session.videoCallRoomId}</span>
                                        </p>
                                      </>
                                    ) : (
                                      // No Room ID in Firebase - need manual entry
                                      <>
                                        <div className="flex gap-2">
                                          <Input
                                            placeholder="Enter Room ID from Therapist"
                                            value={roomIdInput[session.id] || ''}
                                            onChange={(e) => setRoomIdInput(prev => ({
                                              ...prev,
                                              [session.id]: e.target.value
                                            }))}
                                            className="flex-1"
                                          />
                                          <Button 
                                            className="bg-green-600 hover:bg-green-700"
                                            disabled={!roomIdInput[session.id]}
                                            onClick={() => joinVideoCall(
                                              session.id, 
                                              session.therapistId, 
                                              session.therapistName || therapists[session.therapistId]?.name || 'Therapist',
                                              roomIdInput[session.id] || ''
                                            )}
                                          >
                                            <Video className="w-4 h-4 mr-2" />
                                            Join
                                          </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          ✅ Call approved! Enter the Room ID shared by your therapist to join.
                                        </p>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  // Unknown state - allow new request
                                  <Button 
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => requestVideoCall(
                                      session.id, 
                                      session.therapistId, 
                                      session.therapistName || therapists[session.therapistId]?.name || 'Therapist'
                                    )}
                                  >
                                    <Video className="w-4 h-4 mr-2" />
                                    Request Video Call
                                  </Button>
                                )}
                              </>
                            )}
                            {session.status === 'pending' && (
                              <Button variant="outline" className="flex-1" disabled>
                                <Clock className="w-4 h-4 mr-2" />
                                Awaiting Therapist Confirmation
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Mail className="w-4 h-4 mr-2" />
                              Message
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Past Sessions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Past Sessions</h2>
        <div className="space-y-4">
          {pastSessions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No past sessions found.</p>
              </CardContent>
            </Card>
          ) : (
            pastSessions.map((session, index) => {
              const therapist = therapists[session.therapistId];
              
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-card">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-6">
                        {/* Therapist Avatar */}
                        <div className="relative">
                          <img
                            src={therapist?.avatar || "/image.png"}
                            alt={therapist?.name || 'Therapist'}
                            className="w-16 h-16 rounded-full border-2 border-muted/30"
                          />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <FileText className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          {/* Therapist Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-semibold">
                                  {session.therapistName || therapist?.name || 'Your Therapist'}
                                </h3>
                                {getStatusBadge(session.status)}
                              </div>
                              
                              {/* Therapist Quick Info */}
                              {therapist && (
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {therapist.rating && (
                                    <div className="flex items-center gap-1">
                                      <Star className="w-4 h-4 text-yellow-500" />
                                      <span>{therapist.rating}</span>
                                    </div>
                                  )}
                                  {therapist.specializations && therapist.specializations[0] && (
                                    <div className="flex items-center gap-1">
                                      <Award className="w-4 h-4 text-purple-500" />
                                      <span>{therapist.specializations[0]}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Session Status</div>
                            </div>
                          </div>
                          
                          {/* Session Details */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>{format(new Date(session.date), 'PPP')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{session.time}</span>
                            </div>
                          </div>
                          
                          {/* Session Notes */}
                          {session.notes && (
                            <div className="pt-2 p-3 bg-muted/30 rounded-lg border-l-4 border-blue-500/20">
                              <div className="flex items-start gap-2 text-sm">
                                <FileText className="w-4 h-4 mt-0.5 text-blue-500" />
                                <div>
                                  <div className="font-medium text-sm mb-1 text-blue-600">Session Notes from {therapist?.name || 'Your Therapist'}</div>
                                  <p className="text-muted-foreground">{session.notes}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Video Call History */}
                          {session.videoCallRoomId && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <Video className="w-4 h-4" />
                                <span className="font-medium">Video session completed</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            {session.status === 'completed' && (
                              <>
                                <Button variant="outline" size="sm" className="flex-1">
                                  <FileText className="w-4 h-4 mr-2" />
                                  View Session Summary
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Star className="w-4 h-4 mr-2" />
                                  Rate Session
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* VideoSDK Call Component - Render when call is active */}
      {activeVideoCall && activeVideoCall.meetingId && (
        <div className="fixed inset-0 z-50 bg-black">
          <VideoSDKCall
            sessionId={activeVideoCall.sessionId}
            participantName={activeVideoCall.therapistName}
            participantRole="therapist"
            onCallEnd={endVideoCall}
            isHost={false}
            meetingId={activeVideoCall.meetingId}
          />
        </div>
      )}
    </div>
  );
}