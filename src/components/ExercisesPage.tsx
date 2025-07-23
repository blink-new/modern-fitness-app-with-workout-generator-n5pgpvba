import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Dumbbell, Target, Weight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import blink from '@/blink/client'
import { Exercise, MUSCLE_GROUPS, EXERCISE_TYPES, WEIGHT_TYPES } from '@/types'

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    muscleGroup: '',
    weightType: 'weighted',
    technique: '',
    sets: 3,
    reps: 10,
    equipmentSetup: '',
    exerciseType: 'main',
    equipmentName: '',
    equipmentPhoto: ''
  })

  const resetForm = () => {
    setEditingExercise(null)
    setFormData({
      name: '',
      muscleGroup: '',
      weightType: 'weighted',
      technique: '',
      sets: 3,
      reps: 10,
      equipmentSetup: '',
      exerciseType: 'main',
      equipmentName: '',
      equipmentPhoto: ''
    })
  }

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExercises()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const user = await blink.auth.me()
      
      if (editingExercise) {
        await blink.db.exercises.update(editingExercise.id, {
          ...formData,
          updatedAt: new Date().toISOString()
        })
      } else {
        await blink.db.exercises.create({
          id: `exercise_${Date.now()}`,
          userId: user.id,
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
      
      await loadExercises()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Ошибка сохранения упражнения:', error)
    }
  }

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setFormData({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      weightType: exercise.weightType,
      technique: exercise.technique || '',
      sets: exercise.sets,
      reps: exercise.reps,
      equipmentSetup: exercise.equipmentSetup || '',
      exerciseType: exercise.exerciseType,
      equipmentName: exercise.equipmentName || '',
      equipmentPhoto: exercise.equipmentPhoto || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (exerciseId: string) => {
    try {
      await blink.db.exercises.delete(exerciseId)
      await loadExercises()
    } catch (error) {
      console.error('Ошибка удаления упражнения:', error)
    }
  }

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMuscleGroup = selectedMuscleGroup === 'all' || exercise.muscleGroup === selectedMuscleGroup
    return matchesSearch && matchesMuscleGroup
  })

  const getExerciseTypeColor = (type: string) => {
    switch (type) {
      case 'main': return 'bg-primary text-primary-foreground'
      case 'auxiliary': return 'bg-accent text-accent-foreground'
      case 'isolation': return 'bg-secondary text-secondary-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getWeightTypeIcon = (type: string) => {
    switch (type) {
      case 'bodyweight': return <Target className="w-4 h-4" />
      case 'assisted': return <Dumbbell className="w-4 h-4" />
      case 'weighted': return <Weight className="w-4 h-4" />
      default: return <Weight className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Упражнения</h2>
          <p className="text-muted-foreground">Управляйте своей базой упражнений</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить упражнение
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExercise ? 'Редактировать упражнение' : 'Добавить упражнение'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название упражнения *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Жим лежа"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="muscleGroup">Группа мышц *</Label>
                  <Select
                    value={formData.muscleGroup}
                    onValueChange={(value) => setFormData({ ...formData, muscleGroup: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите группу мышц" />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSCLE_GROUPS.map((group) => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="weightType">Тип веса *</Label>
                  <Select
                    value={formData.weightType}
                    onValueChange={(value) => setFormData({ ...formData, weightType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEIGHT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="exerciseType">Тип упражнения *</Label>
                  <Select
                    value={formData.exerciseType}
                    onValueChange={(value) => setFormData({ ...formData, exerciseType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXERCISE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sets">Количество подходов</Label>
                  <Input
                    id="sets"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.sets}
                    onChange={(e) => setFormData({ ...formData, sets: parseInt(e.target.value) || 3 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reps">Количество повторений</Label>
                  <Input
                    id="reps"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.reps}
                    onChange={(e) => setFormData({ ...formData, reps: parseInt(e.target.value) || 10 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="equipmentName">Название тренажера</Label>
                  <Input
                    id="equipmentName"
                    value={formData.equipmentName}
                    onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                    placeholder="Скамья для жима"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="equipmentPhoto">Фото тренажера (URL)</Label>
                  <Input
                    id="equipmentPhoto"
                    value={formData.equipmentPhoto}
                    onChange={(e) => setFormData({ ...formData, equipmentPhoto: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="technique">Техника выполнения</Label>
                <Textarea
                  id="technique"
                  value={formData.technique}
                  onChange={(e) => setFormData({ ...formData, technique: e.target.value })}
                  placeholder="Описание правильной техники выполнения упражнения..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="equipmentSetup">Настройка тренажера</Label>
                <Textarea
                  id="equipmentSetup"
                  value={formData.equipmentSetup}
                  onChange={(e) => setFormData({ ...formData, equipmentSetup: e.target.value })}
                  placeholder="Инструкции по настройке тренажера..."
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingExercise ? 'Сохранить изменения' : 'Добавить упражнение'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск упражнений..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Все группы мышц" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все группы мышц</SelectItem>
            {MUSCLE_GROUPS.map((group) => (
              <SelectItem key={group} value={group}>{group}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Exercise Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map((exercise) => (
          <Card key={exercise.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{exercise.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getWeightTypeIcon(exercise.weightType)}
                    <span className="text-sm text-muted-foreground">{exercise.muscleGroup}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(exercise)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить упражнение?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие нельзя отменить. Упражнение "{exercise.name}" будет удалено навсегда.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(exercise.id)}>
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Badge className={getExerciseTypeColor(exercise.exerciseType)}>
                  {EXERCISE_TYPES.find(t => t.value === exercise.exerciseType)?.label}
                </Badge>
                <Badge variant="outline">
                  {WEIGHT_TYPES.find(t => t.value === exercise.weightType)?.label}
                </Badge>
              </div>
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{exercise.sets} подходов</span>
                <span>{exercise.reps} повторений</span>
              </div>
              
              {exercise.technique && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {exercise.technique}
                </p>
              )}
              
              {exercise.equipmentName && (
                <div className="text-sm">
                  <span className="font-medium">Тренажер:</span> {exercise.equipmentName}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Упражнения не найдены</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedMuscleGroup !== 'all' 
              ? 'Попробуйте изменить фильтры поиска'
              : 'Добавьте первое упражнение, чтобы начать'
            }
          </p>
          {!searchTerm && selectedMuscleGroup === 'all' && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить упражнение
            </Button>
          )}
        </div>
      )}
    </div>
  )
}