import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import LessonView from './pages/LessonView';
import Workshops from './pages/Workshops';
import WorkshopDetail from './pages/WorkshopDetail';
import LiveSession from './pages/LiveSession';
import AI from './pages/AI';
import AISettings from './pages/AISettings';
import Community from './pages/Community';
import CommunityPosts from './pages/CommunityPosts';
import Profile from './pages/Profile';
import Certificates from './pages/Certificates';
import CertificateVerify from './pages/CertificateVerify';
import Downloads from './pages/Downloads';
import Speaking from './pages/Speaking';
import Notifications from './pages/Notifications';
import Search from './pages/Search';
import OrganizerDashboard from './pages/organizer/Dashboard';
import OrganizerCourses from './pages/organizer/Courses';
import OrganizerWorkshops from './pages/organizer/Workshops';
import OrganizerQuestions from './pages/organizer/Questions';
import OrganizerAnnouncements from './pages/organizer/Announcements';
import OrganizerCourseBuilder from './pages/organizer/CourseBuilder';
import OrganizerAttendance from './pages/organizer/Attendance';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AnnouncementsPage from './pages/Announcements';

function Protected({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-stone-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/verify/:certNumber" element={<CertificateVerify />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/welcome" element={<Protected><Onboarding /></Protected>} />

      <Route path="/" element={<Layout>{user ? (user.role === 'admin' ? <AdminDashboard /> : user.role === 'organizer' ? <OrganizerDashboard /> : <Home />) : <Landing />}</Layout>} />
      <Route path="/courses" element={<Layout><Protected><Courses /></Protected></Layout>} />
      <Route path="/courses/:id" element={<Layout><Protected><CourseDetail /></Protected></Layout>} />
      <Route path="/learn/:courseId/lessons/:lessonId" element={<Layout><Protected><LessonView /></Protected></Layout>} />
      <Route path="/workshops" element={<Layout><Protected><Workshops /></Protected></Layout>} />
      <Route path="/workshops/:id" element={<Layout><Protected><WorkshopDetail /></Protected></Layout>} />
      <Route path="/workshops/:id/live/:sessionId" element={<Layout><Protected><LiveSession /></Protected></Layout>} />
      <Route path="/ai" element={<Layout><Protected><AI /></Protected></Layout>} />
      <Route path="/ai/settings" element={<Layout><Protected><AISettings /></Protected></Layout>} />
      <Route path="/community" element={<Layout><Protected><Community /></Protected></Layout>} />
      <Route path="/community/:id" element={<Layout><Protected><CommunityPosts /></Protected></Layout>} />
      <Route path="/profile" element={<Layout><Protected><Profile /></Protected></Layout>} />
      <Route path="/certificates" element={<Layout><Protected><Certificates /></Protected></Layout>} />
      <Route path="/certificates/:number" element={<Layout><Protected><Certificates /></Protected></Layout>} />
      <Route path="/downloads" element={<Layout><Protected><Downloads /></Protected></Layout>} />
      <Route path="/speaking" element={<Layout><Protected><Speaking /></Protected></Layout>} />
      <Route path="/notifications" element={<Layout><Protected><Notifications /></Protected></Layout>} />
      <Route path="/announcements" element={<Layout><Protected><AnnouncementsPage /></Protected></Layout>} />
      <Route path="/search" element={<Layout><Protected><Search /></Protected></Layout>} />

      {/* Organizer */}
      <Route path="/organizer" element={<Layout><Protected roles={['organizer','admin']}><OrganizerDashboard /></Protected></Layout>} />
      <Route path="/organizer/courses" element={<Layout><Protected roles={['organizer','admin']}><OrganizerCourses /></Protected></Layout>} />
      <Route path="/organizer/courses/new" element={<Layout><Protected roles={['organizer','admin']}><OrganizerCourseBuilder /></Protected></Layout>} />
      <Route path="/organizer/workshops" element={<Layout><Protected roles={['organizer','admin']}><OrganizerWorkshops /></Protected></Layout>} />
      <Route path="/organizer/questions" element={<Layout><Protected roles={['organizer','admin']}><OrganizerQuestions /></Protected></Layout>} />
      <Route path="/organizer/announcements" element={<Layout><Protected roles={['organizer','admin']}><OrganizerAnnouncements /></Protected></Layout>} />
      <Route path="/organizer/workshops/:id/attendance" element={<Layout><Protected roles={['organizer','admin']}><OrganizerAttendance /></Protected></Layout>} />

      {/* Admin */}
      <Route path="/admin/users" element={<Layout><Protected roles={['admin']}><AdminUsers /></Protected></Layout>} />
      <Route path="/admin/courses" element={<Layout><Protected roles={['admin']}><Courses /></Protected></Layout>} />
      <Route path="/admin/workshops" element={<Layout><Protected roles={['admin']}><Workshops /></Protected></Layout>} />
      <Route path="/admin/certificates" element={<Layout><Protected roles={['admin']}><Certificates /></Protected></Layout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
