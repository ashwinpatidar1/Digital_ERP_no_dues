import { Routes, Route, Navigate } from "react-router-dom";
import StudentDashboard from "../pages/student/StudentDashboard.jsx";
import Login from "../pages/auth/Login.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import FacultyDashboard from "../pages/faculty/FacultyDashboard.jsx";
import DirectorDashboard from "../pages/director/DirectorDashboard.jsx";


function AppRoutes() {
    return (
        <Routes>

            {/* Default */}
            <Route
                path="/"
                element={<Navigate to="/login" replace />}
            />

            {/* Login */}
            <Route
                path="/login"
                element={<Login />}
            />

            {/* Student */}
            <Route
    path="/student/dashboard"
    element={
        <ProtectedRoute allowedRole="STUDENT">
            <StudentDashboard />
        </ProtectedRoute>
    }
/>

            {/* Faculty */}
            <Route
    path="/faculty/dashboard"
    element={
        <ProtectedRoute allowedRole="FACULTY">
            <FacultyDashboard />
        </ProtectedRoute>
    }
/>

            {/* Director */}
            <Route
    path="/director/dashboard"
    element={
        <ProtectedRoute allowedRole="DIRECTOR">
            <DirectorDashboard />
        </ProtectedRoute>
    }
/>

            {/* Unknown URL */}
            <Route
                path="*"
                element={<Navigate to="/login" replace />}
            />

        </Routes>
    );
}

export default AppRoutes;