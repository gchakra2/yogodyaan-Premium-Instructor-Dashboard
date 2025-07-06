import { Calendar, Clock, DollarSign, Filter, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'
import { useAuth } from '../../auth/contexts/AuthContext'

interface InstructorAssignment {
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

export function InstructorDashboard() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<InstructorAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')

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
      case 'in_progress': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date()
  }

  const isCompleted = (status: string, endTime: string) => {
    return status === 'completed' || new Date(endTime) < new Date()
  }

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = searchTerm === '' || 
      assignment.scheduled_class?.class_type?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPayment = paymentFilter === 'all' || assignment.payment_status === paymentFilter
    
    let matchesStatus = true
    if (statusFilter === 'upcoming') {
      matchesStatus = isUpcoming(assignment.scheduled_class?.start_time)
    } else if (statusFilter === 'completed') {
      matchesStatus = isCompleted(assignment.scheduled_class?.status, assignment.scheduled_class?.end_time)
    } else if (statusFilter !== 'all') {
      matchesStatus = assignment.scheduled_class?.status === statusFilter
    }
    
    return matchesSearch && matchesPayment && matchesStatus
  })

  // Calculate statistics
  const stats = {
    total: assignments.length,
    upcoming: assignments.filter(a => isUpcoming(a.scheduled_class?.start_time)).length,
    completed: assignments.filter(a => isCompleted(a.scheduled_class?.status, a.scheduled_class?.end_time)).length,
    totalEarnings: assignments.filter(a => a.payment_status === 'paid').reduce((sum, a) => sum + a.payment_amount, 0),
    pendingPayments: assignments.filter(a => a.payment_status === 'pending').reduce((sum, a) => sum + a.payment_amount, 0)
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Class Assignments</h2>
        <p className="text-gray-600">View and manage your assigned classes and payment status</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">{stats.total}</div>
          <div className="text-gray-600">Total Classes</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{stats.upcoming}</div>
          <div className="text-gray-600">Upcoming</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-gray-600 mb-2">{stats.completed}</div>
          <div className="text-gray-600">Completed</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-emerald-600 mb-2">${stats.totalEarnings}</div>
          <div className="text-gray-600">Total Earnings</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-yellow-600 mb-2">${stats.pendingPayments}</div>
          <div className="text-gray-600">Pending Payments</div>
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
                placeholder="Search by class name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Classes</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
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
                    Assignment Info
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
                        <div className="text-xs text-gray-500">
                          Difficulty: {assignment.scheduled_class?.class_type?.difficulty_level}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDateTime(assignment.scheduled_class?.start_time)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Ends: {formatDateTime(assignment.scheduled_class?.end_time)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${getClassStatusColor(assignment.scheduled_class?.status)}`}>
                        {assignment.scheduled_class?.status}
                      </span>
                      {isUpcoming(assignment.scheduled_class?.start_time) && (
                        <div className="text-xs text-blue-600 mt-1">Upcoming</div>
                      )}
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
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        Assigned by: {assignment.assigned_by_user?.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(assignment.assigned_at)}
                      </div>
                      {assignment.notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          Note: {assignment.notes}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}