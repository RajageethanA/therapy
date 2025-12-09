import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useUser } from '@/contexts/UserContext';
import { usePatientDashboardData } from '@/hooks/usePatientDashboardData';
import { ArrowRight, TrendingUp, Calendar, Brain, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { formatDateForFirestore } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function PatientDashboard() {
  const { user } = useUser();
  const { phq9, nextSession, aiPlan, therapists, aiPlanStats, loading } = usePatientDashboardData(user.id);
  const progressPercentage = aiPlanStats.progressPct;
  
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  // Debug: Log PHQ9 data
  console.log('PHQ9 data:', phq9);
  console.log('User ID:', user.id);
  console.log('Loading:', loading);

  // Load available slots when therapist/date selected
  useEffect(() => {
    loadSlots();
  }, [selectedTherapist, selectedDate]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'minimal': return 'bg-primary/20 text-primary';
      case 'mild': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'moderate': return 'bg-orange-500/20 text-orange-600 dark:text-orange-400';
      case 'moderately-severe': return 'bg-red-500/20 text-red-600 dark:text-red-400';
      case 'severe': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Load available slots for selected therapist and date
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
      }));
      
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

  const bookSession = async (slot: any) => {
    if (!user?.id || !selectedTherapist || booking) return;
    
    setBooking(true);
    try {
      await addDoc(collection(db, 'sessions'), {
        patientId: user.id,
        therapistId: selectedTherapist.id,
        slotId: slot.id,
        date: slot.date,
        time: slot.timeRange.split(' - ')[0],
        status: 'pending',
        createdAt: serverTimestamp(),
        patientName: user.name,
        therapistName: selectedTherapist.name,
      });

      const slotRef = doc(db, 'therapistSlots', slot.id);
      await updateDoc(slotRef, {
        isBooked: true,
        bookedBy: user.id,
        bookedAt: serverTimestamp(),
      });

      setAvailableSlots(prev => prev.filter(s => s.id !== slot.id));
      alert('Session booked successfully! Waiting for therapist confirmation.');
      setSelectedTherapist(null);
      setSelectedDate(undefined);
      setAvailableSlots([]);
    } catch (e) {
      console.error('Booking error:', e);
      alert('Failed to book session. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Welcome Section */}
      <motion.div variants={item}>
        <h1 className="text-4xl font-bold mb-2">Welcome back, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground text-lg">Here's your mental wellness overview</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid gap-6 md:grid-cols-3">
        {/* Risk Level Card */}
        <Card className="glass-card hover-lift overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your Risk Level</span>
              <TrendingUp className="w-5 h-5 text-primary" />
            </CardTitle>
            <CardDescription>Based on recent PHQ-9</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{phq9 ? phq9.score : '--'}/27</span>
                {phq9 ? (
                  <Badge className={getRiskColor(phq9.riskLevel)}>
                    {phq9.riskLevel.charAt(0).toUpperCase() + phq9.riskLevel.slice(1).replace('-', ' ')}
                  </Badge>
                ) : (
                  <Badge className="bg-muted text-muted-foreground">Take Assessment</Badge>
                )}
              </div>
              <Progress value={phq9 ? (phq9.score / 27) * 100 : 0} className="h-2" />
              <Link to="/phq9">
                <Button variant="outline" className="w-full group">
                  Retake Assessment
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Session Card */}
        <Card className="glass-card hover-lift overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Next Session</span>
              <Calendar className="w-5 h-5 text-accent" />
            </CardTitle>
            <CardDescription>Coming up soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                {nextSession ? (
                  <>
                    <p className="font-semibold">Therapist #{nextSession.therapistId}</p>
                    <p className="text-sm text-muted-foreground">{nextSession.date} {nextSession.time ? `at ${nextSession.time}` : ''}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming session</p>
                )}
              </div>
              <Link to="/sessions">
                <Button variant="outline" className="w-full group">
                  View Details
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* AI Plan Progress Card */}
        <Card className="glass-card hover-lift overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>AI Self-Care</span>
              <Brain className="w-5 h-5 text-primary" />
            </CardTitle>
            <CardDescription>Week 1 Progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{aiPlanStats.completedTasks}/{aiPlanStats.totalTasks}</span>
                  <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              <Link to="/ai-plan">
                <Button variant="outline" className="w-full group">
                  Continue Plan
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Suggested Therapists */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Suggested Therapists</h2>
          <Link to="/therapists">
            <Button variant="ghost" className="group">
              View All
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {therapists.map((therapist, index) => (
            <motion.div
              key={therapist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card hover-lift hover-glow cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <img
                      src={therapist.avatar || "/image.png"}
                      alt={therapist.name}
                      className="w-16 h-16 rounded-full border-2 border-primary/20"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {therapist.name}
                      </CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{therapist.rating ?? '4.8'}</span>
                        <span className="text-sm text-muted-foreground">({therapist.reviewCount ?? 0})</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(therapist.specialization || []).slice(0, 2).map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-end pt-2">
                      <Dialog open={selectedTherapist?.id === therapist.id} onOpenChange={(open) => !open && setSelectedTherapist(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm"
                            className="group-hover:shadow-lg transition-shadow"
                            onClick={() => {
                              setSelectedTherapist(therapist);
                              setSelectedDate(new Date());
                            }}
                          >
                            Book Now
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
                            <div>
                              <label className="text-sm font-medium">Select Date</label>
                              <CalendarComponent
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                  setSelectedDate(date);
                                }}
                                disabled={(date) => date < new Date()}
                                className="rounded-md border"
                              />
                            </div>

                            {slotsLoading && <p className="text-sm text-muted-foreground">Loading available slots...</p>}
                            
                            {!slotsLoading && availableSlots.length > 0 && (
                              <div>
                                <label className="text-sm font-medium block mb-2">Available Times</label>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {availableSlots.map((slot) => (
                                    <Button
                                      key={slot.id}
                                      variant="outline"
                                      className="w-full text-left justify-start"
                                      disabled={booking}
                                      onClick={() => bookSession(slot)}
                                    >
                                      {slot.timeRange}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {!slotsLoading && availableSlots.length === 0 && selectedDate && (
                              <p className="text-sm text-muted-foreground text-center">No available slots on this date</p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {!loading && therapists.length === 0 && (
            <p className="text-muted-foreground">No therapists available.</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
