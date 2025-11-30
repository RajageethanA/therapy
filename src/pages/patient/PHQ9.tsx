import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { phq9Questions } from '@/lib/mockData';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const answerOptions = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

export default function PHQ9() {
  const { user } = useUser();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(phq9Questions.length).fill(-1));
  const [showResults, setShowResults] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  const progress = ((currentQuestion + 1) / phq9Questions.length) * 100;
  const totalScore = answers.reduce((sum, val) => sum + (val >= 0 ? val : 0), 0);

  const getRiskLevel = (score: number) => {
    if (score <= 4) return { level: 'Minimal', color: 'bg-primary/20 text-primary', desc: 'Minimal depression' };
    if (score <= 9) return { level: 'Mild', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400', desc: 'Mild depression' };
    if (score <= 14) return { level: 'Moderate', color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400', desc: 'Moderate depression' };
    if (score <= 19) return { level: 'Moderately Severe', color: 'bg-red-500/20 text-red-600 dark:text-red-400', desc: 'Moderately severe depression' };
    return { level: 'Severe', color: 'bg-destructive/20 text-destructive', desc: 'Severe depression' };
  };

  const getRiskLevelKey = (score: number): 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe' => {
    if (score <= 4) return 'minimal';
    if (score <= 9) return 'mild';
    if (score <= 14) return 'moderate';
    if (score <= 19) return 'moderately-severe';
    return 'severe';
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);

    if (currentQuestion < phq9Questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setTimeout(() => setShowResults(true), 300);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Persist result to Firestore when completed
  useEffect(() => {
    if (!showResults || saved) return;
    let cancelled = false;
    (async () => {
      try {
        if (!user?.id) return;
        const ref = collection(db, 'phq9Results');
        await addDoc(ref, {
          patientId: user.id,
          date: serverTimestamp(),
          score: totalScore,
          riskLevel: getRiskLevelKey(totalScore),
          answers,
        });
        if (!cancelled) setSaved(true);
      } catch (e) {
        // Non-fatal; we still show results
        if (!cancelled) setSaved(true);
      }
    })();
    return () => { cancelled = true; };
  }, [showResults, saved, user?.id, totalScore, answers]);

  if (showResults) {
    const risk = getRiskLevel(totalScore);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div className="text-center mb-8">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Assessment Complete</h1>
          <p className="text-muted-foreground">Here are your results</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Your PHQ-9 Score</CardTitle>
            <CardDescription>Patient Health Questionnaire</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div>
                <span className="text-6xl font-bold text-primary">{totalScore}</span>
                <span className="text-2xl text-muted-foreground">/27</span>
              </div>
              <Badge className={`${risk.color} text-lg py-2 px-4`}>
                {risk.level}
              </Badge>
              <p className="text-muted-foreground">{risk.desc}</p>
            </div>

            <Progress value={(totalScore / 27) * 100} className="h-3" />

            <div className="pt-6 space-y-3">
              <h3 className="font-semibold text-lg">Recommended Next Steps</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Consider booking a session with a licensed therapist</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Explore our AI-powered self-care plan for daily guidance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Track your progress by retaking this assessment weekly</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button className="flex-1" onClick={() => navigate('/therapists')}>
                Find a Therapist
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate('/ai-plan')}>
                View AI Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/')}>
            Return to Dashboard
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">PHQ-9 Assessment</h1>
        <p className="text-muted-foreground">Over the last 2 weeks, how often have you been bothered by the following?</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {currentQuestion + 1} of {phq9Questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-2xl">{phq9Questions[currentQuestion]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {answerOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={answers[currentQuestion] === option.value ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto py-4 px-6 hover-lift"
                  onClick={() => handleAnswer(option.value)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      answers[currentQuestion] === option.value 
                        ? 'border-primary-foreground bg-primary-foreground' 
                        : 'border-muted-foreground'
                    }`}>
                      {answers[currentQuestion] === option.value && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                    <span>{option.label}</span>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between pt-4">
        <Button
          variant="ghost"
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          variant="ghost"
          onClick={() => currentQuestion < phq9Questions.length - 1 && setCurrentQuestion(currentQuestion + 1)}
          disabled={currentQuestion === phq9Questions.length - 1 || answers[currentQuestion] === -1}
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
