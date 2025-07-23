import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dumbbell, Zap, Play, History, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import blink from '@/blink/client'
import ExercisesPage from '@/components/ExercisesPage'
import WorkoutGeneratorPage from '@/components/WorkoutGeneratorPage'
import ActiveWorkoutPage from '@/components/ActiveWorkoutPage'
import HistoryPage from '@/components/HistoryPage'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('exercises')

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Загрузка FitTracker Pro...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                <Dumbbell className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">FitTracker Pro</h1>
              <p className="text-muted-foreground">
                Современное фитнес-приложение для создания тренировок и отслеживания прогресса
              </p>
            </div>
            <Button onClick={() => blink.auth.login()} className="w-full" size="lg">
              <User className="w-4 h-4 mr-2" />
              Войти в приложение
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">FitTracker Pro</h1>
                <p className="text-sm text-muted-foreground">Привет, {user.email?.split('@')[0]}!</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => blink.auth.logout()}
            >
              Выйти
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              <span className="hidden sm:inline">Упражнения</span>
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Генератор</span>
            </TabsTrigger>
            <TabsTrigger value="workout" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">Тренировка</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">История</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exercises" className="animate-fade-in">
            <ExercisesPage />
          </TabsContent>

          <TabsContent value="generator" className="animate-fade-in">
            <WorkoutGeneratorPage />
          </TabsContent>

          <TabsContent value="workout" className="animate-fade-in">
            <ActiveWorkoutPage />
          </TabsContent>

          <TabsContent value="history" className="animate-fade-in">
            <HistoryPage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App