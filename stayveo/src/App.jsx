import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';

// Student pages
import SplashScreen from './pages/SplashScreen';
import RoleSelection from './pages/RoleSelection';
import AuthScreen from './pages/AuthScreen';
import CollegeSelection from './pages/CollegeSelection';
import StudentOnboarding from './pages/StudentOnboarding';
import HomeScreen from './pages/HomeScreen';
import SearchResults from './pages/SearchResults';
import RoomDetail from './pages/RoomDetail';
import BookingFlow from './pages/BookingFlow';
import RoommateHome from './pages/RoommateHome';
import RoommateSetup from './pages/RoommateSetup';
import RoommateSwipe from './pages/RoommateSwipe';
import MatchedChat from './pages/MatchedChat';
import ServicesHome from './pages/ServicesHome';
import ServiceDetail from './pages/ServiceDetail';
import StudentDashboard from './pages/StudentDashboard';
import ProfilePage from './pages/ProfilePage';
import BrokerDashboard from './pages/BrokerDashboard';
import AddListing from './pages/AddListing';
import BookingsManagement from './pages/BookingsManagement';
import NotificationsScreen from './pages/NotificationsScreen';
import SavedListings from './pages/SavedListings';

// Provider pages
import ProviderTypeSelect from './pages/provider/ProviderTypeSelect';
import ProviderOnboarding from './pages/provider/ProviderOnboarding';
import ProviderVerification from './pages/provider/ProviderVerification';
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderBookings from './pages/provider/ProviderBookings';
import ProviderServices from './pages/provider/ProviderServices';
import ProviderCalendar from './pages/provider/ProviderCalendar';
import ProviderEarnings from './pages/provider/ProviderEarnings';
import ProviderProfile from './pages/provider/ProviderProfile';
import ProviderNotifications from './pages/provider/ProviderNotifications';

const noStudentNav = ['/', '/role-select', '/auth', '/college-select', '/onboarding'];
const chatRoutes = ['/roommate/chat'];

function AppContent() {
  const location = useLocation();
  const path = location.pathname;

  // Hide student bottom nav on these routes
  const isProviderRoute = path.startsWith('/provider');
  const showStudentNav = !noStudentNav.includes(path) &&
                         !chatRoutes.includes(path) &&
                         !path.startsWith('/booking/') &&
                         !path.startsWith('/broker/') &&
                         !isProviderRoute;

  return (
    <div className="app-layout">
      <Routes>
        {/* Onboarding */}
        <Route path="/" element={<SplashScreen />} />
        <Route path="/role-select" element={<RoleSelection />} />
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/college-select" element={<CollegeSelection />} />
        <Route path="/onboarding" element={<StudentOnboarding />} />

        {/* Student Main */}
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/room/:id" element={<RoomDetail />} />
        <Route path="/booking/:id" element={<BookingFlow />} />
        <Route path="/roommate" element={<RoommateHome />} />
        <Route path="/roommate/setup" element={<RoommateSetup />} />
        <Route path="/roommate/swipe" element={<RoommateSwipe />} />
        <Route path="/roommate/chat" element={<MatchedChat />} />
        <Route path="/services" element={<ServicesHome />} />
        <Route path="/service/:id" element={<ServiceDetail />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsScreen />} />
        <Route path="/saved" element={<SavedListings />} />

        {/* Legacy Broker (kept for compatibility) */}
        <Route path="/broker" element={<BrokerDashboard />} />
        <Route path="/broker/add-listing" element={<AddListing />} />
        <Route path="/broker/bookings" element={<BookingsManagement />} />

        {/* Provider System */}
        <Route path="/provider/select" element={<ProviderTypeSelect />} />
        <Route path="/provider/onboarding" element={<ProviderOnboarding />} />
        <Route path="/provider/verify" element={<ProviderVerification />} />
        <Route path="/provider/dashboard" element={<ProviderDashboard />} />
        <Route path="/provider/bookings" element={<ProviderBookings />} />
        <Route path="/provider/services" element={<ProviderServices />} />
        <Route path="/provider/calendar" element={<ProviderCalendar />} />
        <Route path="/provider/earnings" element={<ProviderEarnings />} />
        <Route path="/provider/profile" element={<ProviderProfile />} />
        <Route path="/provider/notifications" element={<ProviderNotifications />} />
      </Routes>
      {showStudentNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
