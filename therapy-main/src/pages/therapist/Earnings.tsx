import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

type CompletedSession = { id: string; therapistId: string; price?: number; date: string };

export default function TherapistEarnings() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<CompletedSession[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ref = collection(db, 'sessions');
      const qy = query(ref, where('therapistId', '==', user.id), where('status', '==', 'completed'));
      const snap = await getDocs(qy);
      if (!cancelled) setSessions(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const total = useMemo(() => sessions.reduce((sum, s) => sum + (s.price ?? 120), 0), [sessions]);
  const recent = sessions.slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Earnings</h1>
        <p className="text-muted-foreground text-lg">Your completed session revenue</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Total Earnings</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${total.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Completed Sessions</CardTitle>
            <CardDescription>Count</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Avg per Session</CardTitle>
            <CardDescription>Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${sessions.length ? Math.round(total / sessions.length) : 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Last 10 completed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recent.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                <div className="text-sm text-muted-foreground">{s.date}</div>
                <div className="font-semibold">${(s.price ?? 120).toFixed(2)}</div>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No completed sessions yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
