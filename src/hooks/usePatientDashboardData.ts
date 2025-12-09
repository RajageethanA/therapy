import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

type PHQ9Result = {
  id: string;
  patientId: string;
  date: string; // ISO date string
  score: number;
  riskLevel: 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe';
};

type SessionItem = {
  id: string;
  therapistId: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  status: 'upcoming' | 'completed' | 'cancelled';
  therapistName?: string;
};

type AIPlanTask = { id: string; day: number; title: string; description: string; completed: boolean };
type AIPlan = { id: string; patientId: string; week: number; tasks: AIPlanTask[] };

type TherapistLite = {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  specialization?: string[];
};

export function usePatientDashboardData(patientId?: string) {
  const [phq9, setPhq9] = useState<PHQ9Result | null>(null);
  const [nextSession, setNextSession] = useState<SessionItem | null>(null);
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [therapists, setTherapists] = useState<TherapistLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Latest PHQ9
        try {
          console.log('Fetching PHQ9 for patient:', patientId);
          const phqRef = collection(db, 'phq9Results');
          
          // Try simple query first (without ordering) in case index doesn't exist
          let phqQ = query(phqRef, where('patientId', '==', patientId));
          let phqSnap = await getDocs(phqQ);
          console.log('PHQ9 simple query result:', phqSnap.docs.length, 'documents');
          
          // If we have results, try to get the latest one manually
          let phqDoc = null;
          if (phqSnap.docs.length > 0) {
            // Sort by date manually if we have multiple
            const docs = phqSnap.docs.map(d => ({ doc: d, data: d.data() }))
              .sort((a, b) => {
                const dateA = a.data.date?.toDate ? a.data.date.toDate() : new Date(0);
                const dateB = b.data.date?.toDate ? b.data.date.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime(); // newest first
              });
            phqDoc = docs[0]?.doc;
          }
          
          if (phqDoc && !cancelled) {
            const data = phqDoc.data();
            console.log('PHQ9 document data:', data);
            setPhq9({ 
              id: phqDoc.id, 
              patientId: data.patientId,
              date: data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString(),
              score: data.score,
              riskLevel: data.riskLevel
            });
          } else {
            console.log('No PHQ9 document found');
          }
        } catch (e) {
          console.log('PHQ9 fetch error:', e);
        }

        // Upcoming sessions -> pick earliest
        try {
          const sessRef = collection(db, 'sessions');
          const sessQ = query(sessRef, where('patientId', '==', patientId), where('status', '==', 'upcoming'));
          const sessSnap = await getDocs(sessQ);
          const sessions = sessSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SessionItem[];
          const now = new Date();
          const parseDT = (s: SessionItem) => new Date(`${s.date}T${(s.time || '00:00')}:00`);
          const upcoming = sessions
            .filter(s => parseDT(s) >= now)
            .sort((a, b) => +parseDT(a) - +parseDT(b))[0] || null;
          if (!cancelled) setNextSession(upcoming);
        } catch {}

        // AI plan -> latest week for patient
        try {
          const planRef = collection(db, 'aiPlans');
          const planQ = query(planRef, where('patientId', '==', patientId), orderBy('week', 'desc'), limit(1));
          const planSnap = await getDocs(planQ);
          const planDoc = planSnap.docs[0];
          if (planDoc && !cancelled) setAiPlan({ id: planDoc.id, ...(planDoc.data() as any) });
        } catch {}

        // Suggested therapists: from users collection where role == 'therapist'
        try {
          const usersRef = collection(db, 'users');
          const tQ = query(usersRef, where('role', '==', 'therapist'), limit(6));
          const tSnap = await getDocs(tQ);
          const list = tSnap.docs.map(d => {
            const data = d.data() as any;
            const t: TherapistLite = {
              id: d.id,
              name: data.name || 'Therapist',
              avatar: data.avatar,
              rating: data.rating || 4.8,
              reviewCount: data.reviewCount || 0,
              price: data.price || 120,
              specialization: data.specializations || [],
            };
            return t;
          });
          if (!cancelled) setTherapists(list.slice(0, 3));
        } catch {}
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const completedTasks = aiPlan?.tasks?.filter(t => t.completed).length || 0;
  const totalTasks = aiPlan?.tasks?.length || 0;
  const progressPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return {
    loading,
    error,
    phq9,
    nextSession,
    aiPlan,
    therapists,
    aiPlanStats: { completedTasks, totalTasks, progressPct },
  } as const;
}
