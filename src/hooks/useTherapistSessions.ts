import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

export type TherapistSession = {
  id: string;
  therapistId: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  duration?: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
};

export function useTherapistSessions(therapistId?: string) {
  const [sessions, setSessions] = useState<TherapistSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!therapistId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ref = collection(db, 'sessions');
        const qy = query(ref, where('therapistId', '==', therapistId), orderBy('date', 'desc'));
        const snap = await getDocs(qy);
        if (!cancelled) setSessions(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as TherapistSession[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load sessions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [therapistId]);

  return { sessions, loading, error } as const;
}
