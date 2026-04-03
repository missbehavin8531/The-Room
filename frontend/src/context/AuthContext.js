import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await authAPI.getMe();
                setUser(response.data);
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { token, user: userData } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        return userData;
    };

    const register = async (name, email, password, inviteCode) => {
        const payload = { name, email, password, invite_code: inviteCode };
        const response = await authAPI.register(payload);
        return response.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    // Mark user's onboarding as complete (updates local state)
    const completeOnboarding = () => {
        if (user) {
            setUser({ ...user, onboarding_complete: true });
        }
    };

    const isApproved = user?.is_approved === true;
    const isAdmin = user?.role === 'admin';
    const isTeacher = user?.role === 'teacher';
    const isTeacherOrAdmin = isAdmin || isTeacher;
    const needsOnboarding = isAuthenticated && isApproved && user?.onboarding_complete === false;

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated,
                isApproved,
                isAdmin,
                isTeacher,
                isTeacherOrAdmin,
                needsOnboarding,
                login,
                register,
                logout,
                checkAuth,
                completeOnboarding,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
