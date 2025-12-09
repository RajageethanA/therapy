import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { useUser } from '@/contexts/UserContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Search, Star, Clock, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { formatDateForFirestore } from '@/lib/utils';

type Therapist = {
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
  rating?: number;
  reviewCount?: number;
  specializations?: string[];
  languages?: string[];
};

type TimeSlot = {
  id: string;
  therapistId: string;
  date: string;
  timeRange: string;
  isBooked: boolean;
};

export default function Therapists() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Load therapists from Firestore
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'therapist'));
        const snap = await getDocs(q);
        if (!cancelled) {
          const therapistData = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Therapist[];
          setTherapists(therapistData);
        }
      } catch (e) {
        console.error('Error loading therapists:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load available slots when therapist/date selected
  const loadSlots = async () => {
    if (!selectedTherapist || !selectedDate) {
      console.log('loadSlots: Missing therapist or date', { selectedTherapist: selectedTherapist?.name, selectedDate });
      return;
    }
    
    setSlotsLoading(true);
    
    // Use utility function for consistent date formatting
    const dateStr = formatDateForFirestore(selectedDate);
    const formatDateStr = format(selectedDate, 'PPP');
    
    console.log('Loading slots for therapist:', selectedTherapist.name, 'on date:', dateStr, 'display date:', formatDateStr, 'original date object:', selectedDate);
    
    try {
      const slotsRef = collection(db, 'therapistSlots');
      const q = query(slotsRef, where('therapistId', '==', selectedTherapist.id), where('date', '==', dateStr));
      console.log('Querying with:', { therapistId: selectedTherapist.id, date: dateStr });
      
      const snap = await getDocs(q);
      console.log('Found', snap.docs.length, 'total documents');
      
      const slots = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimeSlot[];
      
      console.log('All raw slots:', slots);
      
      // Only show slots that are not booked
      const availableSlots = slots.filter(slot => !slot.isBooked);
      console.log('Filtered available slots (isBooked=false):', availableSlots);
      console.log('Booked slots (isBooked=true):', slots.filter(slot => slot.isBooked));
      
      setAvailableSlots(availableSlots);
    } catch (e) {
      console.error('Error loading slots:', e);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [selectedTherapist, selectedDate]);

  const bookSession = async (slot: TimeSlot) => {
    if (!user?.id || !selectedTherapist || booking) return;
    
    setBooking(true);
    try {
      // Create session record
      await addDoc(collection(db, 'sessions'), {
        patientId: user.id,
        therapistId: selectedTherapist.id,
        slotId: slot.id,
        date: slot.date,
        time: slot.timeRange.split(' - ')[0], // Extract start time
        status: 'pending', // pending -> confirmed -> completed
        createdAt: serverTimestamp(),
        patientName: user.name,
        therapistName: selectedTherapist.name,
      });

      // Update slot as booked in Firestore
      const slotRef = doc(db, 'therapistSlots', slot.id);
      await updateDoc(slotRef, {
        isBooked: true,
        bookedBy: user.id,
        bookedAt: serverTimestamp(),
      });

      // Remove slot from local available slots
      setAvailableSlots(prev => prev.filter(s => s.id !== slot.id));
      
      // Also refresh slots to ensure consistency
      setTimeout(() => loadSlots(), 1000);
      
      alert('Session booked successfully! Waiting for therapist confirmation.');
      setSelectedTherapist(null);
    } catch (e) {
      console.error('Booking error:', e);
      alert('Failed to book session. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const filteredTherapists = therapists.filter(therapist =>
    therapist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (therapist.specializations || []).some(spec => spec.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Find Your Therapist</h1>
        <p className="text-muted-foreground text-lg">Connect with licensed professionals who care</p>
      </div>

      {/* Search Bar */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or specialization..."
              className="pl-10 h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Therapists Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading therapists...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTherapists.map((therapist, index) => (
            <motion.div
              key={therapist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card hover-lift hover-glow h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <img
                      src={therapist.avatar || "/image.png"}
                      alt={therapist.name}
                      className="w-20 h-20 rounded-full border-2 border-primary/20"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{therapist.name}</CardTitle>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{therapist.rating || 4.8}</span>
                        <span className="text-sm text-muted-foreground">({therapist.reviewCount || 0})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(therapist.languages || ['English']).map((lang) => (
                          <Badge key={lang} variant="secondary" className="text-xs">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">{therapist.bio || 'Experienced mental health professional.'}</p>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Specializations:</p>
                    <div className="flex flex-wrap gap-2">
                      {(therapist.specializations || ['General Therapy']).map((spec) => (
                        <Badge key={spec} className="bg-primary/10 text-primary hover:bg-primary/20">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-auto border-t border-border/50 flex items-center justify-end">
                    <Dialog open={selectedTherapist?.id === therapist.id} onOpenChange={(open) => !open && setSelectedTherapist(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          className="hover:shadow-lg transition-shadow"
                          onClick={() => setSelectedTherapist(therapist)}
                        >
                          Book Session
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Book with {therapist.name}</DialogTitle>
                          <DialogDescription>
                            Select a date and available time slot
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < new Date()}
                            className="rounded-md border"
                          />
                          
                          {selectedDate && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">Available times for {format(selectedDate, 'PPP')}:</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={loadSlots}
                                  disabled={slotsLoading}
                                  className="text-xs"
                                >
                                  {slotsLoading ? 'Refreshing...' : 'Refresh'}
                                </Button>
                              </div>
                              {slotsLoading ? (
                                <p className="text-sm text-muted-foreground">Loading available slots...</p>
                              ) : availableSlots.length === 0 ? (
                                <div className="text-center py-4">
                                  <p className="text-sm text-muted-foreground">No available slots for this date.</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    The therapist hasn't set any availability yet.
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2">
                                  {availableSlots.map(slot => (
                                    <Button
                                      key={slot.id}
                                      variant="outline"
                                      size="sm"
                                      disabled={booking}
                                      onClick={() => bookSession(slot)}
                                      className="justify-center"
                                    >
                                      {slot.timeRange}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {filteredTherapists.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No therapists found matching your search.</p>
        </div>
      )}
    </div>
  );
}
