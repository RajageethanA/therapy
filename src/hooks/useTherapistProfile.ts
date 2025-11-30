import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export type TherapistProfile = {
  id: string;
  name: string;
  bio?: string;
  price?: number;
  specializations?: string[];
  languages?: string[];
  avatar?: string;
  rating?: number;
  reviewCount?: number;
};

export function useTherapistProfile(therapistId?: string) {
  const [profile, setProfile] = useState<TherapistProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!therapistId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ref = doc(db, 'users', therapistId);
        const snap = await getDoc(ref);
        if (snap.exists() && !cancelled) {
          const data = snap.data() as any;
          setProfile({
            id: therapistId,
            name: data.name || 'Therapist',
            bio: data.bio,
            price: data.price,
            specializations: data.specializations || [],
            languages: data.languages || [],
            avatar: data.avatar,
            rating: data.rating,
            reviewCount: data.reviewCount,
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [therapistId]);

  const save = async (updates: Partial<TherapistProfile>) => {
    if (!profile) return;
    setSaving(true);
    try {
      const ref = doc(db, 'users', profile.id);
      await updateDoc(ref, updates as any);
      setProfile(prev => prev ? { ...prev, ...updates } : prev);
    } finally {
      setSaving(false);
    }
  };

  const addSpecialization = async (spec: string) => {
    if (!profile) return;
    const next = Array.from(new Set([...(profile.specializations || []), spec]));
    await save({ specializations: next });
  };

  const removeSpecialization = async (spec: string) => {
    if (!profile) return;
    const next = (profile.specializations || []).filter(s => s !== spec);
    await save({ specializations: next });
  };

  const addLanguage = async (lang: string) => {
    if (!profile) return;
    const next = Array.from(new Set([...(profile.languages || []), lang]));
    await save({ languages: next });
  };

  const removeLanguage = async (lang: string) => {
    if (!profile) return;
    const next = (profile.languages || []).filter(l => l !== lang);
    await save({ languages: next });
  };

  return { profile, loading, error, save, saving, addSpecialization, removeSpecialization, addLanguage, removeLanguage } as const;
}
