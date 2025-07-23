import { useState, useEffect } from 'react'
import { History, Calendar, TrendingUp, Award, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import blink from '@/blink/client'
import { Workout, WorkoutExercise, Exercise, ExerciseSet, ExerciseProgress } from '@/types'

interface WorkoutWithDetails extends Workout {
  exercises: (WorkoutExercise & { exercise: Exercise; sets: ExerciseSet[] })[]
}

export default function HistoryPage() {
  const [completedWorkouts, setCompletedWorkouts] = useState<WorkoutWithDetails[]>([])
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithDetails | null>(null)

  const loadHistory = async () => {
    try {
      const user = await blink.auth.me()
      
      // Загружаем завершенные тренировки
      const workouts = await blink.db.workouts.list({
        where: { 
          userId: user.id,
          status: 'completed'
        },
        orderBy: { completedAt: 'desc' }
      })

      // Загружаем детали для каждой тренировки
      const workoutsWithDetails = await Promise.all(
        workouts.map(async (workout) => {
          const workoutExercises = await blink.db.workoutExercises.list({
            where: { workoutId: workout.id },
            orderBy: { orderIndex: 'asc' }
          })

          const exercisesWithDetails = await Promise.all(
            workoutExercises.map(async (we) => {
              const exercise = await blink.db.exercises.list({
                where: { id: we.exerciseId },
                limit: 1
              })

              const sets = await blink.db.exerciseSets.list({
                where: { workoutExerciseId: we.id },
                orderBy: { setNumber: 'asc' }
              })

              return { ...we, exercise: exercise[0], sets }
            })
          )

          return { ...workout, exercises: exercisesWithDetails }
        })
      )

      setCompletedWorkouts(workoutsWithDetails)

      // Загружаем прогресс по упражнениям
      const progress = await blink.db.exerciseProgress.list({
        where: { userId: user.id },
        orderBy: { workoutDate: 'desc' }
      })
      setExerciseProgress(progress)

    } catch (error) {
      console.error('Ошибка загрузки истории:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const getWorkoutStats = (workout: WorkoutWithDetails) => {
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
    const completedSets = workout.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => Number(s.completed) > 0).length, 
      0
    )
    const totalWeight = workout.exercises.reduce(
      (sum, ex) => sum + ex.sets.reduce((setSum, s) => setSum + (s.weight * s.reps), 0),
      0
    )
    const achievedExercises = workout.exercises.filter(ex => Number(ex.weightAchieved) > 0).length

    return {
      totalSets,
      completedSets,
      totalWeight: Math.round(totalWeight),
      achievedExercises,
      completionRate: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
    }
  }

  const getExerciseProgressTrend = (exerciseId: string) => {
    const exerciseProgressData = exerciseProgress
      .filter(p => p.exerciseId === exerciseId)
      .slice(0, 5) // Последние 5 тренировок
      .reverse()

    if (exerciseProgressData.length < 2) return null

    const firstWeight = exerciseProgressData[0].weight
    const lastWeight = exerciseProgressData[exerciseProgressData.length - 1].weight
    const trend = lastWeight > firstWeight ? 'up' : lastWeight < firstWeight ? 'down' : 'stable'
    const change = Math.abs(lastWeight - firstWeight)

    return { trend, change, data: exerciseProgressData }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTotalStats = () => {
    const totalWorkouts = completedWorkouts.length
    const totalSets = completedWorkouts.reduce((sum, w) => sum + getWorkoutStats(w).totalSets, 0)
    const totalWeight = completedWorkouts.reduce((sum, w) => sum + getWorkoutStats(w).totalWeight, 0)
    const avgCompletion = totalWorkouts > 0 
      ? Math.round(completedWorkouts.reduce((sum, w) => sum + getWorkoutStats(w).completionRate, 0) / totalWorkouts)
      : 0

    return { totalWorkouts, totalSets, totalWeight, avgCompletion }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const totalStats = getTotalStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">История тренировок</h2>
        <p className="text-muted-foreground">
          Отслеживайте свой прогресс и достижения
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{totalStats.totalWorkouts}</div>
            <p className="text-sm text-muted-foreground">Тренировок</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">{totalStats.totalSets}</div>
            <p className="text-sm text-muted-foreground">Подходов</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalStats.totalWeight}</div>
            <p className="text-sm text-muted-foreground">Кг поднято</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalStats.avgCompletion}%</div>
            <p className="text-sm text-muted-foreground">Выполнение</p>
          </CardContent>
        </Card>
      </div>

      {/* Workout History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Завершенные тренировки</h3>
        
        {completedWorkouts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Нет завершенных тренировок</h3>
              <p className="text-muted-foreground">
                Завершите первую тренировку, чтобы увидеть статистику
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {completedWorkouts.map((workout) => {
              const stats = getWorkoutStats(workout)
              return (
                <Card key={workout.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{workout.name}</h4>
                          <Badge variant="secondary">{workout.muscleGroup}</Badge>
                          {stats.completionRate === 100 && (
                            <Badge variant="default" className="bg-green-600">
                              <Award className="w-3 h-3 mr-1" />
                              Завершено
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(workout.completedAt || workout.createdAt)}
                          </div>
                          <span>{stats.completedSets}/{stats.totalSets} подходов</span>
                          <span>{stats.totalWeight} кг</span>
                          <span>{stats.completionRate}% выполнено</span>
                        </div>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{workout.name}</DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <div className="text-lg font-bold">{stats.completedSets}/{stats.totalSets}</div>
                                <p className="text-xs text-muted-foreground">Подходы</p>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold">{stats.totalWeight}</div>
                                <p className="text-xs text-muted-foreground">Кг поднято</p>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold">{stats.achievedExercises}/{workout.exercises.length}</div>
                                <p className="text-xs text-muted-foreground">Вес взят</p>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold">{stats.completionRate}%</div>
                                <p className="text-xs text-muted-foreground">Выполнено</p>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-4">
                              <h4 className="font-medium">Упражнения</h4>
                              {workout.exercises.map((exercise, index) => {
                                const trend = getExerciseProgressTrend(exercise.exerciseId)
                                return (
                                  <div key={exercise.id} className="border rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs">
                                          {index + 1}
                                        </span>
                                        <span className="font-medium">{exercise.exercise.name}</span>
                                        {Number(exercise.weightAchieved) > 0 && (
                                          <Badge variant="default" className="bg-green-600">
                                            Вес взят
                                          </Badge>
                                        )}
                                      </div>
                                      {trend && (
                                        <div className="flex items-center gap-1 text-sm">
                                          <TrendingUp 
                                            className={`w-4 h-4 ${
                                              trend.trend === 'up' ? 'text-green-600' : 
                                              trend.trend === 'down' ? 'text-red-600' : 
                                              'text-gray-600'
                                            }`} 
                                          />
                                          <span className="text-muted-foreground">
                                            {trend.trend === 'up' ? '+' : trend.trend === 'down' ? '-' : ''}
                                            {trend.change} кг
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                      {exercise.sets.map((set) => (
                                        <div 
                                          key={set.id} 
                                          className={`p-2 rounded text-center ${
                                            Number(set.completed) > 0 
                                              ? 'bg-green-100 text-green-800' 
                                              : 'bg-gray-100 text-gray-600'
                                          }`}
                                        >
                                          <div className="font-medium">{set.reps} × {set.weight}кг</div>
                                          <div className="text-xs">Подход {set.setNumber}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}