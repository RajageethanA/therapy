import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with API key
const API_KEY = 'AIzaSyCgM-RZAykjiNVbTpG5wcFUvT7-s1hf6II';
const genAI = new GoogleGenerativeAI(API_KEY);

// Get the Gemini model
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export interface EmotionAnalysis {
  emotion: string;
  confidence: number;
  moodCategory: 'depressed' | 'normal';
}

export interface AIRecommendation {
  title: string;
  description: string;
  category: 'remedy' | 'habit' | 'exercise' | 'meditation' | 'lifestyle';
  icon: string;
  priority: 'high' | 'medium' | 'low';
  timeToComplete: string;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  category: 'wellness' | 'mindfulness' | 'physical' | 'social' | 'personal';
  difficulty: 'easy' | 'medium' | 'challenging';
  estimatedTime: string;
  points: number;
  completed: boolean;
  icon: string;
  motivation: string;
  benefits: string[];
  tips: string[];
}

export interface UserProgress {
  currentStreak: number;
  totalPoints: number;
  completedTasksToday: number;
  totalTasksToday: number;
  weeklyGoal: number;
  emotionalTrend: 'improving' | 'stable' | 'declining';
  lastEmotions: string[];
}

export interface DailyPlan {
  date: string;
  theme: string;
  motivationalMessage: string;
  tasks: DailyTask[];
  reflectionQuestions: string[];
  expectedOutcomes: string[];
}

