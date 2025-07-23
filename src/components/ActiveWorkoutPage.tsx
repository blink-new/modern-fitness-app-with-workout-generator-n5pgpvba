import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, Check, X, Weight, Shuffle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import blink from '@/blink/client'
import { Workout, WorkoutExercise, Exercise, ExerciseSet, EXERCISE_TYPES } from '@/types'

interface WorkoutWithExercises extends Workout {
  exercises: (WorkoutExercise & { exercise: Exercise })[]
}

export default function ActiveWorkoutPage() {
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([])
  const [activeWorkout, setActiveWorkout] = useState<WorkoutWithExercises | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([])
  const [loading, setLoading] = useState(true)
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])

  // Таймер
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const resetTimer = () => {
    setTimer(0)
    setIsTimerRunning(false)
  }

  const startTimer = () => setIsTimerRunning(true)
  const pauseTimer = () => setIsTimerRunning(false)

  // Загрузка подходов для упражнения
  const loadExerciseSets = useCallback(async (workoutExerciseId: string) => {
    try {
      console.log('Загружаем подходы для упражнения:', workoutExerciseId)
      
      let sets = await blink.db.exerciseSets.list({
        where: { workoutExerciseId },
        orderBy: { setNumber: 'asc' }
      })

      console.log('Найденные подходы:', sets)

      // Если подходов нет, создаем их
      if (sets.length === 0 && activeWorkout) {
        const currentExercise = activeWorkout.exercises[currentExerciseIndex]
        if (currentExercise) {
          console.log('Создаем подходы для упражнения:', currentExercise.exercise.name)
          
          const newSets = []
          for (let i = 1; i <= currentExercise.exercise.sets; i++) {
            const setId = `set_${Date.now()}_${i}`
            const newSet = {
              id: setId,
              workoutExerciseId,
              setNumber: i,
              reps: currentExercise.exercise.reps,
              weight: currentExercise.currentWeight || 0,
              completed: 0,
              createdAt: new Date().toISOString()
            }
            
            await blink.db.exerciseSets.create(newSet)
            newSets.push(newSet)
          }
          
          sets = newSets
          console.log('Созданы новые подходы:', sets)
        }
      }

      setExerciseSets(sets)
    } catch (error) {
      console.error('Ошибка загрузки подходов:', error)
    }
  }, [activeWorkout, currentExerciseIndex])

  // Загрузка тренировок
  const loadWorkouts = useCallback(async () => {
    try {
      setLoading(true)
      const user = await blink.auth.me()
      
      // Загружаем тренировки
      const workoutsData = await blink.db.workouts.list({
        where: { 
          userId: user.id,
          status: ['planned', 'active']
        },
        orderBy: { createdAt: 'desc' }
      })

      console.log('Загруженные тренировки:', workoutsData)

      // Загружаем упражнения для каждой тренировки
      const workoutsWithExercises: WorkoutWithExercises[] = []
      
      for (const workout of workoutsData) {
        // Загружаем упражнения тренировки
        const workoutExercises = await blink.db.workoutExercises.list({
          where: { workoutId: workout.id },
          orderBy: { orderIndex: 'asc' }
        })

        console.log(`Упражнения для тренировки ${workout.id}:`, workoutExercises)

        // Загружаем детали упражнений
        const exercisesWithDetails = []
        for (const we of workoutExercises) {
          const exerciseData = await blink.db.exercises.list({
            where: { id: we.exerciseId },
            limit: 1
          })
          
          if (exerciseData.length > 0) {
            exercisesWithDetails.push({
              ...we,
              exercise: exerciseData[0]
            })
          }
        }

        // Парсим muscleGroups
        let muscleGroups: string[] = []
        try {
          if (workout.muscleGroups) {
            if (typeof workout.muscleGroups === 'string') {
              muscleGroups = JSON.parse(workout.muscleGroups)
            } else {
              muscleGroups = workout.muscleGroups
            }
          } else if (workout.muscleGroup) {
            muscleGroups = [workout.muscleGroup]
          }
        } catch {
          muscleGroups = workout.muscleGroup ? [workout.muscleGroup] : []
        }

        workoutsWithExercises.push({
          ...workout,
          muscleGroups,
          exercises: exercisesWithDetails
        })
      }

      console.log('Тренировки с упражнениями:', workoutsWithExercises)
      setWorkouts(workoutsWithExercises)

      // Автоматически выбираем первую тренировку
      if (workoutsWithExercises.length > 0) {
        const firstWorkout = workoutsWithExercises[0]
        setActiveWorkout(firstWorkout)
        setCurrentExerciseIndex(0)
        
        // Загружаем подходы для первого упражнения
        if (firstWorkout.exercises.length > 0) {
          await loadExerciseSets(firstWorkout.exercises[0].id)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки тренировок:', error)
    } finally {
      setLoading(false)
    }
  }, [loadExerciseSets])

  // Переключение выполнения подхода
  const toggleSetCompletion = async (setId: string) => {
    try {
      const set = exerciseSets.find(s => s.id === setId)
      if (!set) return

      const newCompleted = Number(set.completed) > 0 ? 0 : 1
      await blink.db.exerciseSets.update(setId, { completed: newCompleted })
      
      setExerciseSets(prev => 
        prev.map(s => s.id === setId ? { ...s, completed: newCompleted } : s)
      )
    } catch (error) {
      console.error('Ошибка обновления подхода:', error)
    }
  }

  // Обновление веса подхода
  const updateSetWeight = async (setId: string, weight: number) => {
    try {
      await blink.db.exerciseSets.update(setId, { weight })
      setExerciseSets(prev => 
        prev.map(s => s.id === setId ? { ...s, weight } : s)
      )
    } catch (error) {
      console.error('Ошибка обновления веса:', error)
    }
  }

  // Переход к следующему упражнению
  const nextExercise = async () => {
    if (!activeWorkout || currentExerciseIndex >= activeWorkout.exercises.length - 1) return
    
    const nextIndex = currentExerciseIndex + 1
    setCurrentExerciseIndex(nextIndex)
    await loadExerciseSets(activeWorkout.exercises[nextIndex].id)
    resetTimer()
  }

  // Переход к предыдущему упражнению
  const previousExercise = async () => {
    if (!activeWorkout || currentExerciseIndex <= 0) return
    
    const prevIndex = currentExerciseIndex - 1
    setCurrentExerciseIndex(prevIndex)
    await loadExerciseSets(activeWorkout.exercises[prevIndex].id)
    resetTimer()
  }

  // Выбор тренировки
  const selectWorkout = async (workout: WorkoutWithExercises) => {
    setActiveWorkout(workout)
    setCurrentExerciseIndex(0)
    
    if (workout.exercises.length > 0) {
      await loadExerciseSets(workout.exercises[0].id)
    }
    
    resetTimer()
  }

  // Завершение тренировки
  const completeWorkout = async () => {
    if (!activeWorkout) return

    try {
      // Обновляем статус тренировки
      await blink.db.workouts.update(activeWorkout.id, {
        status: 'completed',
        completedAt: new Date().toISOString()
      })

      // Сохраняем прогресс
      const user = await blink.auth.me()
      for (const workoutExercise of activeWorkout.exercises) {
        const sets = await blink.db.exerciseSets.list({
          where: { workoutExerciseId: workoutExercise.id }
        })
        
        const completedSets = sets.filter(s => Number(s.completed) > 0)
        const allSetsCompleted = completedSets.length === sets.length && sets.length > 0
        
        // Определяем средний вес
        const avgWeight = sets.length > 0 
          ? sets.reduce((sum, s) => sum + s.weight, 0) / sets.length 
          : workoutExercise.currentWeight

        await blink.db.exerciseProgress.create({
          id: `progress_${Date.now()}_${workoutExercise.exerciseId}`,
          userId: user.id,
          exerciseId: workoutExercise.exerciseId,
          weight: avgWeight,
          achieved: allSetsCompleted ? 1 : 0,
          workoutDate: new Date().toISOString(),
          createdAt: new Date().toISOString()
        })

        // Обновляем статус достижения веса
        await blink.db.workoutExercises.update(workoutExercise.id, {
          weightAchieved: allSetsCompleted ? 1 : 0
        })
      }

      alert('Тренировка завершена! Прогресс сохранен.')
      await loadWorkouts() // Перезагружаем тренировки
    } catch (error) {
      console.error('Ошибка завершения тренировки:', error)
      alert('Ошибка при завершении тренировки')
    }
  }

  // Загрузка доступных упражнений для замены
  const loadAvailableExercises = async () => {
    if (!activeWorkout) return

    const currentExercise = activeWorkout.exercises[currentExerciseIndex]
    if (!currentExercise) return

    try {
      const user = await blink.auth.me()
      const currentExerciseData = currentExercise.exercise
      
      // Загружаем упражнения только того же типа и группы мышц
      const allExercises = await blink.db.exercises.list({
        where: { 
          userId: user.id,
          muscleGroup: currentExerciseData.muscleGroup,
          exerciseType: currentExerciseData.exerciseType
        }
      })
      
      // Исключаем уже добавленные упражнения
      const usedExerciseIds = activeWorkout.exercises.map(we => we.exerciseId)
      const available = allExercises.filter(ex => !usedExerciseIds.includes(ex.id))
      
      setAvailableExercises(available)
    } catch (error) {
      console.error('Ошибка загрузки доступных упражнений:', error)
    }
  }

  // Замена упражнения
  const replaceExercise = async (newExerciseId: string) => {
    if (!activeWorkout) return

    try {
      const currentWorkoutExercise = activeWorkout.exercises[currentExerciseIndex]
      
      // Обновляем упражнение в тренировке
      await blink.db.workoutExercises.update(currentWorkoutExercise.id, {
        exerciseId: newExerciseId
      })

      // Удаляем старые подходы
      for (const set of exerciseSets) {
        await blink.db.exerciseSets.delete(set.id)
      }

      // Перезагружаем тренировки
      await loadWorkouts()
      setShowReplaceDialog(false)
    } catch (error) {
      console.error('Ошибка замены упражнения:', error)
    }
  }

  // Загружаем тренировки при монтировании компонента
  useEffect(() => {
    loadWorkouts()
  }, [loadWorkouts])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Если нет тренировок
  if (workouts.length === 0) {
    return (
      <div className="text-center py-12">
        <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Нет доступных тренировок</h3>
        <p className="text-muted-foreground mb-4">
          Создайте тренировку в генераторе, чтобы начать
        </p>
      </div>
    )
  }

  // Если нет активной тренировки
  if (!activeWorkout) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Выберите тренировку</h2>
          <p className="text-muted-foreground">
            У вас есть {workouts.length} доступных тренировок
          </p>
        </div>

        <div className="grid gap-4">
          {workouts.map((workout) => (
            <Card key={workout.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader onClick={() => selectWorkout(workout)}>
                <CardTitle className="flex items-center justify-between">
                  <span>{workout.name}</span>
                  <Badge variant="secondary">
                    {workout.exercises.length} упражнений
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  {workout.muscleGroups.map((group) => (
                    <Badge key={group} variant="outline">{group}</Badge>
                  ))}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const currentExercise = activeWorkout.exercises[currentExerciseIndex]
  const progress = ((currentExerciseIndex + 1) / activeWorkout.exercises.length) * 100
  const completedSets = exerciseSets.filter(s => Number(s.completed) > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{activeWorkout.name}</h2>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>Упражнение {currentExerciseIndex + 1} из {activeWorkout.exercises.length}</span>
          <div className="flex gap-1">
            {activeWorkout.muscleGroups.map((group) => (
              <Badge key={group} variant="secondary">{group}</Badge>
            ))}
          </div>
        </div>
        <Progress value={progress} className="w-full max-w-md mx-auto" />
      </div>

      {/* Workout Selection */}
      {workouts.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Сменить тренировку</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {workouts.map((workout) => (
                <Button
                  key={workout.id}
                  variant={workout.id === activeWorkout.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectWorkout(workout)}
                >
                  {workout.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timer */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold">{formatTime(timer)}</div>
              <p className="text-sm text-muted-foreground">Время отдыха</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={isTimerRunning ? pauseTimer : startTimer}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={resetTimer}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Exercise */}
      {currentExercise && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Weight className="w-5 h-5" />
                {currentExercise.exercise.name}
              </CardTitle>
              <div className="flex gap-2">
                <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadAvailableExercises}
                    >
                      <Shuffle className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Заменить упражнение</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Label>Выберите новое упражнение:</Label>
                      <div className="space-y-2">
                        {availableExercises.map((exercise) => (
                          <Button
                            key={exercise.id}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => replaceExercise(exercise.id)}
                          >
                            <div className="text-left">
                              <div className="font-medium">{exercise.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {exercise.sets} подходов × {exercise.reps} повторений
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                      {availableExercises.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Нет доступных упражнений для замены
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Badge variant="outline">
                  {EXERCISE_TYPES.find(t => t.value === currentExercise.exercise.exerciseType)?.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentExercise.exercise.technique && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{currentExercise.exercise.technique}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Подходы ({completedSets}/{exerciseSets.length})</h4>
                <div className="text-sm text-muted-foreground">
                  Вес: {Number(currentExercise.weightAchieved) > 0 ? 'Взят' : 'Не взят'}
                </div>
              </div>

              {exerciseSets.map((set) => (
                <div key={set.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-sm font-medium">
                    {set.setNumber}
                  </div>
                  
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Повторения</Label>
                      <div className="text-sm font-medium">{set.reps}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Вес (кг)</Label>
                      <Input
                        type="number"
                        value={set.weight}
                        onChange={(e) => updateSetWeight(set.id, parseFloat(e.target.value) || 0)}
                        className="h-8"
                        step="0.5"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant={Number(set.completed) > 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSetCompletion(set.id)}
                        className="w-full"
                      >
                        {Number(set.completed) > 0 ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={previousExercise}
          disabled={currentExerciseIndex === 0}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Предыдущее
        </Button>
        
        {currentExerciseIndex < activeWorkout.exercises.length - 1 ? (
          <Button onClick={nextExercise} className="flex-1">
            Следующее
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={completeWorkout} className="flex-1">
            Завершить тренировку
          </Button>
        )}
      </div>
    </div>
  )
}