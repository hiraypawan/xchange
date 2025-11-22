'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { apiCall } from '@/lib/api-config';

interface UserStats {
  credits: number;
  totalEarned: number;
  totalSpent: number;
  totalEngagements: number;
  completedEngagements: number;
  successRate: number;
  weeklyEarnings: number;
  todayEarned: number;
  todaySpent: number;
  weeklyChange: number;
  engagementBreakdown: {
    likes: number;
    retweets: number;
    replies: number;
    follows: number;
  };
}

interface UserStatsResponse {
  success: boolean;
  data: UserStats;
}

export function useRealTimeStats() {
  const { data: session } = useSession();
  
  console.log('useRealTimeStats - Hook called, session:', session ? 'EXISTS' : 'NULL', session?.user ? 'HAS_USER' : 'NO_USER');
  
  const [stats, setStats] = useState<UserStats>({
    credits: 0,
    totalEarned: 0,
    totalSpent: 0,
    totalEngagements: 0,
    completedEngagements: 0,
    successRate: 0,
    weeklyEarnings: 0,
    todayEarned: 0,
    todaySpent: 0,
    weeklyChange: 0,
    engagementBreakdown: {
      likes: 0,
      retweets: 0,
      replies: 0,
      follows: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    console.log('useRealTimeStats - fetchStats called with session:', !!session?.user, session?.user);
    
    if (!session?.user) {
      console.log('useRealTimeStats - No session, stopping');
      setIsLoading(false);
      return;
    }

    try {
      console.log('useRealTimeStats - Making API call to /api/user/stats');
      const response = await apiCall('/api/user/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const result: UserStatsResponse = await response.json();
      
      console.log('useRealTimeStats - API Response:', result);
      console.log('useRealTimeStats - Credits from API:', result.data?.credits);
      
      if (result.success) {
        // Calculate today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let todayEarned = 0;
        let todaySpent = 0;
        let weeklyEarned = 0;
        let previousWeekEarned = 0;
        
        // Get today's transactions (with error handling)
        try {
          const transactionsResponse = await apiCall('/api/user/transactions?since=' + today.toISOString());
          
          if (transactionsResponse.ok) {
            const transactionsResult = await transactionsResponse.json();
            
            if (transactionsResult.success && transactionsResult.data) {
              const transactions = transactionsResult.data;
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              const twoWeeksAgo = new Date();
              twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
              
              transactions.forEach((tx: any) => {
                const txDate = new Date(tx.createdAt);
                
                // Today's stats
                if (txDate >= today) {
                  if (tx.type === 'earn') {
                    todayEarned += tx.amount;
                  } else {
                    todaySpent += tx.amount;
                  }
                }
                
                // Weekly stats for percentage calculation
                if (txDate >= weekAgo) {
                  if (tx.type === 'earn') weeklyEarned += tx.amount;
                } else if (txDate >= twoWeeksAgo) {
                  if (tx.type === 'earn') previousWeekEarned += tx.amount;
                }
              });
            }
          }
        } catch (transactionError) {
          console.warn('Failed to fetch transactions for today stats:', transactionError);
          // Continue with default values (0s)
        }
        
        const weeklyChange = previousWeekEarned > 0 
          ? ((weeklyEarned - previousWeekEarned) / previousWeekEarned) * 100 
          : 0;

        // Get engagement breakdown (with error handling)
        let engagementBreakdown = { likes: 0, retweets: 0, replies: 0, follows: 0 };
        try {
          const engagementsResponse = await apiCall('/api/user/engagements');
          
          if (engagementsResponse.ok) {
            const engagementsResult = await engagementsResponse.json();
            
            if (engagementsResult.success && engagementsResult.data) {
              engagementsResult.data.forEach((engagement: any) => {
                switch (engagement.type) {
                  case 'like':
                    engagementBreakdown.likes++;
                    break;
                  case 'retweet':
                    engagementBreakdown.retweets++;
                    break;
                  case 'reply':
                    engagementBreakdown.replies++;
                    break;
                  case 'follow':
                    engagementBreakdown.follows++;
                    break;
                }
              });
            }
          }
        } catch (engagementError) {
          console.warn('Failed to fetch engagements for breakdown:', engagementError);
          // Continue with default values (0s)
        }

        setStats({
          ...result.data,
          todayEarned,
          todaySpent,
          weeklyChange: Math.round(weeklyChange * 10) / 10,
          engagementBreakdown
        });
        setError(null);
      } else {
        setError('Failed to load stats');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  // Initial fetch
  useEffect(() => {
    console.log('useRealTimeStats - Initial fetch useEffect triggered');
    fetchStats();
  }, [fetchStats]);

  // Real-time updates every 5 seconds
  useEffect(() => {
    if (!session?.user) return;

    const interval = setInterval(() => {
      fetchStats();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [session?.user, fetchStats]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (!document.hidden) {
        fetchStats();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  };
}