export async function generatePersonalizedRecommendations(
  emotionAnalysis: EmotionAnalysis,
  userContext?: {
    timeOfDay?: string;
    previousRecommendations?: string[];
    userPreferences?: string[];
  }
): Promise<AIRecommendation[]> {
  try {
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
    
    const prompt = `
You are a professional mental health AI assistant. Based on the following emotional analysis, provide personalized wellness recommendations.

EMOTIONAL STATE:
- Detected Emotion: ${emotionAnalysis.emotion}
- Confidence Level: ${Math.round(emotionAnalysis.confidence * 100)}%
- Overall Mood Category: ${emotionAnalysis.moodCategory}
- Current Time: ${timeOfDay}

CONTEXT:
- User is using a mental health therapy app
- Recommendations should be practical and actionable
- Focus on immediate relief and long-term wellness
- Consider the time of day for appropriate activities

REQUIREMENTS:
Please provide exactly 4 personalized recommendations in the following JSON format:
[
  {
    "title": "Short actionable title",
    "description": "Detailed explanation of the activity and its benefits (2-3 sentences)",
    "category": "remedy|habit|exercise|meditation|lifestyle",
    "icon": "appropriate emoji that represents the activity",
    "priority": "high|medium|low",
    "timeToComplete": "estimated time like '5-10 minutes' or '15-20 minutes'"
  }
]

GUIDELINES:
- For negative emotions (sad, angry, fearful, disgusted): Focus on calming, grounding, and mood-lifting activities
- For positive emotions (happy, neutral, surprised): Focus on maintaining wellness and building resilience
- Make recommendations specific and personalized to the detected emotion
- Include a mix of immediate relief and longer-term wellness strategies
- Ensure activities are appropriate for the current time of day
- Use encouraging and professional language
- Prioritize evidence-based mental health practices

Respond ONLY with the JSON array, no additional text.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    try {
      const recommendations = JSON.parse(text.trim());
      
      // Validate the response structure
      if (Array.isArray(recommendations) && recommendations.length > 0) {
        return recommendations.filter(rec => 
          rec.title && rec.description && rec.category && rec.icon && rec.priority && rec.timeToComplete
        );
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      throw new Error('Failed to parse AI recommendations');
    }
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    
    // Fallback recommendations if API fails
    return getFallbackRecommendations(emotionAnalysis);
  }
}

// Fallback recommendations in case API fails
function getFallbackRecommendations(emotionAnalysis: EmotionAnalysis): AIRecommendation[] {
  if (emotionAnalysis.moodCategory === 'depressed') {
    return [
      {
        title: "Practice Deep Breathing",
        description: "Try the 4-7-8 breathing technique: breathe in for 4, hold for 7, exhale for 8. This activates your parasympathetic nervous system to reduce anxiety and promote calm.",
        category: "remedy",
        icon: "🧘‍♀️",
        priority: "high",
        timeToComplete: "5-10 minutes"
      },
      {
        title: "Take a Mindful Walk",
        description: "Step outside for a gentle walk while paying attention to your surroundings. Fresh air and movement can boost endorphins and provide natural mood enhancement.",
        category: "exercise",
        icon: "🚶‍♂️",
        priority: "high",
        timeToComplete: "15-20 minutes"
      },
      {
        title: "Write Three Gratitudes",
        description: "List three things you're grateful for today, no matter how small. This practice helps shift focus from negative thoughts to positive aspects of your life.",
        category: "habit",
        icon: "📝",
        priority: "medium",
        timeToComplete: "5 minutes"
      },
      {
        title: "Listen to Calming Music",
        description: "Choose soft, instrumental music or nature sounds. Music therapy can help regulate emotions and reduce stress hormones like cortisol.",
        category: "remedy",
        icon: "🎵",
        priority: "medium",
        timeToComplete: "10-15 minutes"
      }
    ];
  } else {
    return [
      {
        title: "Maintain Your Energy",
        description: "Engage in light physical activity like stretching or dancing to maintain your positive momentum and boost endorphins naturally.",
        category: "exercise",
        icon: "💪",
        priority: "medium",
        timeToComplete: "10-15 minutes"
      },
      {
        title: "Share Your Joy",
        description: "Reach out to a friend or family member to share something positive. Social connection amplifies good feelings and strengthens relationships.",
        category: "lifestyle",
        icon: "😊",
        priority: "high",
        timeToComplete: "10-20 minutes"
      },
      {
        title: "Practice Mindful Appreciation",
        description: "Take a moment to mindfully observe and appreciate something beautiful around you. This builds resilience and maintains positive mental state.",
        category: "meditation",
        icon: "🌟",
        priority: "medium",
        timeToComplete: "5 minutes"
      },
      {
        title: "Set a Positive Intention",
        description: "Write down one positive intention or goal for the rest of your day. This helps channel your good energy into productive action.",
        category: "habit",
        icon: "🎯",
        priority: "low",
        timeToComplete: "5 minutes"
      }
    ];
  }
}

export async function generateDailyPlan(
  userProgress: UserProgress,
  recentEmotions: EmotionAnalysis[],
  userPreferences?: {
    preferredCategories?: string[];
    availableTime?: number; // minutes
    fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
    challenges?: string[];
  }
): Promise<DailyPlan> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
    
    // Analyze emotional trend
    const emotionalSummary = recentEmotions.length > 0 
      ? recentEmotions.map(e => e.emotion).join(', ')
      : 'neutral';
    
    const prompt = `
You are an expert mental health AI coach creating a personalized daily wellness plan. Generate a comprehensive daily plan based on the user's progress and emotional state.

USER PROFILE:
- Current Streak: ${userProgress.currentStreak} days
- Total Points: ${userProgress.totalPoints}
- Today's Progress: ${userProgress.completedTasksToday}/${userProgress.totalTasksToday}
- Weekly Goal: ${userProgress.weeklyGoal} tasks
- Emotional Trend: ${userProgress.emotionalTrend}
- Recent Emotions: ${emotionalSummary}

CONTEXT:
- Day: ${dayOfWeek}
- Date: ${today}
- Time: ${timeOfDay}
- Available Time: ${userPreferences?.availableTime || 60} minutes
- Fitness Level: ${userPreferences?.fitnessLevel || 'beginner'}

REQUIREMENTS:
Create exactly 5 personalized daily tasks that are:
1. Appropriate for current emotional state and progress
2. Progressive difficulty based on user's streak
3. Varied categories for holistic wellness
4. Realistic and achievable
5. Evidence-based mental health practices

Return JSON in this exact format:
{
  "date": "${today}",
  "theme": "A motivational theme for today (e.g., 'Building Resilience', 'Finding Balance')",
  "motivationalMessage": "Personalized encouraging message based on user's progress (2-3 sentences)",
  "tasks": [
    {
      "id": "task_1",
      "title": "Short, actionable title",
      "description": "Clear description of what to do and how",
      "category": "wellness|mindfulness|physical|social|personal",
      "difficulty": "easy|medium|challenging",
      "estimatedTime": "X minutes or X-Y minutes",
      "points": 10-30,
      "completed": false,
      "icon": "appropriate emoji",
      "motivation": "Why this task matters for them today",
      "benefits": ["benefit 1", "benefit 2", "benefit 3"],
      "tips": ["helpful tip 1", "helpful tip 2"]
    }
  ],
  "reflectionQuestions": [
    "2-3 thoughtful questions for end-of-day reflection"
  ],
  "expectedOutcomes": [
    "What the user can expect to feel/gain from completing today's plan"
  ]
}

GUIDELINES:
- For struggling users (declining trend): Focus on gentle, achievable tasks
- For improving users: Include slightly challenging growth tasks
- For stable users: Maintain momentum with varied activities
- Balance immediate mood boosters with long-term habit building
- Consider day of week (lighter tasks for Monday, energizing for Friday)
- Points: Easy (10-15), Medium (15-25), Challenging (20-30)

Respond ONLY with the JSON object, no additional text.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const dailyPlan = JSON.parse(text.trim()) as DailyPlan;
      
      // Validate the response structure
      if (dailyPlan.tasks && dailyPlan.tasks.length > 0) {
        return dailyPlan;
      } else {
        throw new Error('Invalid daily plan structure');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini daily plan response:', text);
      throw new Error('Failed to parse daily plan');
    }
    
  } catch (error) {
    console.error('Error generating daily plan:', error);
    
    // Fallback daily plan
    return getFallbackDailyPlan(userProgress, recentEmotions);
  }
}

