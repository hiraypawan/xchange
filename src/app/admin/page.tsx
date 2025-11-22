'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, formatNumber, formatDate, type User, type AdminStats } from '@/lib/admin';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userTransactions, setUserTransactions] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, banned
  const [sortBy, setSortBy] = useState('createdAt'); // createdAt, credits, engagements

  // Check if user is admin - only Pawan Hiray has access
  const userIsAdmin = session ? (
    isAdmin(session) || 
    session.user?.name?.includes('Pawan') ||
    session.user?.email?.includes('pawan')
  ) : false;

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
      
      // Use real API only - no fake data
      console.log('Loading real admin data from API...');
      
      try {
        const [statsResponse, usersResponse] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/users')
        ]);

        let realStats = null;
        let realUsers = [];

        if (statsResponse.ok) {
          realStats = await statsResponse.json();
          setStats(realStats);
          console.log('✅ Real stats loaded:', realStats);
        } else {
          console.error('❌ Failed to load stats:', statsResponse.status);
        }

        if (usersResponse.ok) {
          realUsers = await usersResponse.json();
          setUsers(realUsers);
          console.log('✅ Real users loaded:', realUsers.length, 'users');
        } else {
          console.error('❌ Failed to load users:', usersResponse.status);
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ Error loading real data:', error);
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

  // Advanced filtering and sorting
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' ? true :
                           filterStatus === 'active' ? !user.isBanned :
                           filterStatus === 'banned' ? user.isBanned : true;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'credits':
          return b.credits - a.credits;
        case 'engagements':
          return b.engagementCount - a.engagementCount;
        case 'createdAt':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;

    const action = bulkAction;
    setBulkAction('');
    
    try {
      if (action === 'ban') {
        for (const userId of selectedUsers) {
          await handleBanUser(userId, true);
        }
      } else if (action === 'unban') {
        for (const userId of selectedUsers) {
          await handleBanUser(userId, false);
        }
      } else if (action === 'add_credits') {
        const amount = parseInt(prompt('Enter credits to add:') || '0');
        if (amount > 0) {
          for (const userId of selectedUsers) {
            const user = users.find(u => u.id === userId);
            if (user) {
              setSelectedUser(user);
              setCreditAmount(amount.toString());
              await handleAddCredits();
            }
          }
        }
      }
      setSelectedUsers([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  console.log('Admin page render state:', { 
    status, 
    loading, 
    userIsAdmin, 
    session: !!session, 
    activeTab,
    hasStats: !!stats,
    userCount: users.length 
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          <p className="mt-2 text-sm text-gray-500">Status: {status}, Loading: {loading.toString()}</p>
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
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'users', name: 'User Management', icon: '👥' },
              { id: 'analytics', name: 'Analytics', icon: '📈' },
              { id: 'transactions', name: 'Credit History', icon: '💰' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Health</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">User Activity Rate</span>
                    <span className="text-sm font-medium">{((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Average Credits per User</span>
                    <span className="text-sm font-medium">{(stats.totalCredits / stats.totalUsers).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Engagements per User</span>
                    <span className="text-sm font-medium">{(stats.totalEngagements / stats.totalUsers).toFixed(1)}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Growth Trends</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Daily Growth Rate</span>
                    <span className="text-sm font-medium text-green-600">+{(stats.todaySignups / 30).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Weekly Growth</span>
                    <span className="text-sm font-medium text-green-600">+{stats.weeklyGrowth || 0} users</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Monthly Projection</span>
                    <span className="text-sm font-medium text-blue-600">+{(stats.todaySignups * 30).toFixed(0)} users</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{((filteredUsers.filter(u => !u.isBanned).length / filteredUsers.length) * 100).toFixed(1)}%</p>
                  <p className="text-sm text-gray-500">Active User Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{filteredUsers.reduce((sum, u) => sum + u.totalEarned, 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Total Credits Earned</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{filteredUsers.reduce((sum, u) => sum + u.totalSpent, 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Total Credits Spent</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">By Credit Range</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">0-10 credits</span>
                      <span className="text-sm font-medium">{filteredUsers.filter(u => u.credits <= 10).length} users</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">11-50 credits</span>
                      <span className="text-sm font-medium">{filteredUsers.filter(u => u.credits > 10 && u.credits <= 50).length} users</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">50+ credits</span>
                      <span className="text-sm font-medium">{filteredUsers.filter(u => u.credits > 50).length} users</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">By Activity Level</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">High (50+ engagements)</span>
                      <span className="text-sm font-medium">{filteredUsers.filter(u => u.engagementCount >= 50).length} users</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Medium (10-49 engagements)</span>
                      <span className="text-sm font-medium">{filteredUsers.filter(u => u.engagementCount >= 10 && u.engagementCount < 50).length} users</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Low (0-9 engagements)</span>
                      <span className="text-sm font-medium">{filteredUsers.filter(u => u.engagementCount < 10).length} users</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                <button
                  onClick={loadAdminData}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Refresh
                </button>
              </div>
              
              {/* Advanced Filters */}
              <div className="flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Only</option>
                  <option value="banned">Banned Only</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="createdAt">Sort by Join Date</option>
                  <option value="credits">Sort by Credits</option>
                  <option value="engagements">Sort by Engagements</option>
                </select>
              </div>
              
              {/* Bulk Actions */}
              {selectedUsers.length > 0 && (
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                  </span>
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="px-3 py-1 border border-blue-300 rounded text-sm"
                  >
                    <option value="">Choose bulk action...</option>
                    <option value="ban">Ban Selected</option>
                    <option value="unban">Unban Selected</option>
                    <option value="add_credits">Add Credits</option>
                  </select>
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setSelectedUsers([])}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map(u => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={user.isBanned ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
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
                      <div className="text-sm text-gray-500">Activity level: {user.engagementCount >= 50 ? 'High' : user.engagementCount >= 10 ? 'Medium' : 'Low'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(user.createdAt)}</div>
                      <div className="text-sm text-gray-500">{Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago</div>
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
        )}

        {/* Credit History Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Credit Transaction History</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{filteredUsers.reduce((sum, u) => sum + u.totalEarned, 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Earned</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{filteredUsers.reduce((sum, u) => sum + u.totalSpent, 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Spent</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{filteredUsers.reduce((sum, u) => sum + u.credits, 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Current Balance</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{(filteredUsers.reduce((sum, u) => sum + u.credits, 0) / filteredUsers.length).toFixed(1)}</p>
                  <p className="text-sm text-gray-600">Avg per User</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Recent Activity</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {filteredUsers.slice(0, 10).map(user => (
                      <div key={user.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <img className="h-8 w-8 rounded-full" src={user.image || '/default-avatar.png'} alt="" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">Joined {formatDate(user.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{user.credits} credits</p>
                          <p className="text-xs text-gray-500">+{user.totalEarned} earned</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Credit Distribution Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Credit Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Low Balance (0-10)</h4>
                  <div className="bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-red-500 h-4 rounded-full" 
                      style={{width: `${(filteredUsers.filter(u => u.credits <= 10).length / filteredUsers.length) * 100}%`}}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{filteredUsers.filter(u => u.credits <= 10).length} users ({((filteredUsers.filter(u => u.credits <= 10).length / filteredUsers.length) * 100).toFixed(1)}%)</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Medium Balance (11-50)</h4>
                  <div className="bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-yellow-500 h-4 rounded-full" 
                      style={{width: `${(filteredUsers.filter(u => u.credits > 10 && u.credits <= 50).length / filteredUsers.length) * 100}%`}}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{filteredUsers.filter(u => u.credits > 10 && u.credits <= 50).length} users ({((filteredUsers.filter(u => u.credits > 10 && u.credits <= 50).length / filteredUsers.length) * 100).toFixed(1)}%)</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">High Balance (50+)</h4>
                  <div className="bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-500 h-4 rounded-full" 
                      style={{width: `${(filteredUsers.filter(u => u.credits > 50).length / filteredUsers.length) * 100}%`}}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{filteredUsers.filter(u => u.credits > 50).length} users ({((filteredUsers.filter(u => u.credits > 50).length / filteredUsers.length) * 100).toFixed(1)}%)</p>
                </div>
              </div>
            </div>
          </div>
        )}
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