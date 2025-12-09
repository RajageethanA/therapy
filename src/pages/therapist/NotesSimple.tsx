import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { FileText, Plus, Search, Calendar } from 'lucide-react';

export default function TherapistNotes() {
  const { user } = useUser();

  // Mock notes data for now
  const notes = [
    {
      id: '1',
      title: 'Session with John Doe',
      content: 'Patient showed significant improvement in anxiety management techniques.',
      date: '2024-11-12',
      patient: 'John Doe',
      tags: ['anxiety', 'cbt']
    },
    {
      id: '2',
      title: 'Initial Assessment - Sarah Wilson',
      content: 'First consultation completed. Patient presents with mild depression symptoms.',
      date: '2024-11-11',
      patient: 'Sarah Wilson',
      tags: ['assessment', 'depression']
    },
    {
      id: '3',
      title: 'Progress Note - Mike Johnson',
      content: 'Patient demonstrates improved coping strategies and reduced stress levels.',
      date: '2024-11-10',
      patient: 'Mike Johnson',
      tags: ['progress', 'stress']
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Session Notes</h1>
          <p className="text-muted-foreground text-lg">Manage patient notes and documentation</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Note
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search notes..."
                className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
              />
            </div>
            <Button variant="outline">All Patients</Button>
            <Button variant="outline">All Categories</Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map((note) => (
          <Card key={note.id} className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{note.title}</h3>
                    <Badge variant="outline">Session</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {note.patient}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {note.date}
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-3">
                    {note.content}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {note.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              Total Notes
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notes.length}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Documented sessions
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              This Week
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">3</div>
            <div className="text-sm text-muted-foreground mt-1">
              Notes created
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              Categories
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">4</div>
            <div className="text-sm text-muted-foreground mt-1">
              Note types used
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}