// Fallback daily plan generator
function getFallbackDailyPlan(userProgress: UserProgress, recentEmotions: EmotionAnalysis[]): DailyPlan {
  const today = new Date().toISOString().split('T')[0];
  const isStrugglingDay = userProgress.emotionalTrend === 'declining' || 
    recentEmotions.some(e => ['sad', 'angry', 'fearful', 'disgusted'].includes(e.emotion));
  
  return {
    date: today,
    theme: isStrugglingDay ? "Gentle Self-Care" : "Building Momentum",
    motivationalMessage: isStrugglingDay 
      ? "Today is about small steps and self-compassion. Every little action counts towards your wellbeing."
      : `Great job maintaining your ${userProgress.currentStreak}-day streak! Let's build on this positive momentum.`,
    tasks: [
      {
        id: "task_1",
        title: "Morning Mindfulness",
        description: "Start your day with 5 minutes of deep breathing or meditation",
        category: "mindfulness",
        difficulty: "easy",
        estimatedTime: "5 minutes",
        points: 15,
        completed: false,
        icon: "🧘‍♀️",
        motivation: "Set a calm, positive tone for your entire day",
        benefits: ["Reduces anxiety", "Improves focus", "Increases self-awareness"],
        tips: ["Find a quiet spot", "Use a meditation app if needed"]
      },
      {
        id: "task_2",
        title: "Physical Movement",
        description: isStrugglingDay ? "Take a gentle 10-minute walk outside" : "Do 15 minutes of exercise or stretching",
        category: "physical",
        difficulty: isStrugglingDay ? "easy" : "medium",
        estimatedTime: isStrugglingDay ? "10 minutes" : "15 minutes",
        points: isStrugglingDay ? 15 : 20,
        completed: false,
        icon: "🚶‍♂️",
        motivation: "Movement releases endorphins and boosts energy naturally",
        benefits: ["Improves mood", "Increases energy", "Supports physical health"],
        tips: ["Start slow", "Focus on how movement makes you feel"]
      },
      {
        id: "task_3",
        title: "Gratitude Practice",
        description: "Write down 3 things you're grateful for today",
        category: "wellness",
        difficulty: "easy",
        estimatedTime: "5 minutes",
        points: 10,
        completed: false,
        icon: "📝",
        motivation: "Shift your mindset towards positivity and abundance",
        benefits: ["Increases happiness", "Improves perspective", "Reduces stress"],
        tips: ["Be specific", "Include both big and small things"]
      },
      {
        id: "task_4",
        title: "Social Connection",
        description: "Reach out to one person you care about - text, call, or meet",
        category: "social",
        difficulty: "medium",
        estimatedTime: "10-20 minutes",
        points: 20,
        completed: false,
        icon: "💬",
        motivation: "Human connection is essential for mental wellbeing",
        benefits: ["Reduces loneliness", "Strengthens relationships", "Provides support"],
        tips: ["Keep it simple", "Share something positive"]
      },
      {
        id: "task_5",
        title: "Personal Growth",
        description: isStrugglingDay ? "Read or listen to something inspiring for 10 minutes" : "Learn something new or work on a personal goal",
        category: "personal",
        difficulty: isStrugglingDay ? "easy" : "challenging",
        estimatedTime: isStrugglingDay ? "10 minutes" : "20-30 minutes",
        points: isStrugglingDay ? 15 : 25,
        completed: false,
        icon: "📚",
        motivation: "Continuous growth keeps you engaged and fulfilled",
        benefits: ["Builds confidence", "Expands knowledge", "Creates sense of progress"],
        tips: ["Choose something genuinely interesting", "Set small, achievable goals"]
      }
    ],
    reflectionQuestions: [
      "What was the highlight of your day today?",
      "How did completing your wellness tasks make you feel?",
      "What's one thing you learned about yourself today?"
    ],
    expectedOutcomes: [
      "Increased sense of calm and focus from mindfulness practice",
      "Improved mood and energy from physical activity",
      "Stronger feeling of gratitude and positivity",
      "Enhanced social connections and support",
      "Greater sense of personal growth and achievement"
    ]
  };
}

