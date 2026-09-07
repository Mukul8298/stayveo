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
import TiffinListing from './pages/TiffinListing';
import TiffinDetail from './pages/TiffinDetail';
import TiffinReservation from './pages/TiffinReservation';
import StudentDashboard from './pages/StudentDashboard';
import ProfilePage from './pages/ProfilePage';
import StudentHelp from './pages/StudentHelp';
import NotificationsScreen from './pages/NotificationsScreen';
import SavedListings from './pages/SavedListings';

// Provider pages
import ProviderLogin from './pages/provider/ProviderLogin';
import ProviderTypeSelect from './pages/provider/ProviderTypeSelect';
import ProviderOnboarding from './pages/provider/ProviderOnboarding';
import ProviderVerification from './pages/provider/ProviderVerification';
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderBookings from './pages/provider/ProviderBookings';
import ProviderServices from './pages/provider/ProviderServices';
import ProviderCalendar from './pages/provider/ProviderCalendar';
import ProviderEarnings from './pages/provider/ProviderEarnings';
import ProviderSettings from './pages/provider/ProviderSettings';
import ProviderNotifications from './pages/provider/ProviderNotifications';
import ProviderBusinessDetails from './pages/provider/ProviderBusinessDetails';
import ProviderHelp from './pages/provider/ProviderHelp';
import ProviderLegal from './pages/provider/ProviderLegal';
import ProviderCreateListing from './pages/provider/ProviderCreateListing';
import ProviderEditListing from './pages/provider/ProviderEditListing';
import ProviderServiceCreate from './pages/provider/ProviderServiceCreate';
import ProviderServiceEdit from './pages/provider/ProviderServiceEdit';
import ProviderManageBeds from './pages/provider/ProviderManageBeds';

// Isolated Tiffin provider workspace
import TiffinOnboarding from './pages/tiffin-provider/TiffinOnboarding';
import TiffinDashboard from './pages/tiffin-provider/TiffinDashboard';
import TiffinCustomers from './pages/tiffin-provider/TiffinCustomers';
import TiffinCustomerDetail from './pages/tiffin-provider/TiffinCustomerDetail';
import TiffinDeliveries from './pages/tiffin-provider/TiffinDeliveries';
import TiffinMenu from './pages/tiffin-provider/TiffinMenu';
import TiffinReports from './pages/tiffin-provider/TiffinReports';
import TiffinProviderLayout from './components/tiffin-provider/TiffinProviderLayout';

// Provider shared layout
import ProviderLayout from './components/provider/ProviderLayout';
import ProviderBankDetails from './pages/provider/ProviderBankDetails';

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
        <Route path="/tiffin" element={<TiffinListing />} />
        <Route path="/tiffin/:id/reservation/payment/:paymentId" element={<TiffinReservation />} />
        <Route path="/tiffin/:id/reservation/success" element={<TiffinReservation />} />
        <Route path="/tiffin/:id/reservation" element={<TiffinReservation />} />
        <Route path="/tiffin/:id" element={<TiffinDetail />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/support" element={<StudentHelp />} />
        <Route path="/notifications" element={<NotificationsScreen />} />
        <Route path="/saved" element={<SavedListings />} />

        {/* Provider — Auth / Onboarding (no dashboard shell) */}
        <Route path="/provider/login" element={<ProviderLogin />} />
        <Route path="/provider/select" element={<ProviderTypeSelect />} />
        <Route path="/provider/onboarding" element={<ProviderOnboarding />} />
        <Route path="/provider/verify" element={<ProviderVerification />} />

        {/* Provider — isolated Tiffin onboarding and dashboard */}
        <Route path="/provider/tiffin/onboarding" element={<TiffinOnboarding />} />
        <Route element={<TiffinProviderLayout />}>
          <Route path="/provider/tiffin/dashboard" element={<TiffinDashboard />} />
          <Route path="/provider/tiffin/customers" element={<TiffinCustomers />} />
          <Route path="/provider/tiffin/customers/:id" element={<TiffinCustomerDetail />} />
          <Route path="/provider/tiffin/deliveries" element={<TiffinDeliveries />} />
          <Route path="/provider/tiffin/menu" element={<TiffinMenu />} />
          <Route path="/provider/tiffin/reports" element={<TiffinReports />} />
          <Route path="/provider/tiffin/settings" element={<ProviderSettings />} />
          <Route path="/provider/tiffin/settings/business-details" element={<ProviderBusinessDetails />} />
          <Route path="/provider/tiffin/settings/bank-details" element={<ProviderBankDetails />} />
          <Route path="/provider/tiffin/settings/help" element={<ProviderHelp />} />
          <Route path="/provider/tiffin/settings/legal" element={<ProviderLegal />} />
        </Route>

        {/* Provider — PG Dashboard pages (shared layout shell) */}
        <Route element={<ProviderLayout />}>
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/provider/bookings" element={<ProviderBookings />} />
          <Route path="/provider/add-property" element={<ProviderCreateListing />} />
          <Route path="/provider/services" element={<ProviderServices />} />
          <Route path="/provider/manage-beds" element={<ProviderManageBeds />} />
          <Route path="/provider/settings" element={<ProviderSettings />} />
          <Route path="/provider/settings/business-details" element={<ProviderBusinessDetails />} />
          <Route path="/provider/settings/bank-details" element={<ProviderBankDetails />} />
          <Route path="/provider/settings/help" element={<ProviderHelp />} />
          <Route path="/provider/settings/legal" element={<ProviderLegal />} />
          <Route path="/provider/calendar" element={<ProviderCalendar />} />
          <Route path="/provider/earnings" element={<ProviderEarnings />} />
          <Route path="/provider/reports" element={<ProviderEarnings />} />
          <Route path="/provider/notifications" element={<ProviderNotifications />} />
          <Route path="/provider/listing/create" element={<ProviderCreateListing />} />
          <Route path="/provider/listing/:id/edit" element={<ProviderEditListing />} />
          <Route path="/provider/services/:type/create" element={<ProviderServiceCreate />} />
          <Route path="/provider/services/:type/:id/edit" element={<ProviderServiceEdit />} />
        </Route>
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
