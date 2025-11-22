'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, formatNumber, formatDate, generateMockUsers, generateMockStats, type User, type AdminStats } from '@/lib/admin';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  // Check if user is admin
  const userIsAdmin = session ? isAdmin(session) : false;

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/');
      return;
    }

    if (!userIsAdmin) {
      router.push('/dashboard');
      return;
    }

    loadAdminData();
  }, [session, status, userIsAdmin]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Use real API in production, mock data in development
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        // Use mock data for development
        setTimeout(() => {
          setStats(generateMockStats());
          setUsers(generateMockUsers(25));
          setLoading(false);
        }, 1000); // Simulate loading
      } else {
        // Use real API in production
        const [statsResponse, usersResponse] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/users')
        ]);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      const response = await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ban })
      });

      if (response.ok) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, isBanned: ban } : user
        ));
      }
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleAddCredits = async () => {
    if (!selectedUser || !creditAmount) return;

    try {
      const response = await fetch('/api/admin/users/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: selectedUser.id, 
          amount: parseInt(creditAmount),
          type: 'admin_adjustment'
        })
      });

      if (response.ok) {
        const newCredits = selectedUser.credits + parseInt(creditAmount);
        setUsers(users.map(user => 
          user.id === selectedUser.id ? { ...user, credits: newCredits } : user
        ));
        setShowCreditModal(false);
        setCreditAmount('');
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error adding credits:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || !userIsAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have admin privileges.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Xchangee Admin</h1>
              <p className="text-gray-600">Welcome back, {session.user?.name}</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalUsers)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
              <p className="text-2xl font-bold text-green-600">{formatNumber(stats.activeUsers)}</p>
              <p className="text-xs text-gray-400 mt-1">{((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% active</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Credits</h3>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.totalCredits)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.totalCredits.toLocaleString()} credits</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Engagements</h3>
              <p className="text-2xl font-bold text-purple-600">{formatNumber(stats.totalEngagements)}</p>
              <p className="text-xs text-gray-400 mt-1">All time</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Today's Signups</h3>
              <p className="text-2xl font-bold text-orange-600">{stats.todaySignups}</p>
              <p className="text-xs text-green-400 mt-1">+{stats.weeklyGrowth || 0} this week</p>
            </div>
          </div>
        )}

        {/* User Management */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={loadAdminData}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={user.isBanned ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-10 w-10 rounded-full" src={user.image || '/default-avatar.png'} alt="" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.credits} credits</div>
                      <div className="text-sm text-gray-500">Earned: {user.totalEarned} | Spent: {user.totalSpent}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.engagementCount} engagements</div>
                      <div className="text-sm text-gray-500">Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.isBanned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowCreditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Add Credits
                      </button>
                      <button
                        onClick={() => handleBanUser(user.id, !user.isBanned)}
                        className={user.isBanned ? 'text-green-600 hover:text-green-900' : 'text-yellow-600 hover:text-yellow-900'}
                      >
                        {user.isBanned ? 'Unban' : 'Ban'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Credit Modal */}
      {showCreditModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Add Credits to {selectedUser.name}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credit Amount
              </label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount (can be negative to remove)"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowCreditModal(false);
                  setCreditAmount('');
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCredits}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}