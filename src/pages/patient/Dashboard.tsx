import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/contexts/UserContext';
import { usePatientDashboardData } from '@/hooks/usePatientDashboardData';
import { ArrowRight, TrendingUp, Calendar, Brain, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  // Debug: Log PHQ9 data
  console.log('PHQ9 data:', phq9);
  console.log('User ID:', user.id);
  console.log('Loading:', loading);

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
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-lg font-bold text-primary">${therapist.price ?? 120}/session</span>
                      <Link to={`/therapists/${therapist.id}`}>
                        <Button size="sm" className="group-hover:shadow-lg transition-shadow">
                          Book Now
                        </Button>
                      </Link>
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
