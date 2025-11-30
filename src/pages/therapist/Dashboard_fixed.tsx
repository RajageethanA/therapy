import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/contexts/UserContext';
import { DollarSign, Users, Calendar, Activity } from 'lucide-react';

export default function TherapistDashboard() {
  const { user } = useUser();

  // Mock data for now
  const stats = {
    totalPatients: 45,
    todaySessions: 8,
    monthlyEarnings: 3400,
    completionRate: 92
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Therapist Dashboard</h1>
        <p className="text-muted-foreground text-lg">Welcome back, {user?.name || 'Dr. Smith'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              Total Patients
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPatients}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Active patients in your care
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Today's Sessions
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todaySessions}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Scheduled for today
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Monthly Earnings
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats.monthlyEarnings.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Current month revenue
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="w-4 h-4" />
              Completion Rate
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completionRate}%</div>
            <div className="text-sm text-muted-foreground mt-1">
              Session completion rate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Session with John Doe</span>
              <Badge variant="outline">Completed</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Session with Jane Smith</span>
              <Badge variant="outline">Upcoming</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Session with Mike Johnson</span>
              <Badge variant="outline">In Progress</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">9:00 AM - Sarah Wilson</div>
                <div className="text-sm text-muted-foreground">Initial consultation</div>
              </div>
              <Badge>Confirmed</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">11:00 AM - David Brown</div>
                <div className="text-sm text-muted-foreground">Follow-up session</div>
              </div>
              <Badge>Confirmed</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">2:00 PM - Emma Davis</div>
                <div className="text-sm text-muted-foreground">Group therapy</div>
              </div>
              <Badge variant="outline">Pending</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}