export async function generateProgressInsights(
  completedTasks: DailyTask[],
  emotionalHistory: EmotionAnalysis[],
  streakData: { current: number; longest: number }
): Promise<{
  insights: string[];
  recommendations: string[];
  celebration: string;
  nextGoals: string[];
}> {
  try {
    const prompt = `
You are a mental health AI analyst providing insights on a user's wellness progress.

PROGRESS DATA:
- Tasks Completed Today: ${completedTasks.length}
- Completed Categories: ${[...new Set(completedTasks.map(t => t.category))].join(', ')}
- Total Points Earned: ${completedTasks.reduce((sum, t) => sum + t.points, 0)}
- Current Streak: ${streakData.current} days
- Longest Streak: ${streakData.longest} days
- Recent Emotions: ${emotionalHistory.slice(-5).map(e => e.emotion).join(', ')}

Generate insights and recommendations in JSON format:
{
  "insights": ["3-4 meaningful observations about their progress patterns"],
  "recommendations": ["2-3 specific suggestions for continued growth"],
  "celebration": "Personalized celebration message for their achievements",
  "nextGoals": ["2-3 achievable goals for tomorrow/this week"]
}

Focus on positive reinforcement while providing actionable guidance.
Respond ONLY with the JSON object.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error('Error generating progress insights:', error);
    return {
      insights: [
        "You're building consistent healthy habits through daily practice",
        "Your engagement with wellness activities shows commitment to growth",
        "Each completed task contributes to your overall mental wellbeing"
      ],
      recommendations: [
        "Continue with the activities that feel most natural to you",
        "Try gradually increasing the challenge of tasks you enjoy",
        "Remember that consistency matters more than perfection"
      ],
      celebration: `Amazing work on maintaining your ${streakData.current}-day streak! Your dedication to wellness is inspiring.`,
      nextGoals: [
        "Try a new category of wellness activity",
        "Increase your daily task completion rate",
        "Share your progress with someone you trust"
      ]
    };
  }
}

export default { 
  generatePersonalizedRecommendations, 
  generateDailyPlan, 
  generateProgressInsights 
};