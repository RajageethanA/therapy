import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { formatDateForFirestore } from '@/lib/utils';

export type SlotDoc = {
  id: string;
  therapistId: string;
  date: string; // YYYY-MM-DD
  timeRange: string; // "HH:mm - HH:mm"
  isBooked: boolean;
  bookedBy?: string;
  bookedAt?: any;
};

export function useTherapistSlots(therapistId?: string, date?: Date) {
  const [slots, setSlots] = useState<SlotDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use utility function for consistent date formatting
  const ymd = date ? formatDateForFirestore(date) : undefined;

  useEffect(() => {
    if (!therapistId || !ymd) {
      console.log('useTherapistSlots: Missing data', { therapistId, ymd, originalDate: date });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Loading slots for therapist:', therapistId, 'date:', ymd, 'original date object:', date);
        const col = collection(db, 'therapistSlots');
        const qy = query(col, where('therapistId', '==', therapistId), where('date', '==', ymd));
        const snap = await getDocs(qy);
        console.log('Raw slot docs:', snap.docs.map(d => ({ id: d.id, ...d.data() })));
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SlotDoc[];
        // Sort manually since we removed orderBy to avoid index requirement
        list.sort((a, b) => a.timeRange.localeCompare(b.timeRange));
        console.log('Processed slots:', list);
        if (!cancelled) setSlots(list);
      } catch (e: any) {
        console.error('Error loading slots:', e);
        if (!cancelled) setError(e?.message || 'Failed to load slots');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [therapistId, ymd]);

  const addSlot = async (timeRange: string) => {
    if (!therapistId || !ymd) {
      console.error('Missing therapistId or date:', { therapistId, ymd });
      throw new Error('Missing therapist ID or date');
    }
    
    console.log('addSlot called with:', { therapistId, ymd, timeRange });
    
    try {
      const col = collection(db, 'therapistSlots');
      console.log('Adding document to Firestore...');
      
      // Check if slot already exists
      const existingQuery = query(
        col, 
        where('therapistId', '==', therapistId), 
        where('date', '==', ymd),
        where('timeRange', '==', timeRange)
      );
      const existingSnap = await getDocs(existingQuery);
      
      if (!existingSnap.empty) {
        throw new Error('A slot with this time range already exists for this date');
      }
      
      const docRef = await addDoc(col, { 
        therapistId, 
        date: ymd, 
        timeRange, 
        isBooked: false,
        createdAt: new Date().toISOString()
      });
      console.log('Document added with ID:', docRef.id);
      
      // Wait a moment for Firestore to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // refresh by re-querying
      const qy = query(col, where('therapistId', '==', therapistId), where('date', '==', ymd));
      const snap = await getDocs(qy);
      const updatedSlots = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SlotDoc[];
      // Sort manually since we removed orderBy to avoid index requirement
      updatedSlots.sort((a, b) => a.timeRange.localeCompare(b.timeRange));
      console.log('Refreshed slots after adding:', updatedSlots);
      setSlots(updatedSlots);
    } catch (error) {
      console.error('Error in addSlot:', error);
      throw error;
    }
  };

  const removeSlot = async (slotId: string) => {
    await deleteDoc(doc(db, 'therapistSlots', slotId));
    setSlots(prev => prev.filter(s => s.id !== slotId));
  };

  return { slots, loading, error, addSlot, removeSlot } as const;
}
