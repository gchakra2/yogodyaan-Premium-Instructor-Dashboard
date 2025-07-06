import { useAuth } from '../../auth/contexts/AuthContext'
import { InstructorDashboard } from '../components/InstructorDashboard'
import { YogaAcharyaDashboard } from '../components/YogaAcharyaDashboard'

export function InstructorPortal() {
  const { user, userRoles } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please sign in to access the instructor portal.</p>
          <a href="/login" className="btn-primary">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  const isInstructor = userRoles.includes('instructor')
  const isYogaAcharya = userRoles.includes('yoga_acharya')

  if (!isInstructor && !isYogaAcharya) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need instructor or yoga acharya permissions to access this portal.
          </p>
          <a href="/" className="btn-primary">
            Go Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isYogaAcharya ? <YogaAcharyaDashboard /> : <InstructorDashboard />}
      </div>
    </div>
  )
}