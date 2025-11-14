
import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { User, Investment, Transaction, Bonus, Rank, NewsPost, Notification, Project, InvestmentPool, TreasuryWallets } from '../types';
import { supabase } from '../supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { ACHIEVEMENTS_LIST, INITIAL_RANKS, INITIAL_TEAM_BUILDER_BONUS_RATES, INITIAL_INSTANT_BONUS_RATES, INITIAL_TREASURY_WALLETS, IGI_TOKEN_MINT_ADDRESS } from '../constants';

type InitialInvestmentData = { type: 'project' | 'pool', assetId: string, amount: number };

interface AppContextType {
  users: User[];
  investments: Investment[];
  transactions: Transaction[];
  bonuses: Bonus[];
  ranks: Rank[];
  news: NewsPost[];
  notifications: Notification[];
  projects: Project[];
  investmentPools: InvestmentPool[];
  instantBonusRates: { investor: number, referrer: number, upline: number };
  teamBuilderBonusRates: number[];
  treasuryWallets: TreasuryWallets;
  currentUser: User | null;
  loading: boolean;
  currentDate: Date; // Keep for simulation logic
  addInvestmentFromBalance: (amount: number, assetId: string, type: 'project' | 'pool', source: 'deposit' | 'profit_reinvestment') => Promise<void>;
  addCryptoDeposit: (amount: number, txHash: string) => Promise<void>;
  addWithdrawal: (amount: number, balance: number) => Promise<void>;
  updateKycStatus: (userId: string, status: 'Verified' | 'Pending' | 'Rejected' | 'Not Submitted') => Promise<void>;
  toggleFreezeUser: (userId: string) => Promise<void>;
  markNotificationsAsRead: () => Promise<void>;
  updateUser: (updatedUser: Partial<User> & { id: string }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deleteInvestment: (investmentId: string) => Promise<void>;
  updateRankSettings: (updatedRanks: Rank[]) => Promise<void>;
  addManualTransaction: (userId: string, type: 'Manual Bonus' | 'Manual Deduction', amount: number, reason: string) => Promise<void>;
  addNewsPost: (post: Omit<NewsPost, 'id' | 'created_at'>) => Promise<void>;
  deleteNewsPost: (postId: string) => Promise<void>;
  runMonthlyCycle: (cycleDate: Date) => void;
  advanceDate: (days: number) => void;
  addProject: (project: Partial<Omit<Project, 'id' | 'created_at'>>) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addInvestmentPool: (pool: Omit<InvestmentPool, 'id' | 'created_at'>) => Promise<void>;
  updateInvestmentPool: (pool: InvestmentPool) => Promise<void>;
  deleteInvestmentPool: (poolId: string) => Promise<void>;
  adjustUserRank: (userId: string, newRank: number, reason: string) => Promise<void>;
  getUserBalances: (userId: string) => { depositBalance: number, profitBalance: number };
  solanaWalletAddress: string | null;
  igiTokenBalance: number | null;
  solBalance: number | null;
  connectSolanaWallet: () => Promise<void>;
  disconnectSolanaWallet: () => void;
  fetchAllBalances: () => Promise<void>;
  authenticateUser: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: { name: string; email: string; password: string; referralCode?: string }) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  // Admin functions
  approveDeposit: (transactionId: string) => Promise<void>;
  rejectDeposit: (transactionId: string, reason: string) => Promise<void>;
  createUser: (user: Omit<User, 'id' | 'created_at' | 'totalInvestment' | 'totalDownline' | 'monthlyIncome' | 'achievements'>, initialInvestments?: InitialInvestmentData[]) => Promise<void>;
  updateUserRole: (userId: string, role: 'user' | 'admin') => Promise<void>;
  addInvestmentForUser: (userId: string, amount: number, assetId: string, type: 'project' | 'pool', source: 'deposit' | 'profit_reinvestment') => Promise<void>;
  confirmCryptoInvestment: (userId: string, amount: number, assetId: string, type: 'project' | 'pool') => Promise<void>;
  updateInvestment: (investment: Investment) => Promise<void>;
  updateNewsPost: (post: NewsPost) => Promise<void>;
  updateBonusRates: (newInstantRates: { investor: number, referrer: number, upline: number }, newTeamRates: number[]) => Promise<void>;
  updateTreasuryWallets: (wallets: TreasuryWallets) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  const { t } = useLocalization();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [investmentPools, setInvestmentPools] = useState<InvestmentPool[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date('2023-11-28T12:00:00Z'));
  const [instantBonusRates, setInstantBonusRates] = useState(INITIAL_INSTANT_BONUS_RATES);
  const [teamBuilderBonusRates, setTeamBuilderBonusRates] = useState(INITIAL_TEAM_BUILDER_BONUS_RATES);
  const [treasuryWallets, setTreasuryWallets] = useState<TreasuryWallets>(INITIAL_TREASURY_WALLETS);
  const [solanaWalletAddress, setSolanaWalletAddress] = useState<string | null>(null);
  const [igiTokenBalance, setIgiTokenBalance] = useState<number | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
        const [
            usersRes, investmentsRes, transactionsRes, bonusesRes, ranksRes, 
            newsRes, notificationsRes, projectsRes, poolsRes
        ] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('investments').select('*'),
            supabase.from('transactions').select('*'),
            supabase.from('bonuses').select('*'),
            supabase.from('ranks').select('*'),
            supabase.from('news').select('*').order('date', { ascending: false }),
            supabase.from('notifications').select('*'),
            supabase.from('projects').select('*'),
            supabase.from('investment_pools').select('*')
        ]);

        if (usersRes.data) setUsers(usersRes.data);
        if (investmentsRes.data) setInvestments(investmentsRes.data);
        if (transactionsRes.data) setTransactions(transactionsRes.data);
        if (bonusesRes.data) setBonuses(bonusesRes.data);
        if (ranksRes.data && ranksRes.data.length > 0) {
          setRanks(ranksRes.data);
        } else {
          setRanks(INITIAL_RANKS); // Fallback to initial constants if DB is empty
        }
        if (newsRes.data) setNews(newsRes.data);
        if (notificationsRes.data) setNotifications(notificationsRes.data);
        if (projectsRes.data) setProjects(projectsRes.data);
        if (poolsRes.data) setInvestmentPools(poolsRes.data);

    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoading(false);
    }
  };


  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userProfile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        setCurrentUser(userProfile);
      }
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          const { data: userProfile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
          setCurrentUser(userProfile);
          if (userProfile) {
            await fetchAllData();
          }
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Simplified functions, you'd need to implement all of them with Supabase calls.
  // This is a representative sample.
  
  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('notifications').insert(notification).select().single();
    if(data) setNotifications(prev => [...prev, data]);
    if(error) console.error("Error adding notification", error);
  }, []);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('transactions').insert(tx).select().single();
    if(data) setTransactions(prev => [...prev, data]);
    if(error) console.error("Error adding transaction", error);
    return data;
  }, []);

  const addBonus = useCallback(async (bonus: Omit<Bonus, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('bonuses').insert(bonus).select().single();
    if(data) setBonuses(prev => [...prev, data]);
    if(error) console.error("Error adding bonus", error);
  }, []);

  const updateUser = useCallback(async (updatedUser: Partial<User> & { id: string }) => {
    const { data, error } = await supabase.from('users').update(updatedUser).eq('id', updatedUser.id).select().single();
    if (data) {
        setUsers(prev => prev.map(u => u.id === data.id ? data : u));
        if (currentUser?.id === data.id) {
            setCurrentUser(data);
        }
    }
    if (error) console.error("Error updating user", error);
  }, [currentUser?.id]);

  const executeInvestment = useCallback(async (userId: string, amount: number, assetId: string, investmentType: 'project' | 'pool', source: 'deposit' | 'profit_reinvestment') => {
    // This function becomes much more complex with async operations.
    // Each step needs to await the previous one.
    // For brevity, this is a simplified version. The real implementation would be more robust.
    const investingUser = users.find(u => u.id === userId);
    if (!investingUser) return;
    
    let newInvestmentData: Partial<Investment> = {};
    if (investmentType === 'project') {
      const project = projects.find(p => p.id === assetId);
      if (project) newInvestmentData = { projectId: project.id, projectName: project.tokenName };
    } else {
      const pool = investmentPools.find(p => p.id === assetId);
      if (pool) newInvestmentData = { poolId: pool.id, poolName: pool.name };
    }

    const { data: newInvestment, error: invError } = await supabase.from('investments').insert({
        userId: userId, amount, date: currentDate.toISOString().split('T')[0],
        status: 'Active', ...newInvestmentData, totalProfitEarned: 0, source: source,
    }).select().single();

    if (invError || !newInvestment) {
        console.error("Error creating investment", invError);
        return;
    }
    setInvestments(prev => [...prev, newInvestment]);

    await addTransaction({
        userId, type: source === 'profit_reinvestment' ? 'Reinvestment' : 'Investment',
        amount, txHash: `internal-${Date.now()}`, date: newInvestment.date, investmentId: newInvestment.id,
    });
    
    // ... Bonus logic would also need to be converted to async calls ...
    
    await updateUser({ id: userId, totalInvestment: investingUser.totalInvestment + amount });

  }, [users, projects, investmentPools, currentDate, addTransaction, addBonus, updateUser]);
  
  const addInvestmentFromBalance = async (amount: number, assetId: string, type: 'project' | 'pool', source: 'deposit' | 'profit_reinvestment') => {
      if (!currentUser) return;
      await executeInvestment(currentUser.id, amount, assetId, type, source);
  };
  
  const addCryptoDeposit = async (amount: number, txHash: string) => {
      if (!currentUser) return;
      await addTransaction({
          userId: currentUser.id, type: 'Deposit', amount, txHash,
          date: currentDate.toISOString().split('T')[0], status: 'pending',
      });
  };

  const authenticateUser = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signUp = async (data: { name: string; email: string; password: string; referralCode?: string }) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) return { error: authError.message };
    if (!authData.user) return { error: "Could not create user." };

    let uplineId: string | null = null;
    if (data.referralCode) {
      const { data: upline } = await supabase.from('users').select('id').eq('referralCode', data.referralCode).single();
      if (upline) uplineId = upline.id;
    }

    const newUserProfile: Omit<User, 'created_at'> = {
        id: authData.user.id, name: data.name, email: data.email,
        uplineId,
        referralCode: `${data.name.split(' ')[0].toUpperCase()}${Math.floor(100 + Math.random() * 900)}`,
        wallet: `0x...${Math.random().toString(16).substr(2, 8)}`,
        rank: 1, totalInvestment: 0, totalDownline: 0, monthlyIncome: 0,
        kycStatus: 'Not Submitted', avatar: `https://picsum.photos/seed/${Date.now()}/200/200`,
        country: 'Unknown', role: 'user', achievements: [],
        joinDate: currentDate.toISOString().split('T')[0],
    };

    const { error: profileError } = await supabase.from('users').insert(newUserProfile);

    if (profileError) {
        // Here you might want to delete the auth user if profile creation fails
        return { error: profileError.message };
    }
    
    // Manually set current user and fetch data as onAuthStateChange might not be fast enough
    setCurrentUser({ ...newUserProfile, created_at: new Date().toISOString() });
    await fetchAllData();
    
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUsers([]);
    // Clear all other state
  };

  // Mocked/Placeholder implementations for other functions
  const placeholderAsync = async (name: string) => { console.warn(`${name} is not implemented`); };
  const placeholderSync = (name: string) => { console.warn(`${name} is not implemented`); return { depositBalance: 0, profitBalance: 0 }; };

  const value: AppContextType = {
    currentUser, loading, users, investments, transactions, bonuses, ranks, news, notifications,
    projects, investmentPools, instantBonusRates, teamBuilderBonusRates, treasuryWallets, currentDate,
    authenticateUser, signUp, logout,
    addInvestmentFromBalance,
    addCryptoDeposit,
    // Provide all other functions, even if they are placeholders
    addWithdrawal: (amount) => placeholderAsync(`addWithdrawal ${amount}`),
    updateKycStatus: (userId, status) => updateUser({ id: userId, kycStatus: status }),
    toggleFreezeUser: (userId) => {
        const user = users.find(u => u.id === userId);
        if(user) updateUser({ id: userId, isFrozen: !user.isFrozen });
        return Promise.resolve();
    },
    markNotificationsAsRead: () => placeholderAsync('markNotificationsAsRead'),
    updateUser,
    deleteUser: (userId) => placeholderAsync(`deleteUser ${userId}`),
    deleteInvestment: (invId) => placeholderAsync(`deleteInvestment ${invId}`),
    updateRankSettings: () => placeholderAsync('updateRankSettings'),
    addManualTransaction: (userId, type, amount, reason) => addTransaction({ userId, type, amount, reason, txHash: `MANUAL-${Date.now()}`, date: currentDate.toISOString().split('T')[0] }),
    addNewsPost: () => placeholderAsync('addNewsPost'),
    deleteNewsPost: () => placeholderAsync('deleteNewsPost'),
    runMonthlyCycle: () => console.warn('runMonthlyCycle is not implemented'),
    advanceDate: () => console.warn('advanceDate is not implemented'),
    addProject: () => placeholderAsync('addProject'),
    updateProject: () => placeholderAsync('updateProject'),
    deleteProject: () => placeholderAsync('deleteProject'),
    addInvestmentPool: () => placeholderAsync('addInvestmentPool'),
    updateInvestmentPool: () => placeholderAsync('updateInvestmentPool'),
    deleteInvestmentPool: () => placeholderAsync('deleteInvestmentPool'),
    adjustUserRank: () => placeholderAsync('adjustUserRank'),
    getUserBalances: (userId: string) => {
        const userTransactions = transactions.filter(t => t.userId === userId);
        const totalDeposits = userTransactions.filter(t => t.type === 'Deposit' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
        const totalWithdrawals = userTransactions.filter(t => t.type === 'Withdrawal').reduce((sum, t) => sum + t.amount, 0);
        const totalProfits = userTransactions.filter(t => t.type === 'Profit Share' || t.type === 'Bonus').reduce((sum, t) => sum + t.amount, 0);
        return { depositBalance: totalDeposits - totalWithdrawals, profitBalance: totalProfits };
    },
    solanaWalletAddress, igiTokenBalance, solBalance, 
    connectSolanaWallet: () => placeholderAsync('connectSolanaWallet'),
    disconnectSolanaWallet: () => placeholderAsync('disconnectSolanaWallet'),
    fetchAllBalances: () => placeholderAsync('fetchAllBalances'),
    approveDeposit: async (txId) => {
        const { error } = await supabase.from('transactions').update({ status: 'completed' }).eq('id', txId);
        if (!error) await fetchAllData();
    },
    rejectDeposit: async (txId, reason) => {
        const { error } = await supabase.from('transactions').update({ status: 'rejected', rejectionReason: reason }).eq('id', txId);
        if (!error) await fetchAllData();
    },
    createUser: () => placeholderAsync('createUser'),
    updateUserRole: (userId, role) => updateUser({id: userId, role}),
    addInvestmentForUser: executeInvestment,
    confirmCryptoInvestment: () => placeholderAsync('confirmCryptoInvestment'),
    updateInvestment: () => placeholderAsync('updateInvestment'),
    updateNewsPost: () => placeholderAsync('updateNewsPost'),
    updateBonusRates: () => placeholderAsync('updateBonusRates'),
    updateTreasuryWallets: () => placeholderAsync('updateTreasuryWallets'),
    ...({} as any) // Cast to any to satisfy the interface for brevity
  };


  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
