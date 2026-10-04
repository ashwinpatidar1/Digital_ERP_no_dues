import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function Login() {
    const [role, setRole] = useState("STUDENT");
    const [institutionId, setInstitutionId] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            let response;

            if (role === "STUDENT") {

    response = await api.post("/auth/student/login", {
        enrollment_no: institutionId,
        password
    });

} else if (role === "FACULTY") {

    response = await api.post("/auth/faculty/login", {
        faculty_id: institutionId,
        password
    });

} else {

    response = await api.post("/auth/director/login", {
        institution_id: institutionId,
        password
    });
}

            const { token } = response.data;

            let userData;

if (role === "STUDENT") {

    userData = {
        role: "STUDENT",
        ...response.data.student
    };

} else if (role === "FACULTY") {

    userData = {
        role: "FACULTY",
        ...response.data.faculty
    };

} else {

    userData = {
        role: "DIRECTOR",
        ...response.data.director
    };
}

            login(userData, token);

            if (userData.role === "STUDENT") {

    navigate("/student/dashboard");

} else if (userData.role === "FACULTY") {

    navigate("/faculty/dashboard");

} else {

    navigate("/director/dashboard");

}

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Login failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">

            <div className="w-full max-w-md">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white text-2xl font-bold">
                        ND
                    </div>

                    <h1 className="text-3xl font-bold text-slate-800">
                        Digital No-Dues
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Clearance Management System
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">

                    <div className="grid grid-cols-3 gap-2 mb-6">

    <button
        type="button"
        onClick={() => {
            setRole("STUDENT");
            setInstitutionId("");
            setError("");
        }}
        className={`rounded-lg py-3 font-medium transition ${
            role === "STUDENT"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
    >
        Student
    </button>

    <button
        type="button"
        onClick={() => {
            setRole("FACULTY");
            setInstitutionId("");
            setError("");
        }}
        className={`rounded-lg py-3 font-medium transition ${
            role === "FACULTY"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
    >
        Faculty
    </button>

    <button
        type="button"
        onClick={() => {
            setRole("DIRECTOR");
            setInstitutionId("");
            setError("");
        }}
        className={`rounded-lg py-3 font-medium transition ${
            role === "DIRECTOR"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
    >
        Director
    </button>

</div>

                    <form onSubmit={handleLogin}>

                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {role === "STUDENT"
                                ? "Enrollment Number"
                                : "Faculty ID"}
                        </label>

                        <input
                            type="text"
                            value={institutionId}
                            onChange={(e) =>
                                setInstitutionId(e.target.value)
                            }
                            placeholder={
                                role === "STUDENT"
                                    ? "Enter enrollment number"
                                    : "Enter faculty ID"
                            }
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                        />

                        <label className="block text-sm font-medium text-slate-700 mt-5 mb-2">
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Enter your password"
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                        />

                        {error && (
                            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>

                    </form>

                </div>

                <p className="text-center text-sm text-slate-400 mt-6">
                    Digital No-Dues Clearance Management System
                </p>

            </div>
        </div>
    );
}

export default Login;