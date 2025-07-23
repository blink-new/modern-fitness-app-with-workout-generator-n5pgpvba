import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'modern-fitness-app-with-workout-generator-n5pgpvba',
  authRequired: true
})

export default blink