import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';

type SessionItem = {
  id: string;
  therapistId: string;
  patientId: string;
  patientName?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  duration?: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price?: number;
  createdAt?: any;
  notes?: string;
};

type PatientInfo = {
  id: string;
  name: string;
  email?: string;
  totalSessions: number;
  lastSessionDate?: string;
  status: 'active' | 'inactive';
  avatar?: string;
};

type DashboardMetrics = {
  totalPatients: number;
  activePatients: number;
  todaySessions: SessionItem[];
  upcomingSessions: SessionItem[];
  completedSessions: SessionItem[];
  monthlyEarnings: number;
  totalEarnings: number;
  sessionCompletionRate: number;
  averageSessionPrice: number;
  patientRetentionRate: number;
  growth: number;
  recentPatients: PatientInfo[];
};

export function useTherapistDashboardData(therapistId?: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPatients: 0,
    activePatients: 0,
    todaySessions: [],
    upcomingSessions: [],
    completedSessions: [],
    monthlyEarnings: 0,
    totalEarnings: 0,
    sessionCompletionRate: 0,
    averageSessionPrice: 0,
    patientRetentionRate: 0,
    growth: 0,
    recentPatients: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!therapistId) return;
    
    setLoading(true);
    setError(null);
    
    // Set up real-time listener for sessions
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('therapistId', '==', therapistId));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const allSessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SessionItem[];

        // Get current date info
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const lastMonth = new Date(currentYear, currentMonth - 1, 1);
        
        // Filter sessions by different criteria
        const todaySessions = allSessions.filter(s => s.date === todayStr);
        const upcomingSessions = allSessions.filter(s => 
          (s.status === 'pending' || s.status === 'confirmed') && 
          new Date(s.date) >= today
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const completedSessions = allSessions.filter(s => s.status === 'completed');
        const currentMonthSessions = completedSessions.filter(s => {
          const sessionDate = new Date(s.date);
          return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
        });
        
        const lastMonthSessions = completedSessions.filter(s => {
          const sessionDate = new Date(s.date);
          return sessionDate.getMonth() === lastMonth.getMonth() && sessionDate.getFullYear() === lastMonth.getFullYear();
        });

        // Calculate metrics
        const uniquePatients = new Set(allSessions.map(s => s.patientId));
        const totalPatients = uniquePatients.size;
        
        // Active patients (had session in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activePatients = new Set(
          allSessions
            .filter(s => new Date(s.date) >= thirtyDaysAgo && s.status === 'completed')
            .map(s => s.patientId)
        ).size;

        // Calculate earnings
        const monthlyEarnings = currentMonthSessions.reduce((sum, s) => sum + (s.price || 120), 0);
        const totalEarnings = completedSessions.reduce((sum, s) => sum + (s.price || 120), 0);
        
        // Calculate completion rate
        const totalScheduled = allSessions.filter(s => s.status !== 'cancelled').length;
        const sessionCompletionRate = totalScheduled > 0 ? (completedSessions.length / totalScheduled) * 100 : 0;
        
        // Calculate average session price
        const averageSessionPrice = completedSessions.length > 0 
          ? totalEarnings / completedSessions.length 
          : 120;
          
        // Calculate growth (current month vs last month)
        const growth = lastMonthSessions.length > 0 
          ? ((currentMonthSessions.length - lastMonthSessions.length) / lastMonthSessions.length) * 100 
          : currentMonthSessions.length > 0 ? 100 : 0;

        // Get patient info
        const patientSessionCounts = new Map<string, { count: number; lastDate: string; name?: string }>();
        allSessions.forEach(session => {
          const current = patientSessionCounts.get(session.patientId) || { count: 0, lastDate: '1970-01-01' };
          patientSessionCounts.set(session.patientId, {
            count: current.count + 1,
            lastDate: session.date > current.lastDate ? session.date : current.lastDate,
            name: session.patientName || current.name
          });
        });

        // Calculate patient retention (patients with more than 1 session)
        const returningPatients = Array.from(patientSessionCounts.values()).filter(p => p.count > 1).length;
        const patientRetentionRate = totalPatients > 0 ? (returningPatients / totalPatients) * 100 : 0;

        // Recent patients (sorted by last session date)
        const recentPatients: PatientInfo[] = Array.from(patientSessionCounts.entries())
          .map(([id, data]) => ({
            id,
            name: data.name || `Patient ${id.slice(0, 8)}`,
            totalSessions: data.count,
            lastSessionDate: data.lastDate,
            status: new Date(data.lastDate) >= thirtyDaysAgo ? 'active' as const : 'inactive' as const,
            avatar: '/image.png'
          }))
          .sort((a, b) => new Date(b.lastSessionDate || '').getTime() - new Date(a.lastSessionDate || '').getTime())
          .slice(0, 10);

        setMetrics({
          totalPatients,
          activePatients,
          todaySessions,
          upcomingSessions,
          completedSessions,
          monthlyEarnings,
          totalEarnings,
          sessionCompletionRate,
          averageSessionPrice,
          patientRetentionRate,
          growth,
          recentPatients
        });
        
      } catch (e: any) {
        console.error('Error processing dashboard data:', e);
        setError(e?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Firebase listener error:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [therapistId]);

  return { 
    ...metrics,
    loading, 
    error 
  } as const;
}
