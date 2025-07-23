import { useState, useEffect } from 'react'
import { Zap, Plus, Shuffle, Target, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import blink from '@/blink/client'
import { Exercise, Workout, MUSCLE_GROUPS, EXERCISE_TYPES } from '@/types'

export default function WorkoutGeneratorPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([])
  const [selectedExerciseTypes, setSelectedExerciseTypes] = useState<string[]>(['main'])
  const [exerciseCount, setExerciseCount] = useState(3)
  const [generatedWorkout, setGeneratedWorkout] = useState<Exercise[]>([])

  const loadExercises = async () => {
    try {
      const user = await blink.auth.me()
      const data = await blink.db.exercises.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })
      setExercises(data)
    } catch (error) {
      console.error('Ошибка загрузки упражнений:', error)
    }
  }

  useEffect(() => {
    loadExercises()
  }, [])

  const addMuscleGroup = (muscleGroup: string) => {
    if (!selectedMuscleGroups.includes(muscleGroup)) {
      setSelectedMuscleGroups(prev => [...prev, muscleGroup])
    }
  }

  const removeMuscleGroup = (muscleGroup: string) => {
    setSelectedMuscleGroups(prev => prev.filter(mg => mg !== muscleGroup))
  }

  const generateWorkout = () => {
    if (selectedMuscleGroups.length === 0) return

    // Фильтруем упражнения по группам мышц и типам
    const filteredExercises = exercises.filter(exercise => 
      selectedMuscleGroups.includes(exercise.muscleGroup) &&
      selectedExerciseTypes.includes(exercise.exerciseType)
    )

    if (filteredExercises.length === 0) {
      setGeneratedWorkout([])
      return
    }

    // Перемешиваем и берем нужное количество
    const shuffled = [...filteredExercises].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(exerciseCount, shuffled.length))
    
    setGeneratedWorkout(selected)
  }

  const replaceExercise = (index: number) => {
    const currentExercise = generatedWorkout[index]
    
    // Ищем замену только среди упражнений того же типа и группы мышц
    const availableExercises = exercises.filter(exercise => 
      exercise.muscleGroup === currentExercise.muscleGroup &&
      exercise.exerciseType === currentExercise.exerciseType &&
      !generatedWorkout.some(w => w.id === exercise.id)
    )

    if (availableExercises.length === 0) return

    const randomExercise = availableExercises[Math.floor(Math.random() * availableExercises.length)]
    const newWorkout = [...generatedWorkout]
    newWorkout[index] = randomExercise
    setGeneratedWorkout(newWorkout)
  }

  const saveWorkout = async () => {
    if (generatedWorkout.length === 0) return

    setLoading(true)
    try {
      const user = await blink.auth.me()
      
      // Создаем тренировку
      const workoutId = `workout_${Date.now()}`
      const workoutName = selectedMuscleGroups.length === 1 
        ? `Тренировка ${selectedMuscleGroups[0]}`
        : `Тренировка ${selectedMuscleGroups.join(', ')}`

      await blink.db.workouts.create({
        id: workoutId,
        userId: user.id,
        name: workoutName,
        muscleGroups: selectedMuscleGroups,
        // Сохраняем также в старом формате для совместимости
        muscleGroup: selectedMuscleGroups[0] || '',
        status: 'planned',
        createdAt: new Date().toISOString()
      })

      // Добавляем упражнения в тренировку
      for (let i = 0; i < generatedWorkout.length; i++) {
        const exercise = generatedWorkout[i]
        
        // Получаем последний вес для этого упражнения
        const progressData = await blink.db.exerciseProgress.list({
          where: { 
            userId: user.id,
            exerciseId: exercise.id
          },
          orderBy: { workoutDate: 'desc' },
          limit: 1
        })

        const lastWeight = progressData.length > 0 ? progressData[0].weight : 0

        await blink.db.workoutExercises.create({
          id: `workout_exercise_${Date.now()}_${i}`,
          workoutId,
          exerciseId: exercise.id,
          orderIndex: i,
          currentWeight: lastWeight,
          weightAchieved: 0,
          createdAt: new Date().toISOString()
        })
      }

      // Очищаем сгенерированную тренировку
      setGeneratedWorkout([])
      setSelectedMuscleGroups([])
      setSelectedExerciseTypes(['main'])
      setExerciseCount(3)
      
      alert('Тренировка сохранена! Перейдите на вкладку "Тренировка" для выполнения.')
    } catch (error) {
      console.error('Ошибка сохранения тренировки:', error)
      alert('Ошибка при сохранении тренировки')
    } finally {
      setLoading(false)
    }
  }

  const toggleExerciseType = (type: string) => {
    setSelectedExerciseTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const getAvailableExercisesCount = () => {
    return exercises.filter(exercise => 
      selectedMuscleGroups.includes(exercise.muscleGroup) &&
      selectedExerciseTypes.includes(exercise.exerciseType)
    ).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Генератор тренировок</h2>
        <p className="text-muted-foreground">
          Создайте персональную тренировку на основе ваших упражнений
        </p>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Настройки тренировки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Группы мышц *</Label>
              <Select onValueChange={addMuscleGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Добавить группу мышц" />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.filter(group => !selectedMuscleGroups.includes(group)).map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Selected muscle groups */}
              {selectedMuscleGroups.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMuscleGroups.map((group) => (
                    <Badge key={group} variant="secondary" className="flex items-center gap-1">
                      {group}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeMuscleGroup(group)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Количество упражнений</Label>
              <Select 
                value={exerciseCount.toString()} 
                onValueChange={(value) => setExerciseCount(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Типы упражнений</Label>
            <div className="flex flex-wrap gap-2">
              {EXERCISE_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={selectedExerciseTypes.includes(type.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleExerciseType(type.value)}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {selectedMuscleGroups.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Доступно упражнений: {getAvailableExercisesCount()}
            </div>
          )}

          <Button 
            onClick={generateWorkout}
            disabled={selectedMuscleGroups.length === 0 || selectedExerciseTypes.length === 0}
            className="w-full"
          >
            <Zap className="w-4 h-4 mr-2" />
            Сгенерировать тренировку
          </Button>
        </CardContent>
      </Card>

      {/* Generated Workout */}
      {generatedWorkout.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Сгенерированная тренировка</span>
              <Badge variant="secondary">{generatedWorkout.length} упражнений</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedWorkout.map((exercise, index) => (
              <div key={exercise.id}>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{exercise.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{exercise.sets} подходов</span>
                          <span>{exercise.reps} повторений</span>
                          <Badge variant="outline">
                            {exercise.muscleGroup}
                          </Badge>
                          <Badge variant="outline">
                            {EXERCISE_TYPES.find(t => t.value === exercise.exerciseType)?.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {exercise.technique && (
                      <p className="text-sm text-muted-foreground mt-2 ml-11">
                        {exercise.technique}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => replaceExercise(index)}
                    title="Заменить упражнение (только в рамках того же типа и группы мышц)"
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </div>
                {index < generatedWorkout.length - 1 && <Separator className="my-2" />}
              </div>
            ))}

            <div className="flex gap-2 pt-4">
              <Button onClick={saveWorkout} disabled={loading} className="flex-1">
                {loading ? 'Сохранение...' : 'Сохранить тренировку'}
              </Button>
              <Button 
                variant="outline" 
                onClick={generateWorkout}
                title="Сгенерировать заново"
              >
                <Shuffle className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {exercises.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет упражнений</h3>
            <p className="text-muted-foreground mb-4">
              Добавьте упражнения, чтобы генерировать тренировки
            </p>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Добавить упражнения
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}