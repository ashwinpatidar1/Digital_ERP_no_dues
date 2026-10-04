import { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function StudentDashboard() {
  const { user, logout } = useAuth();

  const [certificate, setCertificate] = useState(null);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    try {
      setApplying(true);
      setError("");

      const response = await api.post("/student/applications");

      alert(response.data.message);

      await fetchApplication();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || "Failed to create No-Dues application",
      );
    } finally {
      setApplying(false);
    }
  };

  const handleResubmit = async () => {
    try {
      setResubmitting(true);
      setError("");

      const response = await api.put(
        `/student/applications/${application.application.id}/resubmit`,
      );

      alert(response.data.message);

      await fetchApplication();
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Failed to resubmit application");
    } finally {
      setResubmitting(false);
    }
  };

  const fetchCertificate = async () => {
    try {
      setCertificateLoading(true);

      const response = await api.get("/student/certificate");

      setCertificate(response.data.certificate || null);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("Certificate fetch error:", err);
      }

      setCertificate(null);
    } finally {
      setCertificateLoading(false);
    }
  };

  const fetchApplication = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/student/application");

      setApplication(response.data);
    } catch (err) {
      console.error(err);

      if (err.response?.status === 404) {
        setApplication(null);
      } else {
        setError(err.response?.data?.message || "Failed to load application");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
    fetchCertificate();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading dashboard...</p>
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

            <p className="text-sm text-gray-500">Student Dashboard</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-800">{user?.name}</p>

              <p className="text-sm text-gray-500">{user?.enrollment_no}</p>
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

        {!application ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              No-Dues Application
            </h2>

            <p className="mt-2 text-gray-500">
              You currently do not have an active No-Dues application.
            </p>

            <button
              onClick={handleApply}
              disabled={applying}
              className="mt-6 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {applying ? "Submitting..." : "Apply for No-Dues"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {application.application?.status === "REJECTED" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h2 className="text-lg font-bold text-red-800">
                  Application Rejected
                </h2>

                <p className="mt-2 text-red-700">
                  {application.application?.rejection_reason ||
                    "Your application was rejected. Please review the remarks and resubmit."}
                </p>

                <button
                  onClick={handleResubmit}
                  disabled={resubmitting}
                  className="mt-4 px-5 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {resubmitting ? "Resubmitting..." : "Resubmit Application"}
                </button>
              </div>
            )}

            {certificate && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      No-Dues Certificate
                    </h2>

                    <p className="text-gray-500 mt-1">
                      Your No-Dues clearance has been completed.
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                    VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">Certificate Number</p>

                    <p className="font-semibold mt-1">
                      {certificate.certificate_number}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">Verification Code</p>

                    <p className="font-semibold mt-1">
                      {certificate.verification_code}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">Issued Date</p>

                    <p className="font-semibold mt-1">
                      {new Date(certificate.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">No-Dues Application</h2>

                  <p className="text-gray-500 mt-1">
                    Application #{application.application?.id}
                  </p>
                </div>

                <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-medium">
                  {application.application?.status}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="mb-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Clearance Progress</span>

                  <span className="font-medium">
                    {
                      application.clearances?.filter(
                        (item) => item.status === "APPROVED",
                      ).length
                    }{" "}
                    / {application.clearances?.length}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        application.clearances?.length
                          ? (application.clearances.filter(
                              (item) => item.status === "APPROVED",
                            ).length /
                              application.clearances.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {application.clearances?.map((clearance) => (
                  <div
                    key={clearance.clearance_id}
                    className="flex justify-between items-center border rounded-lg p-4">
                    <div>
                      <p className="font-medium">{clearance.department_name}</p>

                      {clearance.remarks && (
                        <p className="text-sm text-gray-500 mt-1">
                          {clearance.remarks}
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        clearance.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : clearance.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}>
                      {clearance.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default StudentDashboard;
