import { Calendar, Clock, DollarSign, Plus, Save, Search, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner'
import { supabase } from '../../../shared/lib/supabase'

interface ClassAssignment {
  id: string
  scheduled_class_id: string
  instructor_id: string
  assigned_by: string
  payment_amount: number
  payment_status: 'pending' | 'paid' | 'cancelled'
  notes: string
  assigned_at: string
  scheduled_class: {
    id: string
    start_time: string
    end_time: string
    class_type: {
      name: string
      difficulty_level: string
    }
    instructor: {
      name: string
    }
  }
  instructor: {
    name: string
    email: string
  }
  assigned_by_user: {
    email: string
  }
}

interface ScheduledClass {
  id: string
  class_type_id: string
  instructor_id: string
  start_time: string
  end_time: string
  max_participants: number
  current_participants: number
  status: string
  class_type: {
    name: string
    difficulty_level: string
    price: number
  }
  instructor: {
    name: string
    email: string
  }
}

interface User {
  id: string
  email: string
  user_metadata: {
    full_name?: string
  }
  user_roles: string[]
}

export function ClassAssignmentManager() {
  const [assignments, setAssignments] = useState<ClassAssignment[]>([])
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [errors, setErrors] = useState<any>({})

  const [formData, setFormData] = useState({
    scheduled_class_id: '',
    instructor_id: '',
    payment_amount: 0,
    notes: '',
    role_filter: 'all' // For filtering users by role in the form
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch class assignments with related data
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('class_assignments')
        .select(`
          *,
          scheduled_class:scheduled_classes(
            id,
            start_time,
            end_time,
            class_type:class_types(name, difficulty_level),
            instructor:instructors(name)
          ),
          instructor:users!fk_class_assignments_instructor(
            id,
            email,
            raw_user_meta_data
          ),
          assigned_by_user:users!fk_class_assignments_assigned_by(
            email
          )
        `)
        .order('assigned_at', { ascending: false })

      if (assignmentsError) throw assignmentsError

      // Fetch scheduled classes for assignment
      const { data: classesData, error: classesError } = await supabase
        .from('scheduled_classes')
        .select(`
          *,
          class_type:class_types(name, difficulty_level, price),
          instructor:instructors(name, email)
        `)
        .in('status', ['scheduled', 'in_progress'])
        .order('start_time', { ascending: true })

      if (classesError) throw classesError

      // Fetch users with instructor or yoga_acharya roles
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_users_with_roles', {
          role_names: ['instructor', 'yoga_acharya']
        })

      if (usersError) {
        console.warn('Could not fetch users with roles, using fallback')
        // Fallback: get all users and filter client-side
        const { data: allUsers } = await supabase.auth.admin.listUsers()
        setUsers(allUsers?.users || [])
      } else {
        setUsers(usersData || [])
      }

      setAssignments(assignmentsData || [])
      setScheduledClasses(classesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: any = {}

    if (!formData.scheduled_class_id) newErrors.scheduled_class_id = 'Please select a class'
    if (!formData.instructor_id) newErrors.instructor_id = 'Please select an instructor'
    if (formData.payment_amount < 0) newErrors.payment_amount = 'Payment amount cannot be negative'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setSaving(true)

      const { data: currentUser } = await supabase.auth.getUser()
      
      const assignmentData = {
        scheduled_class_id: formData.scheduled_class_id,
        instructor_id: formData.instructor_id,
        assigned_by: currentUser.user?.id,
        payment_amount: formData.payment_amount,
        payment_status: 'pending' as const,
        notes: formData.notes
      }

      const { error } = await supabase
        .from('class_assignments')
        .insert([assignmentData])

      if (error) throw error

      await fetchData()
      resetForm()
      alert('Class assigned successfully!')
    } catch (error: any) {
      setErrors({ general: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handlePaymentStatusUpdate = async (assignmentId: string, newStatus: 'pending' | 'paid' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('class_assignments')
        .update({ payment_status: newStatus })
        .eq('id', assignmentId)

      if (error) throw error

      await fetchData()
      alert(`Payment status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating payment status:', error)
      alert('Failed to update payment status')
    }
  }

  const resetForm = () => {
    setFormData({
      scheduled_class_id: '',
      instructor_id: '',
      payment_amount: 0,
      notes: '',
      role_filter: 'all'
    })
    setShowAssignForm(false)
    setErrors({})
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

  // Filter assignments based on search and filters
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = searchTerm === '' || 
      assignment.instructor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.instructor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.scheduled_class?.class_type?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPaymentStatus = paymentStatusFilter === 'all' || assignment.payment_status === paymentStatusFilter
    
    // Role filter would need to be implemented based on user roles data
    const matchesRole = roleFilter === 'all' // For now, showing all
    
    return matchesSearch && matchesPaymentStatus && matchesRole
  })

  // Filter users for assignment form
  const filteredUsers = users.filter(user => {
    if (formData.role_filter === 'all') return true
    return user.user_roles?.includes(formData.role_filter)
  })

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
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Users className="w-6 h-6 mr-2" />
          Class Assignment & Payment Management
        </h2>
        <Button
          onClick={() => setShowAssignForm(true)}
          className="flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Assign Class
        </Button>
      </div>

      {/* Assignment Form Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Assign Class to Instructor</h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{errors.general}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Class *
                </label>
                <select
                  value={formData.scheduled_class_id}
                  onChange={(e) => handleInputChange('scheduled_class_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.scheduled_class_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Choose a scheduled class</option>
                  {scheduledClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_type.name} - {formatDateTime(cls.start_time)} 
                      (Current Instructor: {cls.instructor.name})
                    </option>
                  ))}
                </select>
                {errors.scheduled_class_id && <p className="text-red-500 text-sm mt-1">{errors.scheduled_class_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Role
                </label>
                <select
                  value={formData.role_filter}
                  onChange={(e) => handleInputChange('role_filter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="instructor">Instructors</option>
                  <option value="yoga_acharya">Yoga Acharyas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to *
                </label>
                <select
                  value={formData.instructor_id}
                  onChange={(e) => handleInputChange('instructor_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.instructor_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Choose instructor/yoga acharya</option>
                  {filteredUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.user_metadata?.full_name || user.email} 
                      ({user.user_roles?.includes('yoga_acharya') ? 'Yoga Acharya' : 'Instructor'})
                    </option>
                  ))}
                </select>
                {errors.instructor_id && <p className="text-red-500 text-sm mt-1">{errors.instructor_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  value={formData.payment_amount}
                  onChange={(e) => handleInputChange('payment_amount', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.payment_amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter payment amount"
                />
                {errors.payment_amount && <p className="text-red-500 text-sm mt-1">{errors.payment_amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this assignment..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={saving}
                  className="flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Assigning...' : 'Assign Class'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by instructor name, email, or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="instructor">Instructors</option>
              <option value="yoga_acharya">Yoga Acharyas</option>
            </select>
          </div>

          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payment Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No class assignments found</h3>
            <p className="text-gray-600 mb-4">Start by assigning classes to instructors.</p>
            <Button onClick={() => setShowAssignForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Assign First Class
            </Button>
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
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignment Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                        <div className="text-sm text-gray-500 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDateTime(assignment.scheduled_class?.start_time)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Difficulty: {assignment.scheduled_class?.class_type?.difficulty_level}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.instructor?.user_metadata?.full_name || assignment.instructor?.email}
                        </div>
                        <div className="text-sm text-gray-500">{assignment.instructor?.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">${assignment.payment_amount}</span>
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${getPaymentStatusColor(assignment.payment_status)}`}>
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
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {assignment.payment_status === 'pending' && (
                          <button
                            onClick={() => handlePaymentStatusUpdate(assignment.id, 'paid')}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                        {assignment.payment_status === 'paid' && (
                          <button
                            onClick={() => handlePaymentStatusUpdate(assignment.id, 'pending')}
                            className="text-yellow-600 hover:text-yellow-900 text-sm font-medium"
                          >
                            Mark Pending
                          </button>
                        )}
                        <button
                          onClick={() => handlePaymentStatusUpdate(assignment.id, 'cancelled')}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
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