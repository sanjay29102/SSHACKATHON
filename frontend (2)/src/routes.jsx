import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import JsonDashboard from './pages/JsonDashboard';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/dashboard" element={<JsonDashboard />} />
    </Routes>
  );
};

export default AppRoutes;
