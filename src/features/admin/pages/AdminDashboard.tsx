import {
  BarChart3,
  BookOpen,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  LogOut,
  Mail,
  MessageCircle,
  Settings,
  Shield,
  TrendingUp,
  Users as UsersIcon,
  Award
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'
import { DashboardMetrics } from '../../analytics/components/DashboardMetrics'
import { UserEngagementChart } from '../../analytics/components/UserEngagementChart'
import { useAuth } from '../../auth/contexts/AuthContext'
import { useUserProfiles } from '../../user-profile/hooks/useUserProfiles'
import { ArticleManagement } from '../components/ArticleManagement'
import { BookingManagement } from '../components/BookingManagement'
import { BusinessSettings } from '../components/BusinessSettings'
import { ClassAssignmentManager } from '../components/ClassAssignmentManager'
import { ClassTypeManager } from '../components/ClassTypeManager'
import { FormSubmissions } from '../components/FormSubmissions'
import { InstructorDashboard } from '../components/InstructorDashboard'
import { InstructorManagement } from '../components/InstructorManagement'
import { NewsletterManagement } from '../components/NewsletterManagement'
import { PaymentManagement } from '../components/PaymentManagement'
import { UserRoleManagement } from '../components/UserRoleManagement'
import { WeeklyClassScheduler } from '../components/WeeklyClassScheduler'
import { useAdmin } from '../contexts/AdminContext'

interface DashboardStats {
  totalBookings: number
  totalQueries: number
  totalContacts: number
  totalArticles: number
  publishedArticles: number
  totalViews: number
  totalUsers: number
  activeSubscriptions: number
  monthlyRevenue: number
  recentBookings: any[]
  pendingQueries: any[]
  newContacts: any[]
  allBookings: any[]
  allQueries: any[]
  allContacts: any[]
  allInstructors: any[]
  allClassTypes: any[]
  allSubscriptions: any[]
  allTransactions: any[]
}

export function AdminDashboard() {
  const { admin, isAdmin, signOutAdmin } = useAdmin()
  const { isMantraCurator, user, userRoles } = useAuth()
  const { profiles, refetch: refetchProfiles } = useUserProfiles()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(() => {
    // Set default tab based on user role
    if (isMantraCurator && !isAdmin) {
      return 'articles'
    }
    if (userRoles.includes('instructor') || userRoles.includes('yoga_acharya')) {
      return 'instructor-dashboard'
    }
    return 'overview'
  })
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showRoleManagement, setShowRoleManagement] = useState(false)

  // Check if user has instructor or yoga acharya role
  const isInstructor = userRoles.includes('instructor') || userRoles.includes('yoga_acharya')

  useEffect(() => {
    if (!isAdmin && !isMantraCurator && !isInstructor) {
      navigate('/admin/login')
      return
    }
    
    // Only fetch full dashboard data for admins
    if (isAdmin) {
      fetchDashboardData()
    } else {
      // For curators and instructors, just set loading to false
      setLoading(false)
    }
  }, [isAdmin, isMantraCurator, isInstructor, navigate])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      console.log('Fetching dashboard data for admin:', admin?.email)

      // Fetch all data with better error handling
      const [
        bookingsRes, 
        queriesRes, 
        contactsRes, 
        articlesRes, 
        viewsRes,
        instructorsRes,
        classTypesRes,
        subscriptionsRes,
        transactionsRes
      ] = await Promise.allSettled([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('yoga_queries').select('*').order('created_at', { ascending: false }),
        supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
        supabase.from('articles').select('*').order('created_at', { ascending: false }),
        supabase.from('article_views').select('*'),
        supabase.from('instructors').select('*').order('created_at', { ascending: false }),
        supabase.from('class_types').select('*').order('created_at', { ascending: false }),
        supabase.from('user_subscriptions').select('*, subscription_plans(*)').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false })
      ])

      // Extract data with fallbacks and better error handling
      const bookings = bookingsRes.status === 'fulfilled' && !bookingsRes.value.error ? bookingsRes.value.data || [] : []
      const queries = queriesRes.status === 'fulfilled' && !queriesRes.value.error ? queriesRes.value.data || [] : []
      const contacts = contactsRes.status === 'fulfilled' && !contactsRes.value.error ? contactsRes.value.data || [] : []
      const articles = articlesRes.status === 'fulfilled' && !articlesRes.value.error ? articlesRes.value.data || [] : []
      const views = viewsRes.status === 'fulfilled' && !viewsRes.value.error ? viewsRes.value.data || [] : []
      const instructors = instructorsRes.status === 'fulfilled' && !instructorsRes.value.error ? instructorsRes.value.data || [] : []
      const classTypes = classTypesRes.status === 'fulfilled' && !classTypesRes.value.error ? classTypesRes.value.data || [] : []
      const subscriptions = subscriptionsRes.status === 'fulfilled' && !subscriptionsRes.value.error ? subscriptionsRes.value.data || [] : []
      const transactions = transactionsRes.status === 'fulfilled' && !transactionsRes.value.error ? transactionsRes.value.data || [] : []

      // Log any errors for debugging
      if (bookingsRes.status === 'rejected') console.warn('Bookings fetch failed:', bookingsRes.reason)
      if (queriesRes.status === 'rejected') console.warn('Queries fetch failed:', queriesRes.reason)
      if (contactsRes.status === 'rejected') console.warn('Contacts fetch failed:', contactsRes.reason)
      if (articlesRes.status === 'rejected') console.warn('Articles fetch failed:', articlesRes.reason)
      if (viewsRes.status === 'rejected') console.warn('Views fetch failed:', viewsRes.reason)
      if (instructorsRes.status === 'rejected') console.warn('Instructors fetch failed:', instructorsRes.reason)
      if (classTypesRes.status === 'rejected') console.warn('Class types fetch failed:', classTypesRes.reason)
      if (subscriptionsRes.status === 'rejected') console.warn('Subscriptions fetch failed:', subscriptionsRes.reason)
      if (transactionsRes.status === 'rejected') console.warn('Transactions fetch failed:', transactionsRes.reason)

      // Filter data safely
      const pendingQueries = queries.filter(q => q?.status === 'pending')
      const newContacts = contacts.filter(c => c?.status === 'new')
      const activeSubscriptions = subscriptions.filter(s => s?.status === 'active')
      const completedTransactions = transactions.filter(t => t?.status === 'completed')
      const monthlyRevenue = completedTransactions
        .filter(t => t?.created_at && new Date(t.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
        .reduce((sum, t) => sum + parseFloat(t?.amount || '0'), 0)

      setStats({
        totalBookings: bookings.length,
        totalQueries: queries.length,
        totalContacts: contacts.length,
        totalArticles: articles.length,
        publishedArticles: articles.filter(a => a?.status === 'published').length,
        totalViews: views.length,
        totalUsers: profiles.length,
        activeSubscriptions: activeSubscriptions.length,
        monthlyRevenue,
        recentBookings: bookings.slice(0, 5),
        pendingQueries: pendingQueries.slice(0, 10),
        newContacts: newContacts.slice(0, 10),
        allBookings: bookings,
        allQueries: queries,
        allContacts: contacts,
        allInstructors: instructors,
        allClassTypes: classTypes,
        allSubscriptions: subscriptions,
        allTransactions: transactions
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setStats({
        totalBookings: 0,
        totalQueries: 0,
        totalContacts: 0,
        totalArticles: 0,
        publishedArticles: 0,
        totalViews: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        monthlyRevenue: 0,
        recentBookings: [],
        pendingQueries: [],
        newContacts: [],
        allBookings: [],
        allQueries: [],
        allContacts: [],
        allInstructors: [],
        allClassTypes: [],
        allSubscriptions: [],
        allTransactions: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOutAdmin()
    navigate('/')
  }

  // Update user roles in the UI
  const handleUpdateUserRoles = (newRoles: string[] = []) => {
    if (selectedUser) {
      // Create a new reference for selectedUser to ensure React detects the change
      const updatedUser = {
        ...selectedUser,
        user_roles: [...newRoles], // Create a new array reference
        experience_level: newRoles.includes('super_admin') ? 'super_admin' :
                         newRoles.includes('admin') ? 'admin' :
                         newRoles.includes('instructor') ? 'instructor' :
                         newRoles.includes('mantra_curator') ? 'mantra_curator' :
                         'user'
      };
      
      // Update the selectedUser state
      setSelectedUser(updatedUser);
      
      // Refetch profiles to get the latest data from the database
      refetchProfiles();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // For curators, show a simplified dashboard
  if (isMantraCurator && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Y</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Article Management</h1>
                  <p className="text-sm text-gray-600">Welcome back, {user?.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex items-center space-x-2"
                >
                  <span>View Site</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ArticleManagement authorId={user?.id} />
        </main>
      </div>
    )
  }

  // For instructors/yoga acharyas, show instructor dashboard
  if (isInstructor && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Y</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h1>
                  <p className="text-sm text-gray-600">Welcome back, {user?.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex items-center space-x-2"
                >
                  <span>View Site</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <InstructorDashboard />
        </main>
      </div>
    )
  }

  // For admins, show the full dashboard
  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load dashboard data</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">Y</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {admin?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2"
              >
                <span>View Site</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'users', label: 'User Management', icon: <UsersIcon className="w-4 h-4" /> },
              { id: 'instructors', label: 'Instructors', icon: <GraduationCap className="w-4 h-4" /> },
              { id: 'classes', label: 'Class Types', icon: <Award className="w-4 hLet me implement the class assignment and payment management system based on your requirements:

<boltArtifact id="class-assignment-system" title="Class Assignment and Payment Management System">