export interface Exercise {
  id: string
  userId: string
  name: string
  muscleGroup: string
  weightType: 'bodyweight' | 'assisted' | 'weighted'
  technique?: string
  sets: number
  reps: number
  equipmentSetup?: string
  exerciseType: 'main' | 'auxiliary' | 'isolation'
  equipmentName?: string
  equipmentPhoto?: string
  createdAt: string
  updatedAt: string
}

export interface Workout {
  id: string
  userId: string
  name: string
  muscleGroups: string[]
  muscleGroup?: string // Для обратной совместимости
  status: 'planned' | 'active' | 'completed'
  createdAt: string
  completedAt?: string
}

export interface WorkoutExercise {
  id: string
  workoutId: string
  exerciseId: string
  orderIndex: number
  currentWeight: number
  weightAchieved: number
  createdAt: string
  exercise?: Exercise
}

export interface ExerciseSet {
  id: string
  workoutExerciseId: string
  setNumber: number
  reps: number
  weight: number
  completed: number
  createdAt: string
}

export interface ExerciseProgress {
  id: string
  userId: string
  exerciseId: string
  weight: number
  achieved: number
  workoutDate: string
  createdAt: string
}

export const MUSCLE_GROUPS = [
  'Грудь',
  'Спина',
  'Плечи',
  'Бицепс',
  'Трицепс',
  'Ноги',
  'Пресс',
  'Предплечья'
] as const

export const EXERCISE_TYPES = [
  { value: 'main', label: 'Основное' },
  { value: 'auxiliary', label: 'Вспомогательное' },
  { value: 'isolation', label: 'Изолированное' }
] as const

export const WEIGHT_TYPES = [
  { value: 'bodyweight', label: 'Свой вес' },
  { value: 'assisted', label: 'Антивес' },
  { value: 'weighted', label: 'Доп. вес' }
] as const