import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { User, Investment, Transaction, Bonus, Rank, NewsPost, Notification, Project, InvestmentPool, TreasuryWallets } from '../types';
import { MOCK_USERS, MOCK_INVESTMENTS, MOCK_TRANSACTIONS, MOCK_BONUSES, INITIAL_RANKS, MOCK_NEWS, ACHIEVEMENTS_LIST, INITIAL_TEAM_BUILDER_BONUS_RATES, INITIAL_INSTANT_BONUS_RATES, MOCK_PROJECTS, MOCK_INVESTMENT_POOLS, INITIAL_TREASURY_WALLETS, IGI_TOKEN_MINT_ADDRESS } from '../constants';

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
  currentDate: Date;
  addInvestmentFromBalance: (amount: number, assetId: string, type: 'project' | 'pool', source: 'deposit' | 'profit_reinvestment') => void;
  addCryptoDeposit: (amount: number, txHash: string) => void;
  addWithdrawal: (amount: number, balance: number) => void;
  updateKycStatus: (userId: string, status: 'Verified' | 'Pending' | 'Rejected' | 'Not Submitted') => void;
  toggleFreezeUser: (userId: string) => void;
  markNotificationsAsRead: () => void;
  updateUser: (updatedUser: User) => void;
  deleteUser: (userId: string) => void;
  deleteInvestment: (investmentId: string) => void;
  updateRankSettings: (updatedRanks: Rank[]) => void;
  addManualTransaction: (userId: string, type: 'Manual Bonus' | 'Manual Deduction', amount: number, reason: string) => void;
  addNewsPost: (post: Omit<NewsPost, 'id'>) => void;
  deleteNewsPost: (postId: string) => void;
  runMonthlyCycle: (cycleDate: Date) => void;
  advanceDate: (days: number) => void;
  addProject: (project: Partial<Omit<Project, 'id'>>) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  addInvestmentPool: (pool: Omit<InvestmentPool, 'id'>) => void;
  updateInvestmentPool: (pool: InvestmentPool) => void;
  deleteInvestmentPool: (poolId: string) => void;
  adjustUserRank: (userId: string, newRank: number, reason: string) => void;
  getUserBalances: (userId: string) => { depositBalance: number, profitBalance: number };
  solanaWalletAddress: string | null;
  igiTokenBalance: number | null;
  solBalance: number | null;
  connectSolanaWallet: () => Promise<void>;
  disconnectSolanaWallet: () => void;
  fetchAllBalances: () => Promise<void>;
  // Admin functions
  approveDeposit: (transactionId: string) => void;
  rejectDeposit: (transactionId: string, reason: string) => void;
  createUser: (user: Omit<User, 'id' | 'totalInvestment' | 'totalDownline' | 'monthlyIncome' | 'achievements'>, initialInvestments?: InitialInvestmentData[]) => void;
  updateUserRole: (userId: string, role: 'user' | 'admin') => void;
  addInvestmentForUser: (userId: string, amount: number, assetId: string, type: 'project' | 'pool', source: 'deposit' | 'profit_reinvestment') => void;
  confirmCryptoInvestment: (userId: string, amount: number, assetId: string, type: 'project' | 'pool') => void;
  updateInvestment: (investment: Investment) => void;
  updateNewsPost: (post: NewsPost) => void;
  updateBonusRates: (newInstantRates: { investor: number, referrer: number, upline: number }, newTeamRates: number[]) => void;
  updateTreasuryWallets: (wallets: TreasuryWallets) => void;
  logout: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppContextProviderProps {
  children: ReactNode;
  currentUser: User | null;
  logout: () => void;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children, currentUser, logout }) => {
  const { t } = useLocalization();
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [investments, setInvestments] = useState<Investment[]>(MOCK_INVESTMENTS);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [bonuses, setBonuses] = useState<Bonus[]>(MOCK_BONUSES);
  const [ranks, setRanks] = useState<Rank[]>(INITIAL_RANKS);
  const [news, setNews] = useState<NewsPost[]>(MOCK_NEWS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [investmentPools, setInvestmentPools] = useState<InvestmentPool[]>(MOCK_INVESTMENT_POOLS);
  const [currentDate, setCurrentDate] = useState(new Date('2023-11-28T12:00:00Z'));
  const [instantBonusRates, setInstantBonusRates] = useState(INITIAL_INSTANT_BONUS_RATES);
  const [teamBuilderBonusRates, setTeamBuilderBonusRates] = useState(INITIAL_TEAM_BUILDER_BONUS_RATES);
  const [treasuryWallets, setTreasuryWallets] = useState<TreasuryWallets>(INITIAL_TREASURY_WALLETS);
  const [solanaWalletAddress, setSolanaWalletAddress] = useState<string | null>(null);
  const [igiTokenBalance, setIgiTokenBalance] = useState<number | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);


  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    setNotifications(prev => [...prev, { ...notification, id: `notif-${Date.now()}${Math.random()}` }]);
  }, []);

  const checkAndAwardAchievements = useCallback((user: User, allUsers: User[]): string[] => {
      const existingAchievements = new Set(user.achievements);
      ACHIEVEMENTS_LIST.forEach(ach => {
          if (!existingAchievements.has(ach.id) && ach.criteria(user, allUsers)) {
              existingAchievements.add(ach.id);
          }
      });
      return Array.from(existingAchievements);
  }, []);

  useEffect(() => {
    setUsers(prevUsers => {
        return prevUsers.map(user => {
            const achievements = checkAndAwardAchievements(user, prevUsers);
            return { ...user, achievements };
        });
    });
  }, [checkAndAwardAchievements, transactions]);


  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [...prev, { ...tx, id: `txn-${Date.now()}${Math.random()}` }]);
  }, []);
  
  const addBonus = useCallback((bonus: Omit<Bonus, 'id'>) => {
    setBonuses(prev => [...prev, { ...bonus, id: `bns-${Date.now()}${Math.random()}` }]);
  }, []);
  
  const updateUser = useCallback((updatedUser: User) => {
    const originalUser = users.find(u => u.id === updatedUser.id);
    if (originalUser && updatedUser.uplineId && originalUser.uplineId !== updatedUser.uplineId) {
        addNotification({
            userId: updatedUser.uplineId,
            type: 'New Downline',
            message: `${updatedUser.name} has joined your team!`,
            date: currentDate.toISOString().split('T')[0],
            read: false,
        });
    }

    setUsers(prevUsers => {
        const achievements = checkAndAwardAchievements(updatedUser, prevUsers);
        const finalUser = { ...updatedUser, achievements };
        return prevUsers.map(u => u.id === finalUser.id ? finalUser : u);
    });
  }, [users, addNotification, checkAndAwardAchievements, currentDate]);

  const executeInvestment = useCallback((userId: string, amount: number, assetId: string, investmentType: 'project' | 'pool', source: 'deposit' | 'profit_reinvestment') => {
    const investingUser = users.find(u => u.id === userId);
    if (!investingUser) return;
    
    let newInvestmentData: Partial<Investment> = {};

    if (investmentType === 'project') {
      const project = projects.find(p => p.id === assetId);
      if (!project) return;
      newInvestmentData = { projectId: project.id, projectName: project.tokenName };
    } else { // 'pool'
      const pool = investmentPools.find(p => p.id === assetId);
      if (!pool) return;
      newInvestmentData = { poolId: pool.id, poolName: pool.name };
    }
    
    const newInvestment: Investment = {
      id: `inv-${Date.now()}`,
      userId: userId,
      amount,
      date: currentDate.toISOString().split('T')[0],
      status: 'Active',
      ...newInvestmentData,
      totalProfitEarned: 0,
      source: source,
    };
    setInvestments(prev => [...prev, newInvestment]);
    
    addTransaction({
        userId: userId,
        type: source === 'profit_reinvestment' ? 'Reinvestment' : 'Investment',
        amount,
        txHash: `0x...${Date.now().toString().slice(-4)}`,
        date: currentDate.toISOString().split('T')[0],
        investmentId: newInvestment.id,
    });

    // Instant bonus distribution (using dynamic rates)
    const investorBonus: Omit<Bonus, 'id'> = {
      userId: userId, type: 'Instant', sourceId: newInvestment.id, amount: amount * instantBonusRates.investor,
      date: currentDate.toISOString().split('T')[0], read: false,
    };
    addBonus(investorBonus);
    addTransaction({ userId: investorBonus.userId, type: 'Bonus', amount: investorBonus.amount, date: investorBonus.date, txHash: `0x...${Date.now().toString().slice(-4)}` });

    if (investingUser.uplineId) {
        const referrerBonus: Omit<Bonus, 'id'> = {
            userId: investingUser.uplineId, type: 'Instant', sourceId: newInvestment.id, amount: amount * instantBonusRates.referrer,
            date: currentDate.toISOString().split('T')[0], read: false,
        };
        addBonus(referrerBonus);
        addTransaction({ userId: referrerBonus.userId, type: 'Bonus', amount: referrerBonus.amount, date: referrerBonus.date, txHash: `0x...${Date.now().toString().slice(-3)}` });
        
        const referrer = users.find(u => u.id === investingUser.uplineId);
        if(referrer?.uplineId) {
            const uplineBonus: Omit<Bonus, 'id'> = {
                userId: referrer.uplineId, type: 'Instant', sourceId: newInvestment.id, amount: amount * instantBonusRates.upline,
                date: currentDate.toISOString().split('T')[0], read: false,
            };
            addBonus(uplineBonus);
            addTransaction({ userId: uplineBonus.userId, type: 'Bonus', amount: uplineBonus.amount, date: uplineBonus.date, txHash: `0x...${Date.now().toString().slice(-2)}` });
        }
    }
    
    // Team Builder Bonuses (Rank-based depth)
    let currentUpline = users.find(u => u.id === investingUser.uplineId);
    for (let level = 0; level < teamBuilderBonusRates.length; level++) {
        if (!currentUpline) break;
        
        if (currentUpline.rank > level) {
            const bonusRate = teamBuilderBonusRates[level];
            const bonusAmount = amount * bonusRate;
            if (bonusAmount > 0) {
                const teamBonus: Omit<Bonus, 'id'> = {
                    userId: currentUpline.id, type: 'Team Builder', sourceId: newInvestment.id, amount: bonusAmount,
                    date: currentDate.toISOString().split('T')[0], read: false,
                };
                addBonus(teamBonus);
                addTransaction({ userId: teamBonus.userId, type: 'Bonus', amount: teamBonus.amount, date: teamBonus.date, txHash: `0x...team${level}-${Date.now().toString().slice(-3)}` });
            }
        }
        currentUpline = users.find(u => u.id === currentUpline?.uplineId);
    }

    const userToUpdate = users.find(user => user.id === userId);
    if(userToUpdate) {
        const updatedUser = { ...userToUpdate, totalInvestment: userToUpdate.totalInvestment + amount };
        updateUser(updatedUser);
    }

  }, [users, addTransaction, addBonus, updateUser, currentDate, projects, investmentPools, instantBonusRates, teamBuilderBonusRates]);

  const addInvestmentFromBalance = useCallback((amount: number, assetId: string, type: 'project' | 'pool', source: 'deposit' | 'profit_reinvestment') => {
    if (!currentUser) return;
    executeInvestment(currentUser.id, amount, assetId, type, source);
  }, [currentUser, executeInvestment]);

  const addCryptoDeposit = useCallback((amount: number, txHash: string) => {
      if (!currentUser) return;
      addTransaction({
          userId: currentUser.id,
          type: 'Deposit',
          amount,
          txHash: txHash,
          date: currentDate.toISOString().split('T')[0],
          status: 'pending',
      });
  }, [currentUser, addTransaction, currentDate]);


  const addWithdrawal = useCallback((amount: number, balance: number) => {
    if (!currentUser) return;
    if (amount > balance) {
        alert("Withdrawal amount cannot exceed balance.");
        return;
    }
    addTransaction({
      userId: currentUser.id, type: 'Withdrawal', amount,
      date: currentDate.toISOString().split('T')[0], txHash: `0x...wdw${Date.now().toString().slice(-4)}`,
    });
  }, [currentUser, addTransaction, currentDate]);

  const updateKycStatus = useCallback((userId: string, status: 'Verified' | 'Pending' | 'Rejected' | 'Not Submitted') => {
    const userToUpdate = users.find(u => u.id === userId);
    if (userToUpdate) {
      updateUser({ ...userToUpdate, kycStatus: status });
      if (status === 'Verified' || status === 'Rejected') {
          addNotification({
              userId, type: 'KYC Update', message: `Your KYC application has been ${status}.`,
              date: currentDate.toISOString().split('T')[0], read: false,
          });
      }
    }
  }, [users, updateUser, addNotification, currentDate]);

  const toggleFreezeUser = useCallback((userId: string) => {
    setUsers(prev => prev.map(user => user.id === userId ? { ...user, isFrozen: !user.isFrozen } : user));
  }, []);

  const markNotificationsAsRead = useCallback(() => {
    if(!currentUser) return;
    setBonuses(prev => prev.map(b => b.userId === currentUser.id ? {...b, read: true} : b));
    setNotifications(prev => prev.map(n => n.userId === currentUser.id ? {...n, read: true} : n));
  }, [currentUser]);

  const deleteUser = useCallback((userId: string) => {
    if(window.confirm('Are you sure you want to delete this user? This will also remove their investments, transactions, and bonuses.')) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        setInvestments(prev => prev.filter(inv => inv.userId !== userId));
        setTransactions(prev => prev.filter(tx => tx.userId !== userId));
        setBonuses(prev => prev.filter(b => b.userId !== userId));
        setUsers(prev => prev.map(u => u.uplineId === userId ? {...u, uplineId: null} : u));
    }
  }, []);

  const deleteInvestment = useCallback((investmentId: string) => {
     if(window.confirm('Are you sure you want to delete this investment? This will also remove any instant bonuses generated from it.')) {
        setInvestments(prev => prev.filter(inv => inv.id !== investmentId));
        setBonuses(prev => prev.filter(b => !(b.type === 'Instant' && b.sourceId === investmentId)));
     }
  }, []);

  const updateRankSettings = useCallback((updatedRanks: Rank[]) => {
    setRanks(updatedRanks);
    alert('Platform rank settings have been updated!');
  }, []);

  const addManualTransaction = useCallback((userId: string, type: 'Manual Bonus' | 'Manual Deduction', amount: number, reason: string) => {
    addTransaction({ userId, type, amount, reason, date: currentDate.toISOString().split('T')[0], txHash: `MANUAL-${Date.now()}` });
  }, [addTransaction, currentDate]);
  
  const addNewsPost = useCallback((post: Omit<NewsPost, 'id'>) => {
    const newPost: NewsPost = { ...post, id: `news-${Date.now()}` };
    setNews(prev => [newPost, ...prev]);
  }, []);

  const deleteNewsPost = useCallback((postId: string) => {
    if(window.confirm('Are you sure you want to delete this news post?')) {
        setNews(prev => prev.filter(p => p.id !== postId));
    }
  }, []);

  const runMonthlyCycle = useCallback((cycleDate: Date) => {
    console.log(`Running monthly cycle for ${cycleDate.toLocaleString('default', { month: 'long', year: 'numeric' })}...`);
    
    let updatedUsers = [...users];
    const newBonuses: Omit<Bonus, 'id'>[] = [];
    const newTransactions: Omit<Transaction, 'id'>[] = [];

    const getDownline = (userId: string, allUsers: User[]): User[] => {
        const directDownline = allUsers.filter(u => u.uplineId === userId);
        return [ ...directDownline, ...directDownline.flatMap(u => getDownline(u.id, allUsers)) ];
    };
    
    const cycleMonth = cycleDate.getMonth();
    const cycleYear = cycleDate.getFullYear();
    const monthStart = new Date(cycleYear, cycleMonth, 1);
    const monthEnd = new Date(cycleYear, cycleMonth + 1, 0);

    // 1. Rank Calculation
    updatedUsers = updatedUsers.map(user => {
        if (user.role === 'admin') return user;
        const downline = getDownline(user.id, users);
        const activeAccounts = downline.filter(u => u.totalInvestment > 0).length;
        
        const newlyQualified = downline.filter(u => {
            const joinDate = new Date(u.joinDate);
            if (joinDate < monthStart || joinDate > monthEnd) return false;
            if (u.kycStatus !== 'Verified') return false;
            const investmentThisMonth = investments
                .filter(inv => inv.userId === u.id && new Date(inv.date) >= monthStart && new Date(inv.date) <= monthEnd)
                .reduce((sum, inv) => sum + inv.amount, 0);
            
            return investmentThisMonth >= 3000;
        }).length;
        
        let newRankLevel = user.rank;
        const qualifiedRank = [...ranks]
            .sort((a,b) => b.level - a.level)
            .find(rankTier => activeAccounts >= rankTier.minAccounts && newlyQualified >= rankTier.newlyQualified);

        if (qualifiedRank && qualifiedRank.level > user.rank) {
            newRankLevel = qualifiedRank.level;
            addNotification({
                userId: user.id, type: 'Rank Promotion',
                message: `Congratulations! You have been promoted to Rank L${newRankLevel}.`,
                date: currentDate.toISOString().split('T')[0], read: false
            });
            const rankInfo = ranks.find(r => r.level === newRankLevel);
            if (rankInfo && rankInfo.fixedBonus > 0) {
                const leadershipBonus: Omit<Bonus, 'id'> = {
                    userId: user.id, type: 'Leadership', sourceId: `rank-${newRankLevel}`, amount: rankInfo.fixedBonus,
                    date: currentDate.toISOString().split('T')[0], read: false,
                };
                newBonuses.push(leadershipBonus);
                newTransactions.push({ userId: user.id, type: 'Bonus', amount: leadershipBonus.amount, date: leadershipBonus.date, txHash: `0x...lb${newRankLevel}-${Date.now().toString().slice(-4)}` });
            }
            return { ...user, rank: newRankLevel };
        }
        return user;
    });

    const getAssetGrowthRate = (totalAsset: number): number => {
        if (totalAsset >= 5000000) return 0.015;
        if (totalAsset >= 1000000) return 0.012;
        if (totalAsset > 0) return 0.010;
        return 0;
    };

    // 3. Asset Growth Bonus
    updatedUsers.forEach(user => {
        if (user.role === 'admin') return;
        const downline = getDownline(user.id, users);
        const totalTeamAsset = downline.reduce((sum, u) => sum + u.totalInvestment, 0);
        if (totalTeamAsset > 0) {
            const bonusRate = getAssetGrowthRate(totalTeamAsset);
            const bonusAmount = totalTeamAsset * bonusRate;
             const assetBonus: Omit<Bonus, 'id'> = {
                userId: user.id, type: 'Asset Growth', sourceId: `assets-${currentDate.toISOString().split('T')[0]}`, amount: bonusAmount,
                date: currentDate.toISOString().split('T')[0], read: false,
            };
            newBonuses.push(assetBonus);
            newTransactions.push({ userId: user.id, type: 'Bonus', amount: assetBonus.amount, date: assetBonus.date, txHash: `0x...ag-${Date.now().toString().slice(-4)}` });
        }
    });
    
    setUsers(updatedUsers);
    setBonuses(prev => [...prev, ...newBonuses.map((b, i) => ({...b, id: `bns-cycle-${Date.now()}-${i}`}))]);
    setTransactions(prev => [...prev, ...newTransactions.map((t, i) => ({...t, id: `txn-cycle-${Date.now()}-${i}`}))]);
    alert(`Monthly cycle for ${cycleDate.toLocaleString('default', { month: 'long' })} complete! Ranks and bonuses have been calculated.`);

  }, [users, ranks, addNotification, currentDate, investments]);

  useEffect(() => {
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);

    if (currentDate.getMonth() !== previousDate.getMonth()) {
        const cycleDate = new Date(currentDate.getFullYear(), currentDate.getMonth() -1, 1);
        runMonthlyCycle(cycleDate);
    }
  }, [currentDate, runMonthlyCycle]);
  
  const advanceDate = useCallback((days: number) => {
    let newTransactions: Omit<Transaction, 'id'>[] = [];
    let latestInvestments = [...investments];

    for (let i = 0; i < days; i++) {
        const loopDate = new Date(currentDate);
        loopDate.setDate(loopDate.getDate() + i + 1);
        const loopDateStr = loopDate.toISOString().split('T')[0];

        latestInvestments = latestInvestments.map(inv => {
            if (inv.status !== 'Active') return inv;

            let apy = 0;
            if (inv.projectId) {
                const project = projects.find(p => p.id === inv.projectId);
                apy = project?.expectedYield || 0;
            } else if (inv.poolId) {
                const pool = investmentPools.find(p => p.id === inv.poolId);
                apy = pool?.apy || 0;
            }
            
            if (apy <= 0) return inv;

            const dailyProfit = inv.amount * (apy / 100 / 365);
            
            if (dailyProfit > 0) {
                newTransactions.push({
                    userId: inv.userId,
                    type: 'Profit Share',
                    amount: dailyProfit,
                    date: loopDateStr,
                    txHash: `profit-${inv.id.slice(-4)}-${loopDateStr}`,
                    investmentId: inv.id,
                });
                return { ...inv, totalProfitEarned: inv.totalProfitEarned + dailyProfit };
            }
            return inv;
        });
    }

    setInvestments(latestInvestments);
    if(newTransactions.length > 0) {
        setTransactions(prev => [
            ...prev,
            ...newTransactions.map(tx => ({ ...tx, id: `txn-${Date.now()}${Math.random()}` }))
        ]);
    }

    setCurrentDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setDate(newDate.getDate() + days);
        return newDate;
    });
  }, [investments, currentDate, projects, investmentPools]);

  const addProject = useCallback((project: Partial<Omit<Project, 'id'>>) => {
    const newProject: Project = {
      ...MOCK_PROJECTS[0],
      id: `proj-${Date.now()}`,
      ...project,
      assetIdentifier: `PID-${Date.now()}`,
      smartContractAddress: `0x...${Date.now().toString().slice(-4)}`,
      valuationDate: currentDate.toISOString().split('T')[0],
    };
    setProjects(prev => [...prev, newProject]);
  }, [currentDate]);

  const updateProject = useCallback((updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setInvestments(prev => prev.map(inv => inv.projectId === updatedProject.id ? { ...inv, projectName: updatedProject.tokenName } : inv));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    if (investments.some(inv => inv.projectId === projectId)) {
      alert("Cannot delete this project because it has active investments associated with it.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this project?")) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  }, [investments]);

  const addInvestmentPool = useCallback((pool: Omit<InvestmentPool, 'id'>) => {
    const newPool: InvestmentPool = { ...pool, id: `pool-${Date.now()}` };
    setInvestmentPools(prev => [...prev, newPool]);
  }, []);

  const updateInvestmentPool = useCallback((updatedPool: InvestmentPool) => {
    setInvestmentPools(prev => prev.map(p => p.id === updatedPool.id ? updatedPool : p));
  }, []);

  const deleteInvestmentPool = useCallback((poolId: string) => {
    if (window.confirm("Are you sure you want to delete this legacy fund? This action cannot be undone.")) {
      setInvestmentPools(prev => prev.filter(p => p.id !== poolId));
    }
  }, []);


  const adjustUserRank = useCallback((userId: string, newRank: number, reason: string) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (userToUpdate) {
        const updatedUser = { ...userToUpdate, rank: newRank };
        setUsers(prevUsers => prevUsers.map(u => u.id === userId ? updatedUser : u));
        addNotification({
            userId,
            type: 'Rank Promotion',
            message: `An admin adjusted your rank to L${newRank}. Reason: ${reason}`,
            date: currentDate.toISOString().split('T')[0],
            read: false,
        });
    }
  }, [users, addNotification, currentDate]);

  const getUserBalances = useCallback((userId: string) => {
      const userTransactions = transactions.filter(t => t.userId === userId);
      const userInvestments = investments.filter(i => i.userId === userId);

      const totalDeposits = userTransactions
        .filter(t => 
            (t.type === 'Deposit' && (t.status === 'completed' || t.status === undefined)) || 
            t.type === 'Manual Bonus'
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const totalProfits = userTransactions.filter(t => t.type === 'Profit Share' || t.type === 'Bonus').reduce((sum, t) => sum + t.amount, 0);
      const totalWithdrawals = userTransactions.filter(t => t.type === 'Withdrawal' || t.type === 'Manual Deduction').reduce((sum, t) => sum + t.amount, 0);

      const investmentsFromDeposit = userInvestments.filter(i => i.source === 'deposit').reduce((sum, i) => sum + i.amount, 0);
      const reinvestmentsFromProfit = userInvestments.filter(i => i.source === 'profit_reinvestment').reduce((sum, i) => sum + i.amount, 0);
      
      // Assume withdrawals come from profits first, then deposits.
      const profitBalanceAfterReinvestment = totalProfits - reinvestmentsFromProfit;
      const withdrawalsFromProfit = Math.min(Math.max(0, profitBalanceAfterReinvestment), totalWithdrawals);
      const profitBalance = profitBalanceAfterReinvestment - withdrawalsFromProfit;

      const depositBalanceAfterInvestment = totalDeposits - investmentsFromDeposit;
      const withdrawalsFromDeposit = totalWithdrawals - withdrawalsFromProfit;
      const depositBalance = depositBalanceAfterInvestment - withdrawalsFromDeposit;

      return { depositBalance: Math.max(0, depositBalance), profitBalance: Math.max(0, profitBalance) };
  }, [transactions, investments]);

  const connectSolanaWallet = useCallback(async () => {
    if (window.solana) {
      try {
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();
        setSolanaWalletAddress(publicKey);
      } catch (err) {
        console.error(err);
      }
    } else {
      alert(t('wallet.solana.notFound'));
    }
  }, [t]);

  const disconnectSolanaWallet = useCallback(() => {
    if (window.solana) {
      window.solana.disconnect();
    }
    setSolanaWalletAddress(null);
    setIgiTokenBalance(null);
    setSolBalance(null);
  }, []);

  const fetchAllBalances = useCallback(async () => {
    if (!solanaWalletAddress || !window.solanaWeb3 || !window.splToken) return;

    const connection = new window.solanaWeb3.Connection(window.solanaWeb3.clusterApiUrl('mainnet-beta'));
    const publicKey = new window.solanaWeb3.PublicKey(solanaWalletAddress);
    
    // Fetch SOL balance
    try {
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance / window.solanaWeb3.LAMPORTS_PER_SOL);
    } catch (e) {
        console.error("Could not fetch SOL balance", e);
        setSolBalance(null);
    }

    // Fetch IGI token balance
    try {
      const mintPublicKey = new window.solanaWeb3.PublicKey(IGI_TOKEN_MINT_ADDRESS);
      
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: mintPublicKey,
      });

      if (tokenAccounts.value.length > 0) {
        const balance = tokenAccounts.value[0].account.data.parsed.info.uiAmount;
        setIgiTokenBalance(balance);
      } else {
        setIgiTokenBalance(0);
      }
    } catch (e) {
      console.error("Could not fetch token balance", e);
      setIgiTokenBalance(null);
    }
  }, [solanaWalletAddress]);

  useEffect(() => {
    if (solanaWalletAddress) {
      fetchAllBalances();
    }
  }, [solanaWalletAddress, fetchAllBalances]);

  // Admin functions
  const approveDeposit = useCallback((transactionId: string) => {
    setTransactions(prev => prev.map(tx => {
        if (tx.id === transactionId) {
            addNotification({
                userId: tx.userId,
                type: 'KYC Update', // Re-using type for simplicity
                message: `Your deposit of $${tx.amount.toLocaleString()} has been approved.`,
                date: currentDate.toISOString().split('T')[0],
                read: false,
            });
            return { ...tx, status: 'completed' };
        }
        return tx;
    }));
  }, [addNotification, currentDate]);

  const rejectDeposit = useCallback((transactionId: string, reason: string) => {
    setTransactions(prev => prev.map(tx => {
        if (tx.id === transactionId) {
             addNotification({
                userId: tx.userId,
                type: 'KYC Update', // Re-using type for simplicity
                message: `Your deposit of $${tx.amount.toLocaleString()} has been rejected. Reason: ${reason}`,
                date: currentDate.toISOString().split('T')[0],
                read: false,
            });
            return { ...tx, status: 'rejected', rejectionReason: reason };
        }
        return tx;
    }));
  }, [addNotification, currentDate]);

  const createUser = useCallback((user: Omit<User, 'id' | 'totalInvestment' | 'totalDownline' | 'monthlyIncome' | 'achievements'>, initialInvestments: InitialInvestmentData[] = []) => {
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      totalInvestment: 0,
      totalDownline: 0,
      monthlyIncome: 0,
      achievements: [],
    };
    setUsers(prev => [...prev, newUser]);

    initialInvestments.forEach(inv => {
      executeInvestment(newUser.id, inv.amount, inv.assetId, inv.type, 'deposit');
    });

  }, [executeInvestment]);

  const updateUserRole = useCallback((userId: string, role: 'user' | 'admin') => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  }, []);

  const addInvestmentForUser = useCallback((userId: string, amount: number, assetId: string, type: 'project' | 'pool', source: 'deposit' | 'profit_reinvestment' = 'deposit') => {
    executeInvestment(userId, amount, assetId, type, source);
  }, [executeInvestment]);

  const confirmCryptoInvestment = useCallback((userId: string, amount: number, assetId: string, type: 'project' | 'pool') => {
    addTransaction({
        userId: userId,
        type: 'Deposit',
        amount: amount,
        txHash: `ADMIN-CONFIRMED-${Date.now()}`,
        date: currentDate.toISOString().split('T')[0],
    });
    executeInvestment(userId, amount, assetId, type, 'deposit');
  }, [addTransaction, executeInvestment, currentDate]);

  const updateInvestment = useCallback((investment: Investment) => {
    setInvestments(prev => prev.map(inv => inv.id === investment.id ? investment : inv));
  }, []);

  const updateNewsPost = useCallback((post: NewsPost) => {
    setNews(prev => prev.map(p => p.id === post.id ? post : p));
  }, []);

  const updateBonusRates = useCallback((newInstantRates: { investor: number, referrer: number, upline: number }, newTeamRates: number[]) => {
    setInstantBonusRates(newInstantRates);
    setTeamBuilderBonusRates(newTeamRates);
    alert('Bonus rates updated!');
  }, []);
  
  const updateTreasuryWallets = useCallback((wallets: TreasuryWallets) => {
    setTreasuryWallets(wallets);
  }, []);

  return (
    <AppContext.Provider value={{
      users, investments, transactions, bonuses, ranks, news, notifications, projects, investmentPools,
      instantBonusRates, teamBuilderBonusRates, treasuryWallets,
      currentUser, currentDate,
      addInvestmentFromBalance, addCryptoDeposit, addWithdrawal, updateKycStatus, toggleFreezeUser,
      markNotificationsAsRead, updateUser, deleteUser, deleteInvestment, updateRankSettings,
      addManualTransaction, addNewsPost, deleteNewsPost, runMonthlyCycle, advanceDate,
      addProject, updateProject, deleteProject, addInvestmentPool, updateInvestmentPool, deleteInvestmentPool,
      adjustUserRank, getUserBalances,
      solanaWalletAddress, igiTokenBalance, solBalance, connectSolanaWallet, disconnectSolanaWallet, fetchAllBalances,
      approveDeposit, rejectDeposit,
      createUser, updateUserRole, addInvestmentForUser, confirmCryptoInvestment, updateInvestment,
      updateNewsPost, updateBonusRates, updateTreasuryWallets,
      logout,
    }}>
      {children}
    </AppContext.Provider>
  );
};