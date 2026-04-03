import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import LessonDetail from './pages/LessonDetail';
import LessonEditor from './pages/LessonEditor';
import TeacherResponses from './pages/TeacherResponses';
import Chat from './pages/Chat';
import Messages from './pages/Messages';
import Admin from './pages/Admin';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import AttendanceReport from './pages/AttendanceReport';
import Search from './pages/Search';
import ForgotPassword from './pages/ForgotPassword';
import TeacherSetup from './pages/TeacherSetup';
import TeacherDashboard from './pages/TeacherDashboard';

// Components
import { Onboarding } from './components/Onboarding';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false, requireTeacher = false }) => {
    const { isAuthenticated, loading, isAdmin, isTeacher, needsGroupSetup } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (needsGroupSetup) {
        return <Navigate to="/teacher-setup" replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    if (requireTeacher && !isTeacher && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// Route specifically for teacher setup — only accessible when needs_group_setup is true
const TeacherSetupRoute = ({ children }) => {
    const { isAuthenticated, loading, needsGroupSetup } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!needsGroupSetup) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading, needsGroupSetup } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (isAuthenticated) {
        if (needsGroupSetup) {
            return <Navigate to="/teacher-setup" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

// Onboarding Overlay - Shows tutorial for new users
const OnboardingOverlay = () => {
    const { needsOnboarding, needsGroupSetup, completeOnboarding } = useAuth();
    
    if (!needsOnboarding || needsGroupSetup) return null;
    
    return <Onboarding onComplete={completeOnboarding} />;
};

function AppRoutes() {
    return (
        <>
            <OnboardingOverlay />
            <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                }
            />
            <Route
                path="/forgot-password"
                element={
                    <PublicRoute>
                        <ForgotPassword />
                    </PublicRoute>
                }
            />

            {/* Teacher Setup Route — only for teachers needing group creation */}
            <Route
                path="/teacher-setup"
                element={
                    <TeacherSetupRoute>
                        <TeacherSetup />
                    </TeacherSetupRoute>
                }
            />

            {/* Protected Routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/courses"
                element={
                    <ProtectedRoute>
                        <Courses />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/progress"
                element={
                    <ProtectedRoute>
                        <Progress />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/courses/:courseId"
                element={
                    <ProtectedRoute>
                        <CourseDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/lessons/:lessonId"
                element={
                    <ProtectedRoute>
                        <LessonDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/lessons/:lessonId/edit"
                element={
                    <ProtectedRoute requireTeacher>
                        <LessonEditor />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/lessons/:lessonId/responses"
                element={
                    <ProtectedRoute requireTeacher>
                        <TeacherResponses />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/chat"
                element={
                    <ProtectedRoute>
                        <Chat />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/messages"
                element={
                    <ProtectedRoute>
                        <Messages />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute requireAdmin>
                        <Admin />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/teacher-dashboard"
                element={
                    <ProtectedRoute requireTeacher>
                        <TeacherDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/attendance"
                element={
                    <ProtectedRoute requireTeacher>
                        <AttendanceReport />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/search"
                element={
                    <ProtectedRoute>
                        <Search />
                    </ProtectedRoute>
                }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
                <Toaster position="top-center" richColors />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
