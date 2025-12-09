import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/contexts/UserContext';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { Star, Save } from 'lucide-react';

export default function Profile() {
  const { user } = useUser();
  const { profile, save, saving, addSpecialization, addLanguage, removeSpecialization, removeLanguage } = useTherapistProfile(user.id);
  const therapist = profile || { id: user.id, name: user.name, bio: '', specializations: [], languages: [] };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground text-lg">Manage your professional information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Preview */}
        <Card className="glass-card md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <img
                src={therapist.avatar}
                alt={therapist.name}
                className="w-24 h-24 rounded-full border-2 border-primary/20 mb-4"
              />
              <h3 className="font-semibold text-lg">{therapist.name}</h3>
              <div className="flex items-center gap-1 mt-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{therapist.rating ?? '4.8'}</span>
                <span className="text-sm text-muted-foreground">({therapist.reviewCount ?? 0} reviews)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="glass-card md:col-span-2">
          <CardHeader>
            <CardTitle>Edit Information</CardTitle>
            <CardDescription>Update your professional details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={therapist.name} onBlur={async (e) => { if (e.target.value !== therapist.name) await save({ name: e.target.value }); }} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biography</Label>
              <Textarea id="bio" defaultValue={therapist.bio} rows={4} onBlur={async (e) => { if (e.target.value !== therapist.bio) await save({ bio: e.target.value }); }} />
            </div>

            <div className="space-y-2">
              <Label>Specializations</Label>
              <div className="flex flex-wrap gap-2">
                {(therapist.specializations || []).map((spec) => (
                  <Badge key={spec} className="bg-primary/10 text-primary" onClick={async () => { if (confirm(`Remove specialization "${spec}"?`)) await removeSpecialization(spec); }}>
                    {spec}
                  </Badge>
                ))}
                <Button variant="outline" size="sm" onClick={async () => { const v = window.prompt('Add specialization'); if (v) await addSpecialization(v); }}>+ Add</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2">
                {(therapist.languages || []).map((lang) => (
                  <Badge key={lang} variant="secondary" onClick={async () => { if (confirm(`Remove language "${lang}"?`)) await removeLanguage(lang); }}>
                    {lang}
                  </Badge>
                ))}
                <Button variant="outline" size="sm" onClick={async () => { const v = window.prompt('Add language'); if (v) await addLanguage(v); }}>+ Add</Button>
              </div>
            </div>

            <Button className="w-full gap-2" disabled={saving} onClick={async () => { /* noop: we save onBlur for now */ }}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
