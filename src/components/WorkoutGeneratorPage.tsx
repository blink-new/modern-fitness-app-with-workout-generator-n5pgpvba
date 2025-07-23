import { useState, useEffect } from 'react'
import { Zap, Plus, Target, X, Check, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import blink from '@/blink/client'
import { Exercise, MUSCLE_GROUPS, EXERCISE_TYPES } from '@/types'

interface MuscleGroupSelection {
  muscleGroup: string
  selectedExercises: Exercise[]
  isOpen: boolean
}

export default function WorkoutGeneratorPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([])
  const [muscleGroupSelections, setMuscleGroupSelections] = useState<MuscleGroupSelection[]>([])
  const [step, setStep] = useState<'groups' | 'exercises'>('groups')

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
    setMuscleGroupSelections(prev => prev.filter(mg => mg.muscleGroup !== muscleGroup))
  }

  const proceedToExerciseSelection = () => {
    // Создаем структуру для выбора упражнений по каждой группе мышц
    const selections: MuscleGroupSelection[] = selectedMuscleGroups.map(muscleGroup => ({
      muscleGroup,
      selectedExercises: [],
      isOpen: true
    }))
    setMuscleGroupSelections(selections)
    setStep('exercises')
  }

  const toggleExerciseSelection = (muscleGroup: string, exercise: Exercise) => {
    setMuscleGroupSelections(prev => 
      prev.map(mg => {
        if (mg.muscleGroup === muscleGroup) {
          const isSelected = mg.selectedExercises.some(ex => ex.id === exercise.id)
          return {
            ...mg,
            selectedExercises: isSelected 
              ? mg.selectedExercises.filter(ex => ex.id !== exercise.id)
              : [...mg.selectedExercises, exercise]
          }
        }
        return mg
      })
    )
  }

  const toggleMuscleGroupOpen = (muscleGroup: string) => {
    setMuscleGroupSelections(prev => 
      prev.map(mg => 
        mg.muscleGroup === muscleGroup 
          ? { ...mg, isOpen: !mg.isOpen }
          : mg
      )
    )
  }

  const getExercisesForMuscleGroup = (muscleGroup: string) => {
    return exercises.filter(ex => ex.muscleGroup === muscleGroup)
  }

  const getExercisesByType = (muscleGroup: string, exerciseType: string) => {
    return exercises.filter(ex => 
      ex.muscleGroup === muscleGroup && ex.exerciseType === exerciseType
    )
  }

  const getTotalSelectedExercises = () => {
    return muscleGroupSelections.reduce((total, mg) => total + mg.selectedExercises.length, 0)
  }

  const saveWorkout = async () => {
    const totalExercises = getTotalSelectedExercises()
    if (totalExercises === 0) {
      alert('Выберите хотя бы одно упражнение')
      return
    }

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
        muscleGroups: JSON.stringify(selectedMuscleGroups),
        muscleGroup: selectedMuscleGroups[0] || '', // Для обратной совместимости
        status: 'planned',
        createdAt: new Date().toISOString()
      })

      // Добавляем упражнения в тренировку
      let orderIndex = 0
      for (const mgSelection of muscleGroupSelections) {
        for (const exercise of mgSelection.selectedExercises) {
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
            id: `workout_exercise_${Date.now()}_${orderIndex}`,
            workoutId,
            exerciseId: exercise.id,
            orderIndex,
            currentWeight: lastWeight,
            weightAchieved: 0,
            createdAt: new Date().toISOString()
          })
          orderIndex++
        }
      }

      // Сбрасываем состояние
      setSelectedMuscleGroups([])
      setMuscleGroupSelections([])
      setStep('groups')
      
      alert('Тренировка сохранена! Перейдите на вкладку "Тренировка" для выполнения.')
    } catch (error) {
      console.error('Ошибка сохранения тренировки:', error)
      alert('Ошибка при сохранении тренировки')
    } finally {
      setLoading(false)
    }
  }

  const backToGroupSelection = () => {
    setStep('groups')
    setMuscleGroupSelections([])
  }

  if (step === 'groups') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Генератор тренировок</h2>
          <p className="text-muted-foreground">
            Шаг 1: Выберите группы мышц для тренировки
          </p>
        </div>

        {/* Muscle Group Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Группы мышц
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Добавить группу мышц</Label>
              <Select onValueChange={addMuscleGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите группу мышц" />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.filter(group => !selectedMuscleGroups.includes(group)).map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Selected muscle groups */}
            {selectedMuscleGroups.length > 0 && (
              <div className="space-y-2">
                <Label>Выбранные группы мышц:</Label>
                <div className="flex flex-wrap gap-2">
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
                
                <div className="text-sm text-muted-foreground">
                  Доступно упражнений: {exercises.filter(ex => selectedMuscleGroups.includes(ex.muscleGroup)).length}
                </div>
              </div>
            )}

            <Button 
              onClick={proceedToExerciseSelection}
              disabled={selectedMuscleGroups.length === 0}
              className="w-full"
            >
              <ChevronRight className="w-4 h-4 mr-2" />
              Далее: Выбор упражнений
            </Button>
          </CardContent>
        </Card>

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

  // Exercise Selection Step
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Генератор тренировок</h2>
        <p className="text-muted-foreground">
          Шаг 2: Выберите упражнения для каждой группы мышц
        </p>
        <div className="flex items-center justify-center gap-2">
          {selectedMuscleGroups.map((group) => (
            <Badge key={group} variant="secondary">{group}</Badge>
          ))}
        </div>
      </div>

      {/* Exercise Selection by Muscle Group */}
      <div className="space-y-4">
        {muscleGroupSelections.map((mgSelection) => {
          const availableExercises = getExercisesForMuscleGroup(mgSelection.muscleGroup)
          const selectedCount = mgSelection.selectedExercises.length
          
          return (
            <Card key={mgSelection.muscleGroup}>
              <Collapsible 
                open={mgSelection.isOpen} 
                onOpenChange={() => toggleMuscleGroupOpen(mgSelection.muscleGroup)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{mgSelection.muscleGroup}</span>
                        <Badge variant="outline">
                          {selectedCount} из {availableExercises.length}
                        </Badge>
                      </div>
                      {mgSelection.isOpen ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {EXERCISE_TYPES.map((type) => {
                      const typeExercises = getExercisesByType(mgSelection.muscleGroup, type.value)
                      if (typeExercises.length === 0) return null
                      
                      return (
                        <div key={type.value} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{type.label}</Badge>
                            <span className="text-sm text-muted-foreground">
                              ({typeExercises.length} упражнений)
                            </span>
                          </div>
                          
                          <div className="grid gap-2">
                            {typeExercises.map((exercise) => {
                              const isSelected = mgSelection.selectedExercises.some(ex => ex.id === exercise.id)
                              
                              return (
                                <div 
                                  key={exercise.id}
                                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                                  onClick={() => toggleExerciseSelection(mgSelection.muscleGroup, exercise)}
                                >
                                  <Checkbox 
                                    checked={isSelected}
                                    onChange={() => toggleExerciseSelection(mgSelection.muscleGroup, exercise)}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{exercise.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {exercise.sets} подходов × {exercise.reps} повторений
                                    </div>
                                    {exercise.technique && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {exercise.technique.substring(0, 100)}...
                                      </div>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <Check className="w-5 h-5 text-primary" />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    
                    {availableExercises.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        Нет упражнений для группы "{mgSelection.muscleGroup}"
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}
      </div>

      {/* Summary and Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">Итого выбрано упражнений</h3>
              <p className="text-sm text-muted-foreground">
                {getTotalSelectedExercises()} упражнений из {selectedMuscleGroups.length} групп мышц
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {getTotalSelectedExercises()}
            </Badge>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={backToGroupSelection}
              className="flex-1"
            >
              Назад к группам мышц
            </Button>
            <Button 
              onClick={saveWorkout}
              disabled={loading || getTotalSelectedExercises() === 0}
              className="flex-1"
            >
              {loading ? 'Сохранение...' : 'Создать тренировку'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}