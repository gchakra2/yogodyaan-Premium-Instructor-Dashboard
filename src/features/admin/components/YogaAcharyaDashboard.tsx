import { Calendar, Clock, DollarSign, Filter, Plus, Search, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'
import { useAuth } from '../../auth/contexts/AuthContext'
import { ClassAssignmentManager } from './ClassAssignmentManager'

interface YogaAcharyaAssignment {
  id: string
  scheduled_class_id: string
  payment_amount: number
  payment_status: 'pending' | 'paid' | 'cancelled'
  notes: string
  assigned_at: string
  scheduled_class: {
    id: string
    start_time: string
    end_time: string
    status: string
    class_type: {
      name: string
      difficulty_level: string
    }
  }
  assigned_by_user: {
    email: string
  }
}

export function YogaAcharyaDashboard() {
  const { user, userRoles } = useAuth()
  const [assignments, setAssignments] = useState<YogaAcharyaAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<'my-classes' | 'assign-classes'>('my-classes')

  // Check if user can assign classes (yoga acharya or admin)
  const canAssignClasses = userRoles.includes('yoga_acharya') || userRoles.includes('admin') || userRoles.includes('super_admin')

  useEffect(() => {
    if (user) {
      fetchAssignments()
    }
  }, [user])

  const fetchAssignments = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('class_assignments')
        .select(`
          *,
          scheduled_class:scheduled_classes(
            id,
            start_time,
            end_time,
            status,
            class_type:class_types(name, difficulty_level)
          ),
          assigned_by_user:users!fk_class_assignments_assigned_by(
            email
          )
        `)
        .eq('instructor_id', user.id)
        .order('assigned_at', { ascending: false })

      if (error) throw error

      setAssignments(data || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getClassStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-orange-100 text-orange-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date()
  }

  const isCompleted = (status: string) => {
    return status === 'completed'
  }

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = searchTerm === '' || 
      assignment.scheduled_class?.class_type?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'upcoming' && isUpcoming(assignment.scheduled_class?.start_time)) ||
      (statusFilter === 'completed' && isCompleted(assignment.scheduled_class?.status)) ||
      assignment.scheduled_class?.status === statusFilter
    
    const matchesPayment = paymentFilter === 'all' || assignment.payment_status === paymentFilter
    
    return matchesSearch && matchesStatus && matchesPayment
  })

  // Calculate statistics
  const stats = {
    total: assignments.length,
    upcoming: assignments.filter(a => isUpcoming(a.scheduled_class?.start_time)).length,
    completed: assignments.filter(a => isCompleted(a.scheduled_class?.status)).length,
    unpaid: assignments.filter(a => a.payment_status === 'pending').length,
    totalEarnings: assignments
      .filter(a => a.payment_status === 'paid')
      .reduce((sum, a) => sum + a.payment_amount, 0),
    pendingEarnings: assignments
      .filter(a => a.payment_status === 'pending')
      .reduce((sum, a) => sum + a.payment_amount, 0)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Yoga Acharya Dashboard</h2>
          <p className="text-gray-600">Manage your classes and assign classes to other instructors</p>
        </div>
        
        {canAssignClasses && (
          <div className="flex space-x-3">
            <button 
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'my-classes' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setActiveTab('my-classes')}
            >
              My Classes
            </button>
            <button 
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'assign-classes' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setActiveTab('assign-classes')}
            >
              Assign Classes
            </button>
          </div>
        )}
      </div>

      {activeTab === 'my-classes' ? (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Classes</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.upcoming}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                  <p className="text-3xl font-bold text-gray-900">${stats.totalEarnings}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Payment</p>
                  <p className="text-3xl font-bold text-gray-900">${stats.pendingEarnings}</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search classes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Classes</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Unpaid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Assignments List */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No assignments found</h3>
                <p className="text-gray-600">
                  {assignments.length === 0 
                    ? "You haven't been assigned any classes yet."
                    : "No assignments match your current filters."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Schedule
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAssignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {assignment.scheduled_class?.class_type?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assignment.scheduled_class?.class_type?.difficulty_level} level
                            </div>
                            {assignment.notes && (
                              <div className="text-xs text-gray-500 mt-1">
                                Note: {assignment.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {formatDateTime(assignment.scheduled_class?.start_time)}
                          </div>
                          <div className="text-sm text-gray-500">
                            to {new Date(assignment.scheduled_class?.end_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getClassStatusColor(assignment.scheduled_class?.status)}`}>
                            {assignment.scheduled_class?.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2 mb-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">${assignment.payment_amount}</span>
                          </div>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getPaymentStatusColor(assignment.payment_status)}`}>
                            {assignment.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {assignment.assigned_by_user?.email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <ClassAssignmentManager />
      )}
    </div>
  )
}