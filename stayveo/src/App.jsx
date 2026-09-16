import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';

// Eagerly loaded critical landing / onboarding pages for instant load
import SplashScreen from './pages/SplashScreen';
import RoleSelection from './pages/RoleSelection';
import AuthScreen from './pages/AuthScreen';
import CollegeSelection from './pages/CollegeSelection';
import StudentOnboarding from './pages/StudentOnboarding';
import HomeScreen from './pages/HomeScreen';

// Lazy loaded student pages
const SearchResults = lazy(() => import('./pages/SearchResults'));
const RoomDetail = lazy(() => import('./pages/RoomDetail'));
const BookingFlow = lazy(() => import('./pages/BookingFlow'));
const ServicesHome = lazy(() => import('./pages/ServicesHome'));
const TiffinListing = lazy(() => import('./pages/TiffinListing'));
const TiffinDetail = lazy(() => import('./pages/TiffinDetail'));
const TiffinReservation = lazy(() => import('./pages/TiffinReservation'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const StudentHelp = lazy(() => import('./pages/StudentHelp'));
const NotificationsScreen = lazy(() => import('./pages/NotificationsScreen'));
const SavedListings = lazy(() => import('./pages/SavedListings'));

// Lazy loaded provider pages
const ProviderLogin = lazy(() => import('./pages/provider/ProviderLogin'));
const ProviderTypeSelect = lazy(() => import('./pages/provider/ProviderTypeSelect'));
const ProviderOnboarding = lazy(() => import('./pages/provider/ProviderOnboarding'));
const ProviderVerification = lazy(() => import('./pages/provider/ProviderVerification'));
const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard'));
const ProviderBookings = lazy(() => import('./pages/provider/ProviderBookings'));
const ProviderServices = lazy(() => import('./pages/provider/ProviderServices'));
const ProviderCalendar = lazy(() => import('./pages/provider/ProviderCalendar'));
const ProviderEarnings = lazy(() => import('./pages/provider/ProviderEarnings'));
const ProviderSettings = lazy(() => import('./pages/provider/ProviderSettings'));
const ProviderNotifications = lazy(() => import('./pages/provider/ProviderNotifications'));
const ProviderBusinessDetails = lazy(() => import('./pages/provider/ProviderBusinessDetails'));
const ProviderHelp = lazy(() => import('./pages/provider/ProviderHelp'));
const ProviderLegal = lazy(() => import('./pages/provider/ProviderLegal'));
const ProviderCreateListing = lazy(() => import('./pages/provider/ProviderCreateListing'));
const ProviderEditListing = lazy(() => import('./pages/provider/ProviderEditListing'));
const ProviderServiceCreate = lazy(() => import('./pages/provider/ProviderServiceCreate'));
const ProviderServiceEdit = lazy(() => import('./pages/provider/ProviderServiceEdit'));
const ProviderManageBeds = lazy(() => import('./pages/provider/ProviderManageBeds'));

// Lazy loaded Tiffin provider pages
const TiffinOnboarding = lazy(() => import('./pages/tiffin-provider/TiffinOnboarding'));
const TiffinDashboard = lazy(() => import('./pages/tiffin-provider/TiffinDashboard'));
const TiffinCustomers = lazy(() => import('./pages/tiffin-provider/TiffinCustomers'));
const TiffinCustomerDetail = lazy(() => import('./pages/tiffin-provider/TiffinCustomerDetail'));
const TiffinDeliveries = lazy(() => import('./pages/tiffin-provider/TiffinDeliveries'));
const TiffinMenu = lazy(() => import('./pages/tiffin-provider/TiffinMenu'));
const TiffinReports = lazy(() => import('./pages/tiffin-provider/TiffinReports'));
const TiffinProviderLayout = lazy(() => import('./components/tiffin-provider/TiffinProviderLayout'));

// Provider shared layout & bank details
import ProviderLayout from './components/provider/ProviderLayout';
const ProviderBankDetails = lazy(() => import('./pages/provider/ProviderBankDetails'));

const noStudentNav = ['/', '/role-select', '/auth', '/college-select', '/onboarding'];

function PageFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'stayveo-spin 0.8s linear infinite' }}></div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const path = location.pathname;

  // Hide student bottom nav on these routes
  const isProviderRoute = path.startsWith('/provider');
  const showStudentNav = !noStudentNav.includes(path) &&
    !path.startsWith('/booking/') &&
    !path.startsWith('/broker/') &&
    !isProviderRoute;

  return (
    <div className="app-layout">
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
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
