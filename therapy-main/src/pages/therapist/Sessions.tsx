import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/contexts/UserContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { FileText, Calendar, Clock, CheckCircle, XCircle, MessageSquare, User, Mail, Phone, Calendar as BirthdayIcon, MapPin, Activity, Video, VideoOff, Copy } from 'lucide-react';
import { format } from 'date-fns';
import VideoSDKCall, { createMeeting, getAuthToken } from '@/components/VideoSDKCall';

type Session = {
  id: string;
  patientId: string;
  therapistId: string;
  patientName?: string;
  therapistName?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: any;
  slotId?: string;
  videoCallRoomId?: string;
  videoCallStarted?: any;
  videoCallEnded?: any;
  videoCallStatus?: 'active' | 'ended' | 'scheduled';
  videoCallRequest?: {
    status: 'pending' | 'accepted' | 'declined';
    requestedAt: any;
    respondedAt?: any;
    requestedBy: string; // patient ID
  };
};

type Patient = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  role?: string;
  avatar?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  currentMedication?: string;
  preferences?: string[];
  joinedAt?: any;
  lastSession?: string;
};

export default function TherapistSessions() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [loading, setLoading] = useState(true);
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeVideoCall, setActiveVideoCall] = useState<{
    sessionId: string;
    patientName: string;
    patientId: string;
    meetingId?: string; // VideoSDK meeting room ID
  } | null>(null);
  const [videoCallLoading, setVideoCallLoading] = useState<string | null>(null);

  // Function to respond to video call request
  const respondToVideoCallRequest = async (sessionId: string, response: 'accepted' | 'declined', patientId: string, patientName: string) => {
    setVideoCallLoading(sessionId);
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        'videoCallRequest.status': response,
        'videoCallRequest.respondedAt': new Date()
      });

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? {
              ...session,
              videoCallRequest: session.videoCallRequest ? {
                ...session.videoCallRequest,
                status: response,
                respondedAt: new Date()
              } : undefined
            }
          : session
      ));

      if (response === 'accepted') {
        // Automatically start the video call when accepted
        setTimeout(() => {
          startVideoCall(sessionId, patientId, patientName);
        }, 500);
      } else {
        alert(`Video call request declined for ${patientName}.`);
      }
      
    } catch (error) {
      console.error('Error responding to video call request:', error);
      alert('Failed to respond to video call request. Please try again.');
    } finally {
      setVideoCallLoading(null);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      console.log('No user ID found:', user);
      return;
    }
    
    console.log('Loading sessions for therapist:', user.id, user.name);
    let cancelled = false;
    
    (async () => {
      try {
        const sessionsRef = collection(db, 'sessions');
        const q = query(
          sessionsRef, 
          where('therapistId', '==', user.id)
          // Removed orderBy to avoid index issues, will sort manually
        );
        
        console.log('Querying sessions with therapistId:', user.id);
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

          // Fetch patient details for all unique patients
          const patientIds = [...new Set(sessionData.map(s => s.patientId))];
          console.log('Unique patient IDs:', patientIds);
          const patientsData: Record<string, Patient> = {};
          
          for (const patientId of patientIds) {
            try {
              console.log('Fetching patient data for:', patientId);
              // Use doc() to get patient by ID directly
              const patientDocRef = doc(db, 'users', patientId);
              const patientSnap = await getDoc(patientDocRef);
              
              if (patientSnap.exists()) {
                const patientData = {
                  id: patientSnap.id,
                  ...patientSnap.data()
                } as Patient;
                patientsData[patientId] = patientData;
                console.log('Found patient:', patientData);
              } else {
                console.warn(`Patient ${patientId} not found`);
              }
            } catch (e) {
              console.error('Error fetching patient:', patientId, e);
            }
          }
          
          console.log('All patients data:', patientsData);
          setPatients(patientsData);
        }
      } catch (e) {
        console.error('Error loading sessions:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const updateSessionStatus = async (sessionId: string, newStatus: 'confirmed' | 'completed' | 'cancelled') => {
    setUpdating(sessionId);
    try {
      const session = sessions.find(s => s.id === sessionId);
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // If session is cancelled, make the slot available again
      if (newStatus === 'cancelled' && session?.slotId) {
        try {
          const slotRef = doc(db, 'therapistSlots', session.slotId);
          await updateDoc(slotRef, {
            isBooked: false,
            bookedBy: null,
            bookedAt: null,
          });
        } catch (e) {
          console.error('Error updating slot availability:', e);
        }
      }
      
      // Update local state
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: newStatus } : s
      ));
      
      if (newStatus === 'completed' && sessionNotes[sessionId]) {
        // Save session notes
        await addDoc(collection(db, 'sessionNotes'), {
          sessionId,
          therapistId: user.id,
          patientId: sessions.find(s => s.id === sessionId)?.patientId,
          content: sessionNotes[sessionId],
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('Error updating session:', e);
      alert('Failed to update session status');
    } finally {
      setUpdating(null);
    }
  };

  const startVideoCall = async (sessionId: string, patientId: string, patientName: string) => {
    setVideoCallLoading(sessionId);
    try {
      // Get token and create VideoSDK meeting room
      const token = await getAuthToken();
      const meetingId = await createMeeting({ token });
      
      if (!meetingId) {
        throw new Error('Failed to create meeting room');
      }
      
      // Update session with video call info including the VideoSDK room ID
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        videoCallStarted: serverTimestamp(),
        videoCallStatus: 'active',
        videoCallRoomId: meetingId, // Store VideoSDK room ID for patient to join
        meetingId: meetingId, // Also store as meetingId for consistency
      });

      // Update local sessions state with the new room ID
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, videoCallStatus: 'active', videoCallRoomId: meetingId, meetingId: meetingId }
          : s
      ));

      // Set active video call with all needed info
      setActiveVideoCall({
        sessionId,
        patientName,
        patientId,
        meetingId, // Include the VideoSDK meeting ID
      });
      
    } catch (error) {
      console.error('Error starting video call:', error);
      alert('Failed to start video call. Please try again.');
    } finally {
      setVideoCallLoading(null);
    }
  };

  const endVideoCall = async () => {
    if (!activeVideoCall) return;
    
    setVideoCallLoading(activeVideoCall.sessionId);
    try {
      // Update session to mark video call as ended
      const sessionRef = doc(db, 'sessions', activeVideoCall.sessionId);
      await updateDoc(sessionRef, {
        videoCallEnded: serverTimestamp(),
        videoCallStatus: 'ended',
      });

      setActiveVideoCall(null);
      
    } catch (error) {
      console.error('Error ending video call:', error);
      alert('Failed to end video call properly.');
    } finally {
      setVideoCallLoading(null);
    }
  };

  const pendingSessions = sessions.filter(s => s.status === 'pending');
  const upcomingSessions = sessions.filter(s => s.status === 'confirmed');
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

  // Debug session categorization
  console.log('Session categorization:', {
    total: sessions.length,
    pending: pendingSessions.length,
    upcoming: upcomingSessions.length,
    past: pastSessions.length,
    sessionStatuses: sessions.map(s => ({ id: s.id, status: s.status }))
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Needs Confirmation</Badge>;
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
          <h1 className="text-4xl font-bold mb-2">Session Management</h1>
          <p className="text-muted-foreground text-lg">Loading your sessions...</p>
        </div>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Fetching session data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Session Management</h1>
          <p className="text-muted-foreground text-lg">Please log in to view your sessions</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Session Management</h1>
          <p className="text-muted-foreground text-lg">View and manage all your sessions</p>
        </div>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Sessions Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't received any session bookings yet. Patients will be able to book sessions with you through your available time slots.
              </p>
              <div className="space-y-2">
                <Button variant="outline" onClick={() => window.location.href = '/therapist/slots'}>
                  Manage Your Availability
                </Button>
                {/* Debug info */}
                <div className="mt-4 p-4 bg-muted/30 rounded text-sm text-left">
                  <div className="font-medium mb-2">Debug Information:</div>
                  <div>Therapist ID: {user.id}</div>
                  <div>User Name: {user.name}</div>
                  <div>Total Sessions Found: {sessions.length}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    If patients have booked sessions but they're not showing, check the console for query errors.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Session Management</h1>
        <p className="text-muted-foreground text-lg">View and manage all your sessions</p>
      </div>

      {/* Pending Confirmations */}
      {pendingSessions.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Pending Confirmations ({pendingSessions.length})</h2>
          <div className="space-y-4">
            {pendingSessions.map((session) => {
              const patient = patients[session.patientId];
              return (
                <Card key={session.id} className="glass-card border-yellow-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-4">
                        {/* Patient Info Section */}
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <img
                              src={patient?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.patientName || patient?.name || session.patientId}`}
                              alt={patient?.name || 'Patient'}
                              className="w-16 h-16 rounded-full border-2 border-yellow-500/30"
                            />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                              <Clock className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-bold text-xl">
                                {session.patientName || patient?.name || `Patient ${session.patientId.slice(-4)}`}
                              </p>
                              {getStatusBadge(session.status)}
                            </div>
                            
                            {/* Patient Details Grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                              {patient?.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-blue-500" />
                                  <span className="text-muted-foreground">{patient.email}</span>
                                </div>
                              )}
                              {patient?.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-green-500" />
                                  <span className="text-muted-foreground">{patient.phone}</span>
                                </div>
                              )}
                              {patient?.age && (
                                <div className="flex items-center gap-2">
                                  <BirthdayIcon className="w-4 h-4 text-purple-500" />
                                  <span className="text-muted-foreground">Age: {patient.age}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-muted-foreground">ID: {session.patientId.slice(-8)}</span>
                              </div>
                            </div>

                            {/* Additional Patient Info */}
                            {patient && (patient.emergencyContact || patient.currentMedication || patient.preferences?.length) && (
                              <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <Activity className="w-4 h-4" />
                                  Patient Information
                                </h4>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  {patient.emergencyContact && (
                                    <div><strong>Emergency:</strong> {patient.emergencyContact}</div>
                                  )}
                                  {patient.currentMedication && (
                                    <div><strong>Medication:</strong> {patient.currentMedication}</div>
                                  )}
                                  {patient.preferences && patient.preferences.length > 0 && (
                                    <div><strong>Preferences:</strong> {patient.preferences.join(', ')}</div>
                                  )}
                                </div>
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
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          disabled={updating === session.id}
                          onClick={() => updateSessionStatus(session.id, 'confirmed')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept Booking
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updating === session.id}
                          onClick={() => updateSessionStatus(session.id, 'cancelled')}
                          className="border-red-500 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Confirmed Sessions */}
      {upcomingSessions.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Upcoming Sessions ({upcomingSessions.length})</h2>
          <div className="space-y-4">
            {upcomingSessions.map((session) => {
              const patient = patients[session.patientId];
              const isVideoCallActive = activeVideoCall?.sessionId === session.id || session.videoCallStatus === 'active';
              
              return (
                <Card key={session.id} className={`glass-card border-green-500/20 ${isVideoCallActive ? 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20' : ''}`}>
                  <CardContent className="pt-6">
                    {/* Video Call Status Indicator */}
                    {isVideoCallActive && (
                      <div className="mb-4 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <Video className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-600">Video call active</span>
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <img
                            src={patient?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.patientName || patient?.name || session.patientId}`}
                            alt={patient?.name || 'Patient'}
                            className="w-16 h-16 rounded-full border-2 border-green-500/30"
                          />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-bold text-xl">
                                  {session.patientName || patient?.name || `Patient ${session.patientId.slice(-4)}`}
                                </p>
                                {getStatusBadge(session.status)}
                              </div>
                              
                              {/* Patient Details Grid */}
                              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                {patient?.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-blue-500" />
                                    <span className="text-muted-foreground">{patient.email}</span>
                                  </div>
                                )}
                                {patient?.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-green-500" />
                                    <span className="text-muted-foreground">{patient.phone}</span>
                                  </div>
                                )}
                                {patient?.age && (
                                  <div className="flex items-center gap-2">
                                    <BirthdayIcon className="w-4 h-4 text-purple-500" />
                                    <span className="text-muted-foreground">Age: {patient.age}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-500" />
                                  <span className="text-muted-foreground">ID: {session.patientId.slice(-8)}</span>
                                </div>
                              </div>

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

                              {/* Additional Patient Info for Confirmed Sessions */}
                              {patient && (patient.emergencyContact || patient.currentMedication || patient.medicalHistory) && (
                                <div className="mt-4 p-3 bg-muted/30 rounded-lg border">
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Medical Information
                                  </h4>
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    {patient.emergencyContact && (
                                      <div><strong>Emergency Contact:</strong> {patient.emergencyContact}</div>
                                    )}
                                    {patient.currentMedication && (
                                      <div><strong>Current Medication:</strong> {patient.currentMedication}</div>
                                    )}
                                    {patient.medicalHistory && (
                                      <div><strong>Medical History:</strong> {patient.medicalHistory}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Video Call Request Notification */}
                            {session.videoCallRequest?.status === 'pending' && (
                              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium text-yellow-800">
                                      Video call requested by {session.patientName || patient?.name}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      disabled={videoCallLoading === session.id}
                                      onClick={() => respondToVideoCallRequest(
                                        session.id, 
                                        'accepted', 
                                        session.patientId, 
                                        session.patientName || patient?.name || 'Patient'
                                      )}
                                      className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1"
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={videoCallLoading === session.id}
                                      onClick={() => respondToVideoCallRequest(session.id, 'declined', session.patientId, '')}
                                      className="text-xs px-3 py-1"
                                    >
                                      Decline
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 mt-4">
                              {/* Video Call Button */}
                              {activeVideoCall?.sessionId === session.id ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={videoCallLoading === session.id}
                                  onClick={() => endVideoCall()}
                                  className="flex-1"
                                >
                                  <VideoOff className="w-4 h-4 mr-2" />
                                  {videoCallLoading === session.id ? 'Ending...' : 'End Call'}
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  disabled={
                                    videoCallLoading === session.id || 
                                    updating === session.id ||
                                    session.videoCallRequest?.status === 'pending' // Disable if request is pending
                                  }
                                  onClick={() => startVideoCall(session.id, session.patientId, session.patientName || patient?.name || 'Patient')}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                  <Video className="w-4 h-4 mr-2" />
                                  {videoCallLoading === session.id ? 'Starting...' : 
                                   session.videoCallRequest?.status === 'pending' ? 'Respond to Request First' :
                                   'Start Video Call'}
                                </Button>
                              )}
                              
                              {/* Mark Complete Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updating === session.id || videoCallLoading === session.id}
                                onClick={() => updateSessionStatus(session.id, 'completed')}
                                className="flex-1"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {updating === session.id ? 'Updating...' : 'Mark Complete'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    
                      {/* Notes for completion */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Session Notes
                        </label>
                        <Textarea
                          placeholder="Add notes about this session..."
                          value={sessionNotes[session.id] || ''}
                          onChange={(e) => setSessionNotes(prev => ({ ...prev, [session.id]: e.target.value }))}
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
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
            pastSessions.map((session) => {
              const patient = patients[session.patientId];
              return (
                <Card key={session.id} className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={patient?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.patientName || patient?.name || session.patientId}`}
                          alt={patient?.name || 'Patient'}
                          className="w-12 h-12 rounded-full border-2 border-muted/30"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-lg">
                                {session.patientName || patient?.name || `Patient ${session.patientId.slice(-4)}`}
                              </p>
                              {getStatusBadge(session.status)}
                            </div>
                            
                            {patient && (
                              <div className="text-sm text-muted-foreground">
                                {patient.email && <span>{patient.email}</span>}
                                {patient.email && patient.phone && <span> • </span>}
                                {patient.phone && <span>{patient.phone}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(session.date), 'PPP')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{session.time}</span>
                          </div>
                        </div>
                        
                        {session.notes && (
                          <div className="mt-3 p-3 bg-muted/30 rounded-lg border-l-4 border-primary/20">
                            <div className="flex items-start gap-2 text-sm">
                              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-sm mb-1">Session Notes</div>
                                <p className="text-muted-foreground">{session.notes}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Video Call History */}
                        {session.videoCallRoomId && (
                          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-start gap-2 text-sm">
                              <Video className="w-4 h-4 mt-0.5 text-blue-500" />
                              <div>
                                <div className="font-medium text-sm mb-1 text-blue-600">Video Session Conducted</div>
                                <div className="text-xs text-muted-foreground">
                                  <div>Room ID: {session.videoCallRoomId}</div>
                                  {session.videoCallStarted && (
                                    <div>Started: {new Date(session.videoCallStarted.seconds * 1000).toLocaleString()}</div>
                                  )}
                                  {session.videoCallEnded && (
                                    <div>Ended: {new Date(session.videoCallEnded.seconds * 1000).toLocaleString()}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* VideoSDK Call Component - Render when call is active */}
      {activeVideoCall && (
        <div className="fixed inset-0 z-50 bg-black">
          <VideoSDKCall
            sessionId={activeVideoCall.sessionId}
            participantName={activeVideoCall.patientName}
            participantRole="patient"
            onCallEnd={endVideoCall}
            isHost={true}
            meetingId={activeVideoCall.meetingId}
          />
        </div>
      )}
    </div>
  );
}