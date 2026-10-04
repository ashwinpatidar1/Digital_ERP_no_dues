import React from 'react'
import { useState } from 'react'

function Login() {
  const [usertype, setUsertype] = useState("");

  const [username , setUserName] = useState("")
  const [password , setPassword] = useState("")
  console.log(username);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/path-to-logo.png"
            alt="Shri Vaishnav Vidyapeeth Vishwavidyalaya Logo"
            className="w-20 h-20 mb-2"
          />
          <h2 className="text-2xl font-bold text-gray-700">AccSoft 2.0</h2>
        </div>

        {/* Role Selection */}
        <div className="mb-4">
          <label className="flex items-center space-x-2 text-gray-600">
            <input
              type="radio"
              name="role"
              value="student"
              className="form-radio text-indigo-600"
              onChange={() => setUsertype("student")}
            />
            <span> Student</span>
             <input
              type="radio"
              name="role"
              value="faculty"
              className="form-radio text-indigo-600"
              onChange={() => setUsertype("flculty")}
            />
            <span>faculty</span>
             <input
              type="radio"
              name="role"
              value="admin"
              className="form-radio text-indigo-600"
              onChange={() => setUsertype("admin")}
            />
            <span> admin</span>
          </label>
        </div>

        {/* Login Form */}
        <form className="space-y-4">
          <div>
            <label
              htmlFor="loginName"
              className="block text-sm font-medium text-gray-600"
            >
              Login name
            </label>
            <input
              type="text"
              id="loginName"
              name="loginName"
              className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              onChange={() => setUserName(name)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-600"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-between text-sm text-indigo-600">
            <a href="/forgot-password" className="hover:underline">
              Forgot Password?
            </a>
            <a href="/signup" className="hover:underline">
              SignUp (New User)
            </a>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition"
          >
            Login »
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
