import { useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { setUser } from "../../store/userSlice";
import {
  LogIn,
  User,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  ChevronRight,
} from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // NEW: State for course selection modal
  const [showCourseSelection, setShowCourseSelection] = useState(false);
  const [courseOptions, setCourseOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:7000/api/auth/login", {
        email,
        password,
      });

      // NEW: Handle multi-course response
      if (res.data.requiresSelection) {
        setSelectedUser(res.data.user);
        setCourseOptions(res.data.courses);
        setShowCourseSelection(true);
      } else {
        // Original login flow
        localStorage.setItem("token", res.data.token);
        dispatch(setUser(res.data.user));
        toast.success("Login successful!");

        if (res.data.user.role === "admin") {
          navigate("/admindashboard");
        } else {
          navigate("/facultydashboard");
        }
      }
    } catch (err) {
      const errorMessage =
        err.response?.data || "Login failed. Please check your credentials.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handler for finalizing login after course selection
  const handleCourseSelect = async (courseId) => {
    if (!selectedUser || !courseId) {
      toast.error("An error occurred. Please try logging in again.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:7000/api/auth/select-course",
        {
          userId: selectedUser.id,
          courseId: courseId,
        }
      );

      localStorage.setItem("token", res.data.token);
      dispatch(setUser(res.data.user));
      toast.success("Login successful!");
      navigate("/facultydashboard");
    } catch (err) {
      const errorMessage =
        err.response?.data || "Failed to select course. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      setShowCourseSelection(false); // Close modal on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Welcome Back
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-200"
            >
              {loading && (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v16a8 8 0 01-8-8z"
                  />
                </svg>
              )}
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
        </div>
      </div>

      {/* NEW: Course Selection Modal */}
      {showCourseSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all animate-fade-in-up">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
              Select a Course
            </h2>
            <p className="text-center text-gray-600 mb-8">
              You are assigned to multiple courses. Please choose which one you
              want to access.
            </p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {courseOptions.map((course) => (
                <button
                  key={course.course_id}
                  onClick={() => handleCourseSelect(course.course_id)}
                  disabled={loading}
                  className="w-full flex items-center justify-between text-left p-4 rounded-xl bg-gray-50 hover:bg-purple-100 border-2 border-transparent hover:border-purple-300 transition-all duration-200 group disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-white transition-colors">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">
                        {course.course_code}
                      </p>
                      <p className="text-sm text-gray-600">
                        {course.subject} - {course.department}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-gray-400 group-hover:text-purple-600 transition-transform duration-200 group-hover:translate-x-1"
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowCourseSelection(false);
                setSelectedUser(null);
                setCourseOptions([]);
              }}
              className="w-full mt-8 py-3 text-center text-gray-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        pauseOnFocusLoss
        theme="light"
      />
    </>
  );
};

export default LoginPage;