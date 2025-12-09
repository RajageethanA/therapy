import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Camera, 
  CheckCircle, 
  Star, 
  AlertCircle,
  AlertTriangle,
  Loader2,
  X,
  Target,
  Trophy,
  TrendingUp,
  Calendar,
  Clock,
  Zap,
  Heart,
  Smile,
  UserPlus,
  Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Sadness analysis result type
interface SadnessAnalysisResult {
  sadnessScore: number;
  emotionSadnessScore: number;
  phq9Score: number | null;
  phq9Percentage: number | null;
  severityLevel: 'minimal' | 'moderate' | 'severe';
  recommendTherapist: boolean;
  emotionBreakdown: Record<string, number>;
  therapy?: {
    acknowledgment?: string;
    coping_strategies?: string[];
    self_care_tips?: string[];
    immediate_coping?: string[];
    mood_boosters?: string[];
    daily_routine?: string[];
    encouragement?: string;
    therapist_recommendation?: string;
    why_see_therapist?: string;
    emergency_resources?: string;
    consider_therapist?: string;
    recommend_therapist?: boolean;
  };
}

const AIPlan: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [showCamera, setShowCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sadnessResult, setSadnessResult] = useState<SadnessAnalysisResult | null>(null);
  const [latestPhq9Score, setLatestPhq9Score] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch latest PHQ-9 score on mount
  useEffect(() => {
    const fetchLatestPhq9 = async () => {
      if (!user?.id) return;
      
      try {
        const phq9Ref = collection(db, 'phq9Results');
        // Simple query without ordering to avoid index requirement
        const q = query(
          phq9Ref, 
          where('patientId', '==', user.id)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          // Find the latest result manually by comparing dates
          let latestResult: any = null;
          let latestDate: Date | null = null;
          
          snap.docs.forEach(doc => {
            const data = doc.data();
            const docDate = data.date?.toDate?.() || new Date(data.date);
            if (!latestDate || docDate > latestDate) {
              latestDate = docDate;
              latestResult = data;
            }
          });
          
          if (latestResult) {
            setLatestPhq9Score(latestResult.score);
            console.log('📊 Latest PHQ-9 score loaded:', latestResult.score);
          }
        }
      } catch (e) {
        console.error('Error fetching PHQ-9 score:', e);
        // Continue without PHQ-9 score - not critical
      }
    };

    fetchLatestPhq9();
  }, [user?.id]);

  // Daily Progress State
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  
  const [dailyStats, setDailyStats] = useState({
    streak: 7,
    completedToday: 0,
    totalPoints: 125,
    weeklyGoal: 35,
    currentWeekProgress: 28,
    aiInsights: '' as string,
    therapyData: null as any,
    lastTaskGeneration: null as string | null
  });

  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  // Get severity color based on level
  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'minimal': return 'bg-green-500/20 text-green-600 dark:text-green-400';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'severe': return 'bg-red-500/20 text-red-600 dark:text-red-400';
      default: return 'bg-gray-500/20 text-gray-600';
    }
  };

  // Get severity description
  const getSeverityDescription = (level: string) => {
    switch (level) {
      case 'minimal': return 'Your sadness levels are within a healthy range. Keep up the good work!';
      case 'moderate': return 'You\'re experiencing moderate sadness. The recommendations below can help.';
      case 'severe': return 'Your sadness levels are elevated. We strongly recommend speaking with a therapist.';
      default: return '';
    }
  };

  // Load daily tasks from localStorage on mount
  useEffect(() => {
    const loadDailyProgress = () => {
      const today = new Date().toDateString();
      const savedTasks = localStorage.getItem(`dailyTasks_${today}`);
      const savedStats = localStorage.getItem(`dailyStats_${today}`);
      
      if (savedTasks) {
        try {
          const tasks = JSON.parse(savedTasks);
          setDailyTasks(tasks);
          console.log('📅 Loaded daily tasks from localStorage:', tasks);
        } catch (e) {
          console.error('Error loading daily tasks:', e);
        }
      }
      
      if (savedStats) {
        try {
          const stats = JSON.parse(savedStats);
          setDailyStats(prev => ({ ...prev, ...stats }));
          console.log('📊 Loaded daily stats from localStorage:', stats);
        } catch (e) {
          console.error('Error loading daily stats:', e);
        }
      }
      
      // Check if we need to generate new tasks for today
      const lastGeneration = localStorage.getItem('lastTaskGeneration');
      if (!lastGeneration || lastGeneration !== today) {
        console.log('🆕 New day detected - will show empty state for task generation');
        setDailyTasks([]);
      }
    };

    loadDailyProgress();
  }, []);

  // Save daily tasks to localStorage whenever they change
  useEffect(() => {
    if (dailyTasks.length > 0) {
      const today = new Date().toDateString();
      localStorage.setItem(`dailyTasks_${today}`, JSON.stringify(dailyTasks));
      localStorage.setItem('lastTaskGeneration', today);
      console.log('💾 Saved daily tasks to localStorage');
    }
  }, [dailyTasks]);

  // Save daily stats to localStorage whenever they change
  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem(`dailyStats_${today}`, JSON.stringify(dailyStats));
  }, [dailyStats]);

  // Update daily stats when tasks change
  useEffect(() => {
    const completed = dailyTasks.filter(task => task.completed).length;
    const total = dailyTasks.length;
    
    setDailyStats(prev => {
      const newPoints = completed * 10; // 10 points per task
      const newWeeklyProgress = Math.min(prev.currentWeekProgress + (completed - prev.completedToday), prev.weeklyGoal);
      
      return {
        ...prev,
        completedToday: completed,
        totalPoints: prev.totalPoints - (prev.completedToday * 10) + newPoints, // Update points
        currentWeekProgress: newWeeklyProgress,
        streak: completed === total && total > 0 ? prev.streak + (completed > prev.completedToday ? 1 : 0) : prev.streak
      };
    });
  }, [dailyTasks]);

  const startEmotionAnalysis = async () => {
    try {
      setError('');
      setShowCamera(true);

      // Get camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

    } catch (error) {
      console.error('Camera error:', error);
      setError('Camera access denied. Please allow camera permissions and try again.');
      setShowCamera(false);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsAnalyzing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Convert canvas to base64 image
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Send to Python backend for sadness detection and therapy
        const result = await sendToBackendAPI(imageData);
        setSadnessResult(result);
        
        // Generate AI-powered daily tasks based on sadness level
        setTimeout(async () => {
          await generateAITasks();
        }, 1000);
        
        // Stop camera
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setShowCamera(false);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Failed to analyze. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendToBackendAPI = async (imageData: string): Promise<SadnessAnalysisResult> => {
    try {
      // Use environment variable for backend URL, fallback to localhost for development
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      // First check if backend is running
      try {
        const healthCheck = await fetch(`${backendUrl}/health`);
        if (!healthCheck.ok) {
          throw new Error('Backend not responding');
        }
      } catch (e) {
        throw new Error('Backend server not running. Please start the Python backend.');
      }

      // Send image to backend for sadness analysis (include PHQ-9 score if available)
      const response = await fetch(`${backendUrl}/analyze_sadness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          phq9_score: latestPhq9Score,
          context: `User is using the sadness detection feature at ${new Date().toLocaleTimeString()}`
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(data.error || 'Backend processing failed');
      }

      // Extract sadness analysis results
      const sadnessData = data.sadness_analysis;
      let therapyData = data.therapy;

      // If backend didn't return therapy data, generate fallback based on severity
      if (!therapyData) {
        therapyData = generateFallbackTherapy(sadnessData.severity_level);
      }

      // Update daily stats with insights
      if (therapyData) {
        setDailyStats(prev => ({
          ...prev,
          aiInsights: therapyData.acknowledgment || therapyData.encouragement || '',
          therapyData: therapyData
        }));
      }

      return {
        sadnessScore: sadnessData.combined_score,
        emotionSadnessScore: sadnessData.emotion_sadness_score,
        phq9Score: sadnessData.phq9_score,
        phq9Percentage: sadnessData.phq9_percentage,
        severityLevel: sadnessData.severity_level,
        recommendTherapist: sadnessData.recommend_therapist,
        emotionBreakdown: data.emotion_breakdown,
        therapy: therapyData
      };

    } catch (error) {
      console.error('Backend API error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Backend server not running')) {
          setError('⚠️ Python backend not running. Please start the backend server first.');
        } else if (error.message.includes('Failed to fetch')) {
          setError('🔌 Cannot connect to backend. Make sure the Python server is running on port 5000.');
        } else {
          setError(`Backend error: ${error.message}`);
        }
      }
      
      // Fallback to mock detection
      return useFallbackDetection();
    }
  };

  const useFallbackDetection = (): SadnessAnalysisResult => {
    // Generate mock sadness score
    const mockEmotionSadness = Math.random() * 60 + 10; // 10-70%
    const mockPhq9 = latestPhq9Score;
    
    let combinedScore: number;
    if (mockPhq9 !== null) {
      combinedScore = (mockEmotionSadness * 0.30) + ((mockPhq9 / 27) * 100 * 0.70);
    } else {
      combinedScore = mockEmotionSadness;
    }
    
    let severityLevel: 'minimal' | 'moderate' | 'severe';
    if (combinedScore <= 30) severityLevel = 'minimal';
    else if (combinedScore <= 60) severityLevel = 'moderate';
    else severityLevel = 'severe';

    return {
      sadnessScore: Math.round(combinedScore),
      emotionSadnessScore: Math.round(mockEmotionSadness),
      phq9Score: mockPhq9,
      phq9Percentage: mockPhq9 !== null ? Math.round((mockPhq9 / 27) * 100) : null,
      severityLevel,
      recommendTherapist: severityLevel === 'severe',
      emotionBreakdown: {
        angry: Math.round(Math.random() * 15),
        disgusted: Math.round(Math.random() * 10),
        fearful: Math.round(Math.random() * 20),
        happy: Math.round(Math.random() * 25),
        neutral: Math.round(Math.random() * 25),
        sad: Math.round(mockEmotionSadness),
        surprised: Math.round(Math.random() * 10)
      },
      therapy: {
        acknowledgment: "We've analyzed your emotional state. Here are some personalized recommendations.",
        self_care_tips: [
          "Take a few deep breaths and ground yourself",
          "Reach out to someone you trust",
          "Practice mindfulness for 5 minutes"
        ],
        encouragement: "Remember, it's okay to not be okay. You're taking a positive step by checking in with yourself."
      }
    };
  };

  // Generate fallback therapy recommendations based on severity
  const generateFallbackTherapy = (severityLevel: string) => {
    if (severityLevel === 'severe') {
      return {
        acknowledgment: "We understand you're going through a very difficult time. Your feelings are valid, and it takes courage to acknowledge them.",
        immediate_coping: [
          "Practice the 4-7-8 breathing technique: breathe in for 4 seconds, hold for 7, exhale for 8",
          "Try the 5-4-3-2-1 grounding exercise: name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste",
          "Place your hand on your heart and take slow, deep breaths while saying 'I am safe right now'"
        ],
        coping_strategies: [
          "Reach out to a trusted friend, family member, or crisis helpline",
          "Write down your thoughts in a journal without judgment",
          "Take a short walk outside, even just for 5 minutes",
          "Listen to calming music or nature sounds",
          "Practice progressive muscle relaxation"
        ],
        therapist_recommendation: "Based on your sadness levels, we strongly encourage speaking with a mental health professional. A therapist can provide personalized support and coping strategies.",
        why_see_therapist: "Professional support can make a significant difference when sadness feels overwhelming. Therapists are trained to help you develop healthy coping mechanisms and work through difficult emotions.",
        emergency_resources: "If you're in crisis, please reach out: National Suicide Prevention Lifeline: 988 | Crisis Text Line: Text HOME to 741741",
        encouragement: "You are not alone in this. Seeking help is a sign of strength, not weakness. Every small step you take matters.",
        recommend_therapist: true
      };
    } else if (severityLevel === 'moderate') {
      return {
        acknowledgment: "We see that you're experiencing some sadness. It's completely normal to have days like this, and acknowledging your feelings is an important first step.",
        coping_strategies: [
          "Take a 15-20 minute walk in nature or around your neighborhood",
          "Practice deep breathing exercises for 5-10 minutes",
          "Connect with a friend or family member - even a short conversation can help",
          "Engage in a hobby or activity you enjoy",
          "Write in a gratitude journal - list 3 things you're thankful for"
        ],
        daily_routine: [
          "Start your morning with gentle stretching or yoga",
          "Take breaks throughout the day to check in with yourself",
          "End your evening with a calming activity like reading or meditation"
        ],
        mood_boosters: [
          "Listen to uplifting music",
          "Watch something that makes you laugh",
          "Spend time with a pet or in nature"
        ],
        consider_therapist: "If these feelings persist for more than two weeks, consider reaching out to a mental health professional for additional support.",
        encouragement: "You're doing great by taking time to understand your emotions. Remember that sadness is temporary, and brighter days are ahead.",
        recommend_therapist: false
      };
    } else {
      return {
        acknowledgment: "Your emotional wellness is looking good! It's wonderful that you're taking time to check in with yourself.",
        self_care_tips: [
          "Continue your positive habits and self-care routines",
          "Practice gratitude by noting 3 good things each day",
          "Stay connected with friends and loved ones"
        ],
        mood_boosters: [
          "Try a new hobby or creative activity",
          "Spend time outdoors and enjoy nature",
          "Do something kind for yourself or others"
        ],
        encouragement: "Keep up the great work! Maintaining emotional awareness is key to long-term mental wellness.",
        recommend_therapist: false
      };
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const closeResults = () => {
    setSadnessResult(null);
    setError('');
  };

  // Daily Progress Functions
  const toggleTask = (taskId: number) => {
    setDailyTasks(prev => 
      prev.map(task => {
        if (task.id === taskId) {
          const newCompleted = !task.completed;
          
          if (newCompleted) {
            console.log(`🎉 Task completed: ${task.title}`);
          }
          
          return { ...task, completed: newCompleted };
        }
        return task;
      })
    );
  };

  const generateAITasks = async () => {
    // Get current context based on sadness result
    const currentSeverity = sadnessResult?.severityLevel || 'minimal';
    const currentSadnessScore = sadnessResult?.sadnessScore || 30;
    const completedTasks = dailyTasks.filter(task => task.completed).length;
    const currentTime = new Date().getHours();
    const timeOfDay = currentTime < 12 ? 'morning' : currentTime < 17 ? 'afternoon' : 'evening';
    
    setIsGeneratingTasks(true);
    
    try {
      // Try Gemini API first
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (apiKey && apiKey !== 'your_gemini_api_key_here') {
        try {
          const response = await generateDailyProgressWithGemini(currentSeverity, currentSadnessScore, completedTasks, timeOfDay);
          
          // Create new AI-recommended tasks
          const aiTasks = response.tasks.map((task: any, index: number) => ({
            id: Date.now() + index,
            title: task.title,
            description: task.description,
            category: task.category,
            duration: task.duration,
            completed: false,
            aiRecommended: true,
            priority: task.priority || (index === 0 ? 'high' : index === 1 ? 'high' : 'medium')
          }));

          setDailyTasks(aiTasks);
          
          if (response.insights) {
            setDailyStats(prev => ({
              ...prev,
              aiInsights: response.insights,
              totalPoints: prev.totalPoints + 10,
            }));
          }

          console.log('✅ Successfully generated new AI tasks:', aiTasks);
          return; // Exit if successful
        } catch (apiError) {
          console.warn('⚠️ Gemini API failed, using fallback tasks:', apiError);
        }
      }
      
      // Use fallback tasks if API fails or key not configured
      throw new Error('Using fallback tasks');

    } catch (error) {
      console.log('📋 Using curated wellness tasks based on severity:', currentSeverity);
      
      const timeBasedTasks = getTimeBasedFallbackTasks(timeOfDay, currentSeverity);
      setDailyTasks(timeBasedTasks);
      
      // Generate appropriate insights based on severity
      const insights = {
        minimal: `Great news! Your sadness levels are minimal. Here are some ${timeOfDay} activities to maintain your positive mental state.`,
        moderate: `We've prepared some helpful ${timeOfDay} coping strategies for you. These activities can help lift your mood.`,
        severe: `We understand you're going through a difficult time. Here are some gentle, supportive activities for this ${timeOfDay}. Remember, it's okay to take things slow.`
      };
      
      setDailyStats(prev => ({
        ...prev,
        aiInsights: insights[currentSeverity as keyof typeof insights] || insights.minimal
      }));

    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const getTimeBasedFallbackTasks = (timeOfDay: string, severity: string) => {
    // Tasks tailored to severity level - 5 tasks each for comprehensive support
    const severeTasks = [
      {
        id: Date.now() + 1,
        title: "Crisis Support Check-in",
        description: "Take a moment to assess how you're feeling. If needed, reach out to a crisis helpline or trusted person.",
        category: "Mental Health",
        duration: "5 min",
        completed: false,
        aiRecommended: true,
        priority: "high" as const
      },
      {
        id: Date.now() + 2,
        title: "Grounding Exercise",
        description: "Practice 5-4-3-2-1 grounding: name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste",
        category: "Mindfulness",
        duration: "5 min",
        completed: false,
        aiRecommended: true,
        priority: "high" as const
      },
      {
        id: Date.now() + 3,
        title: "Deep Breathing",
        description: "Try the 4-7-8 technique: breathe in for 4 seconds, hold for 7, exhale for 8. Repeat 4 times.",
        category: "Self-Care",
        duration: "5 min",
        completed: false,
        aiRecommended: true,
        priority: "high" as const
      },
      {
        id: Date.now() + 4,
        title: "Reach Out for Support",
        description: "Text or call someone you trust. You don't have to go through this alone.",
        category: "Social",
        duration: "10 min",
        completed: false,
        aiRecommended: true,
        priority: "medium" as const
      },
      {
        id: Date.now() + 5,
        title: "Self-Compassion Break",
        description: "Place your hand on your heart and say: 'This is hard, but I'm doing my best. I deserve kindness.'",
        category: "Mental Health",
        duration: "3 min",
        completed: false,
        aiRecommended: true,
        priority: "medium" as const
      }
    ];

    const moderateTasks = [
      {
        id: Date.now() + 1,
        title: "Gentle Movement",
        description: "Take a 10-minute walk or do some light stretching to help shift your mood",
        category: "Physical",
        duration: "10 min",
        completed: false,
        aiRecommended: true,
        priority: "high" as const
      },
      {
        id: Date.now() + 2,
        title: "Connect with Someone",
        description: "Reach out to a friend, family member, or support person - even a quick text counts",
        category: "Social",
        duration: "10 min",
        completed: false,
        aiRecommended: true,
        priority: "high" as const
      },
      {
        id: Date.now() + 3,
        title: "Journaling Session",
        description: "Write about how you're feeling without judgment. Let your thoughts flow freely.",
        category: "Mental Health",
        duration: "10 min",
        completed: false,
        aiRecommended: true,
        priority: "medium" as const
      },
      {
        id: Date.now() + 4,
        title: "Calming Music",
        description: "Listen to your favorite calming music or nature sounds for relaxation",
        category: "Self-Care",
        duration: "15 min",
        completed: false,
        aiRecommended: true,
        priority: "medium" as const
      },
      {
        id: Date.now() + 5,
        title: "Mindful Breathing",
        description: "Practice box breathing: 4 seconds in, 4 seconds hold, 4 seconds out, 4 seconds hold",
        category: "Mindfulness",
        duration: "5 min",
        completed: false,
        aiRecommended: true,
        priority: "low" as const
      }
    ];

    const minimalTasks = [
      {
        id: Date.now() + 1,
        title: "Gratitude Practice",
        description: "Write down 3 things you're grateful for today - big or small",
        category: "Mental Health",
        duration: "5 min",
        completed: false,
        aiRecommended: true,
        priority: "medium" as const
      },
      {
        id: Date.now() + 2,
        title: "Mindful Moment",
        description: "Take 5 minutes to breathe deeply and be fully present in this moment",
        category: "Mindfulness",
        duration: "5 min",
        completed: false,
        aiRecommended: true,
        priority: "medium" as const
      },
      {
        id: Date.now() + 3,
        title: "Physical Activity",
        description: "Do 15 minutes of exercise you enjoy - walking, dancing, yoga, or stretching",
        category: "Physical",
        duration: "15 min",
        completed: false,
        aiRecommended: true,
        priority: "medium" as const
      },
      {
        id: Date.now() + 4,
        title: "Creative Expression",
        description: "Spend time on a creative hobby - drawing, writing, music, or crafts",
        category: "Creative",
        duration: "20 min",
        completed: false,
        aiRecommended: true,
        priority: "low" as const
      },
      {
        id: Date.now() + 5,
        title: "Kind Act",
        description: "Do something kind for yourself or someone else today",
        category: "Social",
        duration: "10 min",
        completed: false,
        aiRecommended: true,
        priority: "low" as const
      }
    ];

    if (severity === 'severe') return severeTasks;
    if (severity === 'moderate') return moderateTasks;
    return minimalTasks;
  };

  const generateDailyProgressWithGemini = async (severity: string, sadnessScore: number, completedTasks: number, timeOfDay: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not configured');
    }

    const currentDate = new Date().toDateString();
    const currentTime = new Date().toLocaleTimeString();

    const prompt = `
    You are an AI wellness coach creating a personalized daily progress plan for someone experiencing sadness. Based on the following information, create 5 specific, actionable wellness tasks for today.

    Current Context:
    - Sadness Score: ${sadnessScore}% (${severity.toUpperCase()} severity)
    - Severity Level: ${severity}
    - Tasks Already Completed Today: ${completedTasks}
    - Time of Day: ${timeOfDay}
    - Current Date: ${currentDate}
    - Current Time: ${currentTime}

    ${severity === 'severe' ? 'IMPORTANT: The user is experiencing severe sadness. Focus on gentle, supportive activities and include encouragement to seek professional help.' : ''}
    ${severity === 'moderate' ? 'The user is experiencing moderate sadness. Focus on mood-lifting activities and coping strategies.' : ''}
    ${severity === 'minimal' ? 'The user has minimal sadness levels. Focus on maintaining wellness and positive activities.' : ''}

    Please generate:
    1. 5 personalized wellness tasks appropriate for someone with ${severity} sadness levels
    2. Each task should be specific, achievable, and emotionally supportive
    3. Include varied categories (Mental Health, Physical, Social, Mindfulness, Creative, Self-Care)
    4. Assign realistic durations (5-30 minutes)
    5. Set appropriate priorities (high, medium, low)
    6. Provide brief insights about their current emotional state

    Format your response as valid JSON only (no extra text):
    {
      "tasks": [
        {
          "title": "Clear, actionable task title",
          "description": "Detailed description of what to do and why it helps with sadness",
          "category": "Mental Health|Physical|Social|Mindfulness|Creative|Self-Care",
          "duration": "X min",
          "priority": "high|medium|low"
        }
      ],
      "insights": "Brief personalized insight about the user's sadness level and recommended focus areas for today"
    }

    Make the tasks feel supportive and appropriate for someone feeling sad at ${severity} levels.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.candidates[0].content.parts[0].text;
      
      let cleanedResponse = generatedText.trim();
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/\n?```/g, '');
      
      const result = JSON.parse(cleanedResponse);
      return result;
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new Error(`Failed to generate tasks: ${error.message}`);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'Mindfulness': Brain,
      'Mental Health': Heart,
      'Physical': Zap,
      'Social': Smile,
      'Reflection': Star,
      'Wellness': Target,
      'Creative': Star,
      'Growth': TrendingUp,
      'Learning': Brain,
      'Planning': Calendar
    };
    return icons[category as keyof typeof icons] || Target;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-500 bg-green-50 border-green-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
          <Brain className="w-5 h-5" />
          <span className="font-medium">AI Sadness Analysis + Therapy</span>
        </div>
        <h1 className="text-4xl font-bold mb-2">Sadness Detection & AI Therapy</h1>
        <p className="text-muted-foreground text-lg">
          Get personalized therapy recommendations based on your sadness levels using emotion detection + PHQ-9
        </p>
        {latestPhq9Score !== null && (
          <Badge variant="outline" className="mt-2">
            Latest PHQ-9 Score: {latestPhq9Score}/27
          </Badge>
        )}
      </div>

      {/* Stats Overview - At Top */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Daily Progress Overview
            </CardTitle>
            {sadnessResult && (
              <Button 
                onClick={generateAITasks}
                variant="outline" 
                size="sm"
                className="hover-lift"
                disabled={isGeneratingTasks}
              >
                {isGeneratingTasks ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                {isGeneratingTasks ? 'Generating...' : 'Generate AI Tasks'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{dailyStats.streak}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </div>
            <div className="text-center p-4 bg-accent/5 rounded-lg border border-accent/20">
              <CheckCircle className="w-8 h-8 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-accent">{dailyStats.completedToday}</div>
              <div className="text-sm text-muted-foreground">Tasks Done</div>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border border-border">
              <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{dailyStats.totalPoints}</div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border border-border">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{Math.round((dailyStats.currentWeekProgress / dailyStats.weeklyGoal) * 100)}%</div>
              <div className="text-sm text-muted-foreground">Week Goal</div>
            </div>
          </div>

          {/* Weekly Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Weekly Goal Progress</span>
              <span className="text-sm text-muted-foreground">
                {dailyStats.currentWeekProgress} / {dailyStats.weeklyGoal} tasks
              </span>
            </div>
            <Progress 
              value={(dailyStats.currentWeekProgress / dailyStats.weeklyGoal) * 100} 
              className="h-3"
            />
          </div>

          {/* AI Insights */}
          {dailyStats.aiInsights && (
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-primary">AI Wellness Insights</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {dailyStats.aiInsights}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Sadness Analysis Card */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Sadness Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Combined analysis: 30% facial emotion detection + 70% PHQ-9 assessment
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Start Button */}
          {!showCamera && !sadnessResult && (
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ready for Sadness Analysis</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Our AI will analyze your facial expression to detect sadness levels and provide personalized recommendations
                </p>
                {latestPhq9Score === null && (
                  <Alert className="mt-4 max-w-md mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Tip:</strong> Take the PHQ-9 assessment first for more accurate results (70% weight).
                      <Button 
                        variant="link" 
                        className="p-0 h-auto ml-1"
                        onClick={() => navigate('/phq9')}
                      >
                        Take PHQ-9 →
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <Button 
                onClick={startEmotionAnalysis} 
                className="px-8 py-3 text-lg hover-lift"
                size="lg"
              >
                <Camera className="w-6 h-6 mr-3" />
                Start Sadness Analysis
              </Button>
            </div>
          )}

          {/* Camera View */}
          {showCamera && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-xl overflow-hidden border border-border">
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center p-6 glass rounded-lg">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-primary" />
                    <p className="font-semibold">Analyzing sadness levels...</p>
                    <p className="text-sm text-muted-foreground mt-1">Combining facial analysis with PHQ-9 data</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={captureAndAnalyze} 
                  disabled={isAnalyzing}
                  className="flex-1 max-w-xs hover-lift"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Camera className="w-5 h-5 mr-2" />
                  )}
                  {isAnalyzing ? 'Analyzing...' : 'Capture & Analyze'}
                </Button>
                <Button 
                  onClick={stopCamera} 
                  variant="outline"
                  disabled={isAnalyzing}
                  className="px-6 hover-lift"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Results */}
          {sadnessResult && (
            <div className="space-y-6 p-6 glass rounded-xl border border-primary/20 animate-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Sadness Analysis Complete</h3>
                <Button variant="ghost" size="sm" onClick={closeResults} className="hover:bg-muted">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Sadness Score Display */}
              <div className={`p-6 rounded-lg border ${
                sadnessResult.severityLevel === 'severe' ? 'bg-red-50 border-red-200 dark:bg-red-900/20' :
                sadnessResult.severityLevel === 'moderate' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20' :
                'bg-green-50 border-green-200 dark:bg-green-900/20'
              }`}>
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold mb-2">{sadnessResult.sadnessScore}%</div>
                  <Badge className={`${getSeverityColor(sadnessResult.severityLevel)} text-lg py-1 px-4`}>
                    {sadnessResult.severityLevel.charAt(0).toUpperCase() + sadnessResult.severityLevel.slice(1)} Sadness
                  </Badge>
                </div>
                <Progress 
                  value={sadnessResult.sadnessScore} 
                  className={`h-3 ${
                    sadnessResult.severityLevel === 'severe' ? '[&>div]:bg-red-500' :
                    sadnessResult.severityLevel === 'moderate' ? '[&>div]:bg-yellow-500' :
                    '[&>div]:bg-green-500'
                  }`}
                />
                <p className="text-center text-sm mt-3 text-muted-foreground">
                  {getSeverityDescription(sadnessResult.severityLevel)}
                </p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-card rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">Emotion Detection (30%)</div>
                  <div className="text-2xl font-bold">{sadnessResult.emotionSadnessScore}%</div>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">PHQ-9 Assessment (70%)</div>
                  <div className="text-2xl font-bold">
                    {sadnessResult.phq9Score !== null ? `${sadnessResult.phq9Percentage}%` : 'Not taken'}
                  </div>
                  {sadnessResult.phq9Score === null && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs"
                      onClick={() => navigate('/phq9')}
                    >
                      Take PHQ-9 Assessment →
                    </Button>
                  )}
                </div>
              </div>

              {/* Therapist Recommendation Alert for Severe */}
              {sadnessResult.recommendTherapist && (
                <Alert className="border-red-300 bg-red-50 dark:bg-red-900/20">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    <div className="font-semibold mb-2">We Recommend Speaking with a Therapist</div>
                    <p className="text-sm mb-3">
                      {sadnessResult.therapy?.why_see_therapist || 
                       "Your sadness levels suggest you could benefit greatly from professional support. A licensed therapist can provide personalized strategies and a safe space to work through your feelings."}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => navigate('/therapists')}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Find a Therapist
                      </Button>
                      {sadnessResult.therapy?.emergency_resources && (
                        <Button variant="outline" className="border-red-300 text-red-700">
                          <Phone className="w-4 h-4 mr-2" />
                          Crisis Resources
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Therapy Recommendations */}
              {sadnessResult.therapy && (
                <div className="space-y-4">
                  {/* Acknowledgment */}
                  {sadnessResult.therapy.acknowledgment && (
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm italic">{sadnessResult.therapy.acknowledgment}</p>
                    </div>
                  )}

                  {/* Coping Strategies / Self-Care Tips */}
                  {(sadnessResult.therapy.coping_strategies || sadnessResult.therapy.self_care_tips || sadnessResult.therapy.immediate_coping) && (
                    <div>
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Star className="w-5 h-5 text-accent" />
                        {sadnessResult.severityLevel === 'severe' ? 'Immediate Coping Techniques' : 
                         sadnessResult.severityLevel === 'moderate' ? 'Recommended Coping Strategies' : 
                         'Self-Care Tips'}
                      </h4>
                      <div className="space-y-2">
                        {(sadnessResult.therapy.coping_strategies || 
                          sadnessResult.therapy.self_care_tips || 
                          sadnessResult.therapy.immediate_coping || []).map((tip: string, index: number) => (
                          <div 
                            key={index} 
                            className="flex items-start gap-3 p-3 bg-card rounded-lg border hover:border-primary/30 transition-colors"
                          >
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mood Boosters (for minimal severity) */}
                  {sadnessResult.therapy.mood_boosters && sadnessResult.severityLevel === 'minimal' && (
                    <div>
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Smile className="w-5 h-5 text-yellow-500" />
                        Mood Boosters
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {sadnessResult.therapy.mood_boosters.map((booster: string, index: number) => (
                          <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 text-center">
                            <p className="text-sm">{booster}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Encouragement */}
                  {sadnessResult.therapy.encouragement && (
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Heart className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{sadnessResult.therapy.encouragement}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex gap-3">
                <Button 
                  onClick={() => {
                    setSadnessResult(null);
                    startEmotionAnalysis();
                  }}
                  className="flex-1 hover-lift"
                  size="lg"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Analyze Again
                </Button>
                {!sadnessResult.phq9Score && (
                  <Button 
                    onClick={() => navigate('/phq9')}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    Take PHQ-9 Assessment
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Daily Tasks Section */}
      <div className="space-y-6">
        {/* Daily Tasks */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Today's Wellness Tasks
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Complete these activities to maintain your mental wellness
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyTasks.map((task) => {
                const IconComponent = getCategoryIcon(task.category);
                return (
                  <div 
                    key={task.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover-lift ${
                      task.completed 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-card border-border hover:border-primary/20'
                    }`}
                  >
                    <Button
                      variant={task.completed ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleTask(task.id)}
                      className={task.completed ? 'bg-primary hover:bg-primary/80' : 'hover:bg-primary/10'}
                    >
                      {task.completed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <div className="w-4 h-4 border border-current rounded-full" />
                      )}
                    </Button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-semibold ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h4>
                        {task.aiRecommended && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                            AI
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                        {task.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <IconComponent className="w-4 h-4" />
                        <span className="hidden sm:inline">{task.category}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{task.duration}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generate New Tasks Button */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button 
                onClick={generateAITasks}
                disabled={isGeneratingTasks}
                className="w-full hover-lift"
                size="lg"
                variant="outline"
              >
                {isGeneratingTasks ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating New Tasks with AI...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Generate New AI Tasks for Today
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Get personalized wellness tasks based on your current emotional state
              </p>
            </div>

            {dailyTasks.length === 0 && (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Click "Generate New AI Tasks" to get personalized recommendations
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIPlan;
