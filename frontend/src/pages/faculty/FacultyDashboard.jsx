import { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function FacultyDashboard() {
    const { user, logout } = useAuth();


    const handleApprove = async (applicationId) => {
    try {
        setError("");

        await api.put(`/faculty/applications/${applicationId}/approve`);

        alert("Clearance approved successfully.");

        await fetchApplications();

    } catch (err) {
        console.error(err);

        setError(
            err.response?.data?.message ||
            "Failed to approve clearance"
        );
    }
};


const handleReject = async (applicationId) => {
    if (!remarks.trim()) {
        setError("Please enter remarks before rejecting.");
        return;
    }

    try {
        setProcessing(true);
        setError("");

        await api.put(
            `/faculty/applications/${applicationId}/reject`,
            {
                remarks: remarks.trim()
            }
        );

        alert("Clearance rejected successfully.");

        setRejectingId(null);
        setRemarks("");

        await fetchApplications();

    } catch (err) {
        console.error(err);

        setError(
            err.response?.data?.message ||
            "Failed to reject clearance"
        );
    } finally {
        setProcessing(false);
    }
};

    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [rejectingId, setRejectingId] = useState(null);
const [remarks, setRemarks] = useState("");
const [processing, setProcessing] = useState(false);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/faculty/applications");

            
setApplications(response.data.applications || []);

        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Failed to load applications"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">
                    Loading applications...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">

            {/* Header */}
            <header className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            Digital No-Dues
                        </h1>

                        <p className="text-sm text-gray-500">
                            Faculty Dashboard
                        </p>
                    </div>

                    <div className="flex items-center gap-4">

                        <div className="text-right">
                            <p className="font-medium text-gray-800">
                                {user?.name}
                            </p>

                            <p className="text-sm text-gray-500">
                                {user?.department_name}
                            </p>
                        </div>

                        <button
                            onClick={logout}
                            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700"
                        >
                            Logout
                        </button>

                    </div>

                </div>
            </header>

            {/* Main */}
            <main className="max-w-7xl mx-auto px-6 py-8">

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700">
                        {error}
                    </div>
                )}

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                        No-Dues Applications
                    </h2>

                    <p className="text-gray-500 mt-1">
                        Review applications submitted for your department.
                    </p>
                </div>

                {applications.length === 0 ? (

                    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                        <h3 className="text-lg font-semibold text-gray-800">
                            No applications found
                        </h3>

                        <p className="mt-2 text-gray-500">
                            There are currently no applications waiting for your department.
                        </p>
                    </div>

                ) : (

                    <div className="space-y-4">

                        {applications.map((application) => (

                            <div
                                key={application.application_id}
                                className="bg-white rounded-xl shadow-sm p-6"
                            >

                                <div className="flex justify-between items-start">

                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">
                                            Application #{application.application_id}
                                        </h3>

                                        <p className="text-gray-600 mt-1">
                                            {application.student_name}
                                        </p>

                                        <p className="text-sm text-gray-500">
                                            Enrollment: {application.enrollment_no}
                                        </p>

                                        <p className="text-sm text-gray-500">
                                            Course: {application.course}
                                        </p>
                                    </div>

                                    <span
    className={`px-3 py-1 rounded-full text-sm font-medium ${
        application.status === "APPROVED"
            ? "bg-green-100 text-green-700"
            : application.status === "REJECTED"
            ? "bg-red-100 text-red-700"
            : "bg-yellow-100 text-yellow-700"
    }`}
>
    {application.status}
</span>

                                </div>

                                <div className="mt-5 pt-4 border-t">

                                    <p className="text-sm text-gray-500">
                                        Application Status
                                    </p>

                                    <p className="font-medium text-gray-800 mt-1">
                                        {application.application_status}
                                    </p>

                                </div>

                                {application.status === "PENDING" && (
    <div className="mt-5">

        <div className="flex gap-3">

            <button
                onClick={() =>
                    handleApprove(application.application_id)
                }
                disabled={processing}
                className="px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
                Approve
            </button>

            <button
                onClick={() => {
                    setRejectingId(application.application_id);
                    setRemarks("");
                    setError("");
                }}
                disabled={processing}
                className="px-5 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
                Reject
            </button>

        </div>

        {rejectingId === application.application_id && (
            <div className="mt-4">

                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Remarks
                </label>

                <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                />

                <div className="mt-3 flex gap-3">

                    <button
                        onClick={() =>
                            handleReject(application.application_id)
                        }
                        disabled={processing}
                        className="px-5 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {processing
                            ? "Rejecting..."
                            : "Confirm Rejection"}
                    </button>

                    <button
                        onClick={() => {
                            setRejectingId(null);
                            setRemarks("");
                        }}
                        disabled={processing}
                        className="px-5 py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                        Cancel
                    </button>

                </div>

            </div>
        )}

    </div>
)}

                            </div>

                        ))}

                    </div>

                )}

            </main>

        </div>
    );
}

export default FacultyDashboard;