import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/contexts/UserContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { FileText, Calendar, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

type Session = {
  id: string;
  patientId: string;
  therapistId: string;
  patientName?: string;
  therapistName?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  notes?: string;
};

export default function TherapistSessions() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const sessionsRef = collection(db, 'sessions');
        const q = query(
          sessionsRef, 
          where('therapistId', '==', user.id), 
          orderBy('date', 'desc')
        );
        const snap = await getDocs(q);
        if (!cancelled) {
          const sessionData = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Session[];
          setSessions(sessionData);
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
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      
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

  const pendingSessions = sessions.filter(s => s.status === 'pending');
  const upcomingSessions = sessions.filter(s => s.status === 'confirmed');
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

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
          <p className="text-muted-foreground text-lg">Loading sessions...</p>
        </div>
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
            {pendingSessions.map((session) => (
              <Card key={session.id} className="glass-card border-yellow-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-lg">{session.patientName || `Patient ${session.patientId}`}</p>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(session.date), 'PPP')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{session.time}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={updating === session.id}
                          onClick={() => updateSessionStatus(session.id, 'confirmed')}
                        >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updating === session.id}
                        onClick={() => updateSessionStatus(session.id, 'cancelled')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Confirmed Sessions */}
      {upcomingSessions.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Upcoming Sessions ({upcomingSessions.length})</h2>
          <div className="space-y-4">
            {upcomingSessions.map((session) => (
              <Card key={session.id} className="glass-card border-green-500/20">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div>
                          <p className="font-semibold text-lg">{session.patientName || `Patient ${session.patientId}`}</p>
                          {getStatusBadge(session.status)}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(session.date), 'PPP')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{session.time}</span>
                          </div>
                        </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updating === session.id}
                        onClick={() => updateSessionStatus(session.id, 'completed')}
                      >
                        Mark Complete
                      </Button>
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
            ))}
          </div>
        </div>
      )}

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
            pastSessions.map((session) => (
              <Card key={session.id} className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-lg">{session.patientName || `Patient ${session.patientId}`}</p>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(session.date), 'PPP')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{session.time}</span>
                        </div>
                      </div>
                      <div></div>
                    </div>
                  </div>
                  
                  {session.notes && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <p className="text-muted-foreground">{session.notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}