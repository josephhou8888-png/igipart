import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { useLocalization } from '../hooks/useLocalization';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { users } = useAppContext();
  const { t } = useLocalization();
  const [selectedUserId, setSelectedUserId] = useState<string>(users.find(u => u.role === 'admin')?.id || users[0]?.id || '');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const userToLogin = users.find(u => u.id === selectedUserId);
    if (userToLogin) {
      onLogin(userToLogin);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="w-full max-w-sm p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-white">
              IGI <span className="text-brand-primary">{t('sidebar.title')}</span>
            </h1>
            <p className="mt-2 text-gray-400">{t('login.subtitle')}</p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="user-select" className="block text-sm font-medium text-gray-300">
              {t('login.chooseProfile')}
            </label>
            <div className="mt-1">
              <select
                id="user-select"
                name="user"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.role === 'admin' ? `(${t('login.admin')})` : `(${t('login.rank')} L${user.rank})`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-primary border border-transparent rounded-md shadow-sm hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
            >
              {t('login.signIn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;