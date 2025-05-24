"use client";

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          VDT CV System
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Professional CV Management Platform
        </p>
        <Link
          href="/login"
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-colors inline-block"
        >
          Login
        </Link>
      </div>
    </div>
  );
}