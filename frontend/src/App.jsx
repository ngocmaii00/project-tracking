import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import KanbanPage from './pages/KanbanPage';
import GanttPage from './pages/GanttPage';
import AIExtractPage from './pages/AIExtractPage';
import MeetingsPage from './pages/MeetingsPage';
import RisksPage from './pages/RisksPage';
import SimulationPage from './pages/SimulationPage';
import ResourcesPage from './pages/ResourcesPage';
import AIAssistantPage from './pages/AIAssistantPage';
import AuditTrailPage from './pages/AuditTrailPage';
import './index.css';

function ProtectedRoute({ children }) {
  const user = useStore(s => s.user);
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#141e35',
            color: '#e8eeff',
            border: '1px solid rgba(99,141,255,0.2)',
            borderRadius: '10px',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="projects/:id/kanban" element={<KanbanPage />} />
          <Route path="projects/:id/gantt" element={<GanttPage />} />
          <Route path="projects/:id/risks" element={<RisksPage />} />
          <Route path="projects/:id/simulation" element={<SimulationPage />} />
          <Route path="projects/:id/resources" element={<ResourcesPage />} />
          <Route path="projects/:id/audit" element={<AuditTrailPage />} />
          <Route path="ai/extract" element={<AIExtractPage />} />
          <Route path="ai/assistant" element={<AIAssistantPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
