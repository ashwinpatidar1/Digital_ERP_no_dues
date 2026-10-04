import { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function DirectorDashboard() {
  const { user, logout } = useAuth();

  const handleApprove = async (applicationId) => {
    try {
      setError("");

      const response = await api.put(
        `/director/applications/${applicationId}/approve`,
      );

      alert(response.data.message || "Application approved successfully.");

      await fetchApplications();
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Failed to approve application");
    }
  };

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/director/applications");

      setApplications(response.data.applications || []);
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Failed to load applications");
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
        <p className="text-gray-600">Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Digital No-Dues</h1>

            <p className="text-sm text-gray-500">Director Dashboard</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-800">{user?.name}</p>

              <p className="text-sm text-gray-500">Director Office</p>
            </div>

            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700">
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
          <h2 className="text-2xl font-bold text-gray-900">Final Approval</h2>

          <p className="text-gray-500 mt-1">
            Review applications that have completed all department clearances.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-800">
              No applications pending
            </h3>

            <p className="mt-2 text-gray-500">
              There are currently no applications waiting for Director approval.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div
                key={application.application_id}
                className="bg-white rounded-xl shadow-sm p-6">
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

                    <p className="text-sm text-gray-500">
                      Branch: {application.branch}
                    </p>

                    <p className="text-sm text-gray-500">
                      Semester: {application.semester}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t">
                    <button
                      onClick={() => handleApprove(application.application_id)}
                      className="px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                      Final Approve
                    </button>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                    {application.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default DirectorDashboard;
