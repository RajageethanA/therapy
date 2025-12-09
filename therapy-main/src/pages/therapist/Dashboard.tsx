import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/UserContext';
import { useTherapistDashboardData } from '@/hooks/useTherapistDashboardData';
import { Users, Calendar, Activity, TrendingUp, Clock, Target, Search, UserCheck, Video, Phone } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function TherapistDashboard() {
  const { user } = useUser();
  const {
    totalPatients,
    activePatients, 
    todaySessions,
    upcomingSessions,
    sessionCompletionRate,
    patientRetentionRate,
    growth,
    recentPatients,
    loading,
    error
  } = useTherapistDashboardData(user?.id);
  
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = recentPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Therapist Dashboard</h1>
          <p className="text-muted-foreground text-lg">Loading your dashboard...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="glass-card">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Therapist Dashboard</h1>
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Therapist Dashboard</h1>
        <p className="text-muted-foreground text-lg">Welcome back, {user?.name || 'Dr. Smith'}</p>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card hover-lift">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Patients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{totalPatients}</span>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Active</div>
                  <div className="text-lg font-semibold text-green-600">{activePatients}</div>
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {patientRetentionRate.toFixed(1)}% retention rate
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card hover-lift">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Today's Sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{todaySessions.length}</span>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Upcoming</div>
                  <div className="text-lg font-semibold text-blue-600">{upcomingSessions.length}</div>
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {sessionCompletionRate.toFixed(1)}% completion rate
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card hover-lift">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Growth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className={`text-3xl font-bold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth > 0 ? '+' : ''}{Math.round(growth)}%
                </span>
                <TrendingUp className={`w-8 h-8 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                vs last month
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Patient Search & Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Quick Patient Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline">
              <UserCheck className="w-4 h-4 mr-2" />
              View All Patients
            </Button>
          </div>
          
          {searchTerm && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${patient.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <div className="font-medium text-sm">{patient.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {patient.totalSessions} sessions
                      </div>
                    </div>
                  </div>
                  <Badge variant={patient.status === 'active' ? 'default' : 'secondary'}>
                    {patient.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Schedule & Performance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>{format(new Date(), 'PPP')}</CardDescription>
          </CardHeader>
          <CardContent>
            {todaySessions.length > 0 ? (
              <div className="space-y-3">
                {todaySessions.slice(0, 5).map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{session.patientName || `Patient ${session.patientId.slice(0, 8)}`}</div>
                        <div className="text-xs text-muted-foreground">{session.time || 'Time TBD'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={session.status === 'confirmed' ? 'default' : 'outline'}>
                        {session.status}
                      </Badge>
                      {session.status === 'confirmed' && (
                        <Button size="sm" variant="outline">
                          <Video className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p>No sessions scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Session Completion</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{sessionCompletionRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  {upcomingSessions.length + todaySessions.length} pending
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-500" />
                <span className="text-sm">Patient Retention</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{patientRetentionRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  {activePatients} active patients
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span className="text-sm">Growth Rate</span>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Patients Activity */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Recent Patients
          </CardTitle>
          <CardDescription>Latest patient activity and session history</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPatients.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {recentPatients.slice(0, 6).map((patient, index) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={patient.avatar || "/image.png"}
                      alt={patient.name}
                      className="w-10 h-10 rounded-full border-2 border-primary/20"
                    />
                    <div>
                      <div className="font-medium">{patient.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {patient.totalSessions} sessions
                        {patient.lastSessionDate && (
                          <> • {formatDistanceToNow(new Date(patient.lastSessionDate), { addSuffix: true })}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={patient.status === 'active' ? 'default' : 'secondary'}>
                      {patient.status}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p>No patient data available yet</p>
              <p className="text-sm">Sessions will appear here once you start treating patients</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}