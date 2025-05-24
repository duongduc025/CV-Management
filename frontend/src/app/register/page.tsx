"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register, getDepartments, getRoles, type Department, type Role } from '@/services/auth';
import { useAuth } from '@/components/AuthProvider';
import LoadingSpinner from '@/components/LoadingSpinner';

// Role descriptions for better UX
const ROLE_DESCRIPTIONS: Record<string, string> = {
  'Employee': 'Regular employee with basic access',
  'PM': 'Manages projects and team resources',
  'BUL/Lead': 'Leads business units and teams',
  'Admin': 'Full system access and management',
};

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    employeeCode: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
    selectedRoles: [] as string[], // No default roles, Employee will be added automatically by backend
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingDepartments(true);
        setLoadingRoles(true);
        const [deps, rolesData] = await Promise.all([
          getDepartments(),
          getRoles()
        ]);

        console.log('Departments loaded:', deps);
        console.log('Roles loaded:', rolesData);
        setDepartments(deps);
        setRoles(rolesData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load registration data. Please try again later.');
        setErrorDetails(err);
      } finally {
        setLoadingDepartments(false);
        setLoadingRoles(false);
      }
    };

    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    setFormData(prev => ({
      ...prev,
      selectedRoles: checked
        ? [...prev.selectedRoles, value]
        : prev.selectedRoles.filter(role => role !== value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorDetails(null);
    setLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    // Debug log department ID
    const selectedDept = departments.find(d => d.id === formData.departmentId);
    console.log('Selected department:', selectedDept);
    console.log('Department ID to be sent:', formData.departmentId);

    try {
      const { confirmPassword, selectedRoles, ...registerData } = formData;

      // Note: Employee role will be automatically added by the backend
      // No validation needed here for roles since Employee is auto-added

      // Include the selected roles in registration data
      const registrationPayload = {
        ...registerData,
        roleNames: selectedRoles
      };

      console.log('Registering user with roles:', selectedRoles);

      const result = await register(registrationPayload);
      console.log('Registration successful:', result);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setErrorDetails(err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50">
        <LoadingSpinner size="lg" message="Checking authentication..." />
      </div>
    );
  }

  // If user is logged in, they will be redirected by useEffect
  if (user) {
    return null;
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <p className="font-bold">Registration Successful!</p>
            <p>Your account has been created with the following roles:</p>
            <p className="font-semibold">{formData.selectedRoles.join(', ')}</p>
            <p className="text-sm mt-2">
              You can now log in and access features available to your roles.
            </p>
            <p className="mt-2">You will be redirected to the login page shortly.</p>
          </div>
          <Link
            href="/login"
            className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create a new account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <p className="font-bold mb-2">Error</p>
            <span className="block sm:inline">{error}</span>
            {errorDetails && (
              <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            )}
          </div>
        )}

        {loadingDepartments || loadingRoles ? (
          <div className="text-center py-4">
            <LoadingSpinner size="md" message="Loading registration data..." />
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="employeeCode" className="block text-sm font-medium text-gray-700">
                  Employee Code
                </label>
                <input
                  id="employeeCode"
                  name="employeeCode"
                  type="text"
                  required
                  value={formData.employeeCode}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g. EMP001"
                />
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Email address"
                />
              </div>

              <div>
                <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  id="departmentId"
                  name="departmentId"
                  required
                  value={formData.departmentId}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Select department</option>
                  {departments && departments.length > 0 ? (
                    departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No departments available</option>
                  )}
                </select>
                <div className="mt-1 text-xs text-gray-500">
                  {departments.length} departments available
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Additional Roles (Employee role will be added automatically)
                </label>
                <div className="space-y-2">
                  {roles.filter(role => role.name !== 'Employee').map((role) => (
                    <label key={role.id} className="flex items-center">
                      <input
                        type="checkbox"
                        value={role.name}
                        checked={formData.selectedRoles.includes(role.name)}
                        onChange={handleRoleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">
                        {role.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        - {ROLE_DESCRIPTIONS[role.name] || 'Role description not available'}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <strong>Note:</strong> Your account will be created with the Employee role plus any additional roles you select above.
                </div>
                {formData.selectedRoles.length > 0 && (
                  <div className="mt-2 text-xs text-blue-600">
                    Selected: {formData.selectedRoles.join(', ')}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-75"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}