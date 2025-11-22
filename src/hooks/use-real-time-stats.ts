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
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiCall('/api/user/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const result: UserStatsResponse = await response.json();
      
      if (result.success) {
        // Calculate today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get today's transactions
        const transactionsResponse = await apiCall('/api/user/transactions?since=' + today.toISOString());
        const transactionsResult = await transactionsResponse.json();
        
        let todayEarned = 0;
        let todaySpent = 0;
        let weeklyEarned = 0;
        let previousWeekEarned = 0;
        
        if (transactionsResult.success) {
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
        
        const weeklyChange = previousWeekEarned > 0 
          ? ((weeklyEarned - previousWeekEarned) / previousWeekEarned) * 100 
          : 0;

        // Get engagement breakdown
        const engagementsResponse = await fetch('/api/user/engagements');
        const engagementsResult = await engagementsResponse.json();
        
        let engagementBreakdown = { likes: 0, retweets: 0, replies: 0, follows: 0 };
        if (engagementsResult.success) {
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
  }, [session?.user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time updates every 5 seconds
  useEffect(() => {
    if (!session?.user?.id) return;

    const interval = setInterval(() => {
      fetchStats();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [session?.user?.id, fetchStats]);

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