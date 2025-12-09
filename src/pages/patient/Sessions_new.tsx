import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/contexts/UserContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Calendar, Clock, Video, FileText } from 'lucide-react';
import { format } from 'date-fns';

type Session = {
  id: string;
  patientId: string;
  therapistId: string;
  therapistName?: string;
  patientName?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  notes?: string;
};

export default function Sessions() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const sessionsRef = collection(db, 'sessions');
        const q = query(
          sessionsRef, 
          where('patientId', '==', user.id), 
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
            upcomingSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card hover-lift">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary">
                          {session.therapistName?.charAt(0) || 'T'}
                        </span>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{session.therapistName || 'Therapist'}</h3>
                          {getStatusBadge(session.status)}
                        </div>
                        
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
                        
                        <div className="flex items-center justify-between pt-3">
                          <div className="flex gap-2">
                            {session.status === 'confirmed' && (
                              <Button size="sm">
                                <Video className="w-4 h-4 mr-2" />
                                Join Session
                              </Button>
                            )}
                            {session.status === 'pending' && (
                              <Button variant="outline" size="sm" disabled>
                                Awaiting Confirmation
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
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
            pastSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                        <span className="text-lg font-semibold text-muted-foreground">
                          {session.therapistName?.charAt(0) || 'T'}
                        </span>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{session.therapistName || 'Therapist'}</h3>
                          {getStatusBadge(session.status)}
                        </div>
                        
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
                        
                        {session.notes && (
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-sm text-muted-foreground">
                              <FileText className="w-4 h-4 inline mr-1" />
                              Session Notes: {session.notes}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-3">
                          {session.status === 'completed' && (
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4 mr-2" />
                              View Notes
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}