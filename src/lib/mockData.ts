// Mock data for the mental health platform

export type UserRole = 'patient' | 'therapist';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Therapist {
  id: string;
  name: string;
  specialization: string[];
  rating: number;
  reviewCount: number;
  price: number;
  languages: string[];
  avatar: string;
  nextAvailable?: string;
  bio: string;
}

export interface Session {
  id: string;
  therapistId: string;
  patientId: string;
  date: string;
  time: string;
  duration: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
}

export interface PHQ9Result {
  id: string;
  patientId: string;
  date: string;
  score: number;
  answers: number[];
  riskLevel: 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe';
}

export interface Slot {
  id: string;
  therapistId: string;
  date: string;
  time: string;
  available: boolean;
}

export interface AIPlan {
  id: string;
  patientId: string;
  week: number;
  tasks: {
    id: string;
    day: number;
    title: string;
    description: string;
    completed: boolean;
  }[];
}

// Mock current user
export const currentUser: User = {
  id: '1',
  name: 'Alex Johnson',
  email: 'alex@example.com',
  role: 'patient',
  avatar: '/image.png',
};

// Mock therapists
export const mockTherapists: Therapist[] = [
  {
    id: 't1',
    name: 'Dr. Sarah Mitchell',
    specialization: ['Anxiety', 'Depression', 'CBT'],
    rating: 4.9,
    reviewCount: 127,
    price: 120,
    languages: ['English', 'Spanish'],
    avatar: '/image.png',
    nextAvailable: '2025-01-15T10:00:00',
    bio: 'Specialized in cognitive behavioral therapy with 10+ years of experience.',
  },
  {
    id: 't2',
    name: 'Dr. Michael Chen',
    specialization: ['PTSD', 'Trauma', 'EMDR'],
    rating: 4.8,
    reviewCount: 89,
    price: 150,
    languages: ['English', 'Mandarin'],
    avatar: '/image.png',
    nextAvailable: '2025-01-16T14:00:00',
    bio: 'Expert in trauma-focused therapy and EMDR techniques.',
  },
  {
    id: 't3',
    name: 'Dr. Emily Rodriguez',
    specialization: ['Relationships', 'Family Therapy', 'Stress'],
    rating: 4.7,
    reviewCount: 156,
    price: 110,
    languages: ['English', 'French'],
    avatar: '/image.png',
    nextAvailable: '2025-01-15T16:00:00',
    bio: 'Compassionate therapist focusing on relationship dynamics and stress management.',
  },
  {
    id: 't4',
    name: 'Dr. James Wilson',
    specialization: ['Addiction', 'Substance Abuse', 'Recovery'],
    rating: 4.9,
    reviewCount: 203,
    price: 140,
    languages: ['English'],
    avatar: '/image.png',
    nextAvailable: '2025-01-17T09:00:00',
    bio: 'Dedicated to helping individuals overcome addiction and build lasting recovery.',
  },
  {
    id: 't5',
    name: 'Dr. Lisa Anderson',
    specialization: ['Mindfulness', 'Meditation', 'Anxiety'],
    rating: 4.8,
    reviewCount: 94,
    price: 100,
    languages: ['English', 'German'],
    avatar: '/image.png',
    nextAvailable: '2025-01-15T11:00:00',
    bio: 'Integrating mindfulness and meditation into evidence-based therapy.',
  },
  {
    id: 't6',
    name: 'Dr. David Park',
    specialization: ['OCD', 'Phobias', 'Exposure Therapy'],
    rating: 4.9,
    reviewCount: 178,
    price: 135,
    languages: ['English', 'Korean'],
    avatar: '/image.png',
    nextAvailable: '2025-01-16T13:00:00',
    bio: 'Specializing in exposure therapy for OCD and anxiety disorders.',
  },
];

// Mock sessions
export const mockSessions: Session[] = [
  {
    id: 's1',
    therapistId: 't1',
    patientId: '1',
    date: '2025-01-20',
    time: '10:00',
    duration: 60,
    status: 'upcoming',
  },
  {
    id: 's2',
    therapistId: 't1',
    patientId: '1',
    date: '2025-01-13',
    time: '10:00',
    duration: 60,
    status: 'completed',
    notes: 'Made good progress on anxiety management techniques.',
  },
  {
    id: 's3',
    therapistId: 't2',
    patientId: '1',
    date: '2025-01-27',
    time: '14:00',
    duration: 60,
    status: 'upcoming',
  },
];

// Mock PHQ-9 results
export const mockPHQ9Result: PHQ9Result = {
  id: 'phq1',
  patientId: '1',
  date: '2025-01-10',
  score: 12,
  answers: [2, 1, 2, 1, 2, 1, 2, 0, 1],
  riskLevel: 'moderate',
};

// PHQ-9 questions
export const phq9Questions = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself or that you are a failure',
  'Trouble concentrating on things',
  'Moving or speaking slowly, or being fidgety or restless',
  'Thoughts that you would be better off dead or hurting yourself',
];

// Mock AI plan
export const mockAIPlan: AIPlan = {
  id: 'plan1',
  patientId: '1',
  week: 1,
  tasks: [
    {
      id: 'task1',
      day: 1,
      title: 'Morning Meditation',
      description: '10 minutes of guided breathing meditation',
      completed: true,
    },
    {
      id: 'task2',
      day: 1,
      title: 'Gratitude Journal',
      description: 'Write down 3 things you are grateful for',
      completed: true,
    },
    {
      id: 'task3',
      day: 2,
      title: 'Nature Walk',
      description: '20-minute walk in nature or a park',
      completed: true,
    },
    {
      id: 'task4',
      day: 2,
      title: 'Social Connection',
      description: 'Reach out to a friend or family member',
      completed: false,
    },
    {
      id: 'task5',
      day: 3,
      title: 'Mindful Eating',
      description: 'Practice mindful eating for one meal',
      completed: false,
    },
    {
      id: 'task6',
      day: 3,
      title: 'Progressive Muscle Relaxation',
      description: '15-minute PMR exercise before bed',
      completed: false,
    },
    {
      id: 'task7',
      day: 4,
      title: 'Creative Expression',
      description: 'Spend 30 minutes on a creative hobby',
      completed: false,
    },
    {
      id: 'task8',
      day: 5,
      title: 'Physical Activity',
      description: '30 minutes of moderate exercise',
      completed: false,
    },
    {
      id: 'task9',
      day: 6,
      title: 'Digital Detox',
      description: '1 hour without screens before bedtime',
      completed: false,
    },
    {
      id: 'task10',
      day: 7,
      title: 'Self-Reflection',
      description: 'Review your week and set intentions',
      completed: false,
    },
  ],
};

// Mock slots for therapist
export const mockSlots: Slot[] = [
  {
    id: 'slot1',
    therapistId: 't1',
    date: '2025-01-20',
    time: '09:00',
    available: true,
  },
  {
    id: 'slot2',
    therapistId: 't1',
    date: '2025-01-20',
    time: '10:00',
    available: false,
  },
  {
    id: 'slot3',
    therapistId: 't1',
    date: '2025-01-20',
    time: '14:00',
    available: true,
  },
];
