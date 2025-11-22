// Admin utility functions and middleware

export function isAdmin(session: any): boolean {
  // Check if the user is you (the admin)
  // You can modify these conditions to match your account details
  return (
    session?.user?.email === 'your-email@example.com' || 
    session?.user?.name === 'Pawan Hiray' ||
    session?.user?.id === 'your-twitter-user-id' ||
    // Add your actual Twitter username or email here
    session?.user?.email?.toLowerCase().includes('pawan') ||
    session?.user?.name?.toLowerCase().includes('pawan hiray')
  );
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: AdminAction;
  targetUserId?: string;
  targetUserName?: string;
  details: string;
  timestamp: string;
}

export type AdminAction = 
  | 'BAN_USER'
  | 'UNBAN_USER' 
  | 'DELETE_USER'
  | 'ADJUST_CREDITS'
  | 'LOGIN'
  | 'VIEW_USERS'
  | 'VIEW_STATS';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCredits: number;
  totalEngagements: number;
  todaySignups: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image: string;
  credits: number;
  createdAt: string;
  lastActive?: string;
  isBanned: boolean;
  totalEarned: number;
  totalSpent: number;
  engagementCount: number;
}

// Mock data generators for development
export function generateMockUsers(count: number = 20): User[] {
  const users: User[] = [];
  const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Alex Brown', 'Emma Davis', 'Chris Lee', 'Lisa Anderson'];
  
  for (let i = 0; i < count; i++) {
    const name = names[i % names.length];
    const email = name.toLowerCase().replace(' ', '.') + `${i}@example.com`;
    const credits = Math.floor(Math.random() * 100);
    const totalEarned = Math.floor(Math.random() * 500) + credits;
    
    users.push({
      id: `user_${i + 1}`,
      name: `${name} ${i > 7 ? i - 7 : ''}`.trim(),
      email,
      image: `https://images.unsplash.com/photo-${1472099645785 + i}?w=100&h=100&fit=crop&crop=face`,
      credits,
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      isBanned: Math.random() < 0.1, // 10% chance of being banned
      totalEarned,
      totalSpent: totalEarned - credits,
      engagementCount: Math.floor(Math.random() * 200)
    });
  }
  
  return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function generateMockStats(): AdminStats {
  return {
    totalUsers: Math.floor(Math.random() * 1000) + 500,
    activeUsers: Math.floor(Math.random() * 300) + 200,
    totalCredits: Math.floor(Math.random() * 10000) + 5000,
    totalEngagements: Math.floor(Math.random() * 5000) + 2000,
    todaySignups: Math.floor(Math.random() * 20) + 5,
    weeklyGrowth: Math.floor(Math.random() * 50) + 10,
    monthlyGrowth: Math.floor(Math.random() * 200) + 50
  };
}

// Format numbers for display
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Format dates
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}