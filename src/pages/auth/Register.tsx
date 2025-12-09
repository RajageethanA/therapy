import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Phone, MapPin, GraduationCap, Briefcase, DollarSign, FileText, Upload, Users, Languages, Calendar, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const specializations = [
  "Anxiety", "Depression", "PTSD", "Relationship Issues", 
  "Family Therapy", "Stress Management", "Addiction", "Sleep Disorders"
];

const languages = ["English", "Spanish", "French", "German", "Mandarin", "Hindi", "Arabic"];

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState<"patient" | "therapist">("patient");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Patient-specific fields
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<string>('');
  const [preferredLanguage, setPreferredLanguage] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [city, setCity] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Password Mismatch', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Prepare profile doc
      const profile: any = {
        role,
        name: fullName,
        email,
        createdAt: new Date().toISOString(),
      };

      if (role === 'therapist') {
        profile.specializations = selectedSpecializations;
        profile.languages = selectedLanguages;
        // other therapist fields (qualification, experience, fee, bio) could be added here
      }

      if (role === 'patient') {
        profile.age = typeof age === 'number' ? age : null;
        profile.gender = gender || null;
        profile.preferredLanguage = preferredLanguage || null;
        profile.phone = phone || null;
        profile.location = city || null;
      }

      // Write profile to Firestore under users/{uid}
      await setDoc(doc(db, 'users', uid), profile);

      toast({ title: 'Registration Successful', description: `Welcome aboard as a ${role}` });
      setIsLoading(false);
      // After registration, user is authenticated via Firebase and onAuthStateChanged will pick up profile
      navigate(role === 'therapist' ? '/therapist' : '/');
    } catch (err: any) {
      console.error('Registration error', err);
      toast({ title: 'Registration Failed', description: err.message || 'Unable to create account', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  const toggleSpecialization = (spec: string) => {
    setSelectedSpecializations(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent animate-pulse" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl relative z-10"
      >
        <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Join Our Platform
            </CardTitle>
            <CardDescription className="text-base">
              Start your journey towards better mental health
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selector */}
              <div className="space-y-2">
                <Label>I am a</Label>
                <div className="grid grid-cols-2 gap-4">
                  {(["patient", "therapist"] as const).map((r) => (
                    <motion.div
                      key={r}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="button"
                        variant={role === r ? "default" : "outline"}
                        className="w-full h-16 text-lg capitalize"
                        onClick={() => setRole(r)}
                      >
                        {r === "patient" ? <User className="mr-2 h-5 w-5" /> : <Briefcase className="mr-2 h-5 w-5" />}
                        {r}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Common Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="fullName" placeholder="John Doe" className="pl-10" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="john@example.com" className="pl-10" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" className="pl-10" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="confirmPassword" type="password" placeholder="••••••••" className="pl-10" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Role-specific Fields */}
              <AnimatePresence mode="wait">
                {role === "patient" ? (
                  <motion.div
                    key="patient-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="age" type="number" placeholder="25" className="pl-10" required value={age || ''} onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={gender} onValueChange={(v) => setGender(v)} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language">Preferred Language</Label>
                        <Select value={preferredLanguage} onValueChange={(v) => setPreferredLanguage(v)} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map(lang => (
                              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="phone" type="tel" placeholder="+1 234 567 8900" className="pl-10" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="city">City/Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="city" placeholder="New York, NY" className="pl-10" required value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="therapist-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="qualification">Qualification</Label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="qualification" placeholder="Ph.D. in Clinical Psychology" className="pl-10" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="experience">Years of Experience</Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="experience" type="number" placeholder="5" className="pl-10" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fee">Consultation Fee (USD)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="fee" type="number" placeholder="150" className="pl-10" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="license">License/Certification</Label>
                        <div className="relative">
                          <Upload className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="license" type="file" className="pl-10" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="photo">Profile Photo</Label>
                        <div className="relative">
                          <UserCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="photo" type="file" accept="image/*" className="pl-10" required />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Specialization</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {specializations.map((spec) => (
                          <motion.div
                            key={spec}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              type="button"
                              variant={selectedSpecializations.includes(spec) ? "default" : "outline"}
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => toggleSpecialization(spec)}
                            >
                              {spec}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Languages Spoken</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {languages.map((lang) => (
                          <motion.div
                            key={lang}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              type="button"
                              variant={selectedLanguages.includes(lang) ? "default" : "outline"}
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => toggleLanguage(lang)}
                            >
                              {lang}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Short Bio</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="bio"
                          placeholder="Tell us about your experience and approach..."
                          className="pl-10 min-h-24"
                          required
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Terms & Conditions */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                  I accept the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms & Conditions
                  </Link>
                </Label>
              </div>

              {/* Submit Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold"
                  disabled={!termsAccepted}
                >
                  Create Account
                </Button>
              </motion.div>

              {/* Login Link */}
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
