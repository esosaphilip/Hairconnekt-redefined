import { createBrowserRouter } from "react-router";
import Splash from "./pages/shared/Splash";
import AccountTypeSelection from "./pages/shared/AccountTypeSelection";
import ClientRegistration from "./pages/shared/ClientRegistration";
import Login from "./pages/shared/Login";
import PasswordReset from "./pages/shared/PasswordReset";
import ClientHome from "./pages/client/ClientHome";
import SearchResults from "./pages/client/SearchResults";
import ProviderProfile from "./pages/client/ProviderProfile";
import ServiceSelection from "./pages/client/ServiceSelection";
import DateTimeSelection from "./pages/client/DateTimeSelection";
import BookingDetails from "./pages/client/BookingDetails";
import BookingConfirmation from "./pages/client/BookingConfirmation";
import AppointmentsList from "./pages/client/AppointmentsList";
import ClientProfile from "./pages/client/ClientProfile";
import Favourites from "./pages/client/Favourites";
import PersonalInfo from "./pages/client/PersonalInfo";
import Addresses from "./pages/client/Addresses";
import Reviews from "./pages/client/Reviews";
import BookingHistory from "./pages/client/BookingHistory";
import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderTypeSelection from "./pages/provider/ProviderTypeSelection";
import ProviderRegistrationStep1 from "./pages/provider/ProviderRegistrationStep1";
import ServicesManagement from "./pages/provider/ServicesManagement";
import ProviderCalendar from "./pages/provider/ProviderCalendar";
import ProviderSettings from "./pages/provider/ProviderSettings";
import ProviderReviews from "./pages/provider/ProviderReviews";
import ChatList from "./pages/shared/ChatList";
import ChatScreen from "./pages/shared/ChatScreen";
import Notifications from "./pages/shared/Notifications";
import Settings from "./pages/shared/Settings";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      // Shared Screens
      { index: true, element: <Splash /> },
      { path: "account-type", element: <AccountTypeSelection /> },
      { path: "register", element: <ClientRegistration /> },
      { path: "login", element: <Login /> },
      { path: "password-reset", element: <PasswordReset /> },
      { path: "notifications", element: <Notifications /> },
      { path: "settings", element: <Settings /> },
      { path: "chat", element: <ChatList /> },
      { path: "chat/:id", element: <ChatScreen /> },

      // Client Mode Screens
      { path: "client/home", element: <ClientHome /> },
      { path: "client/search", element: <SearchResults /> },
      { path: "client/provider/:id", element: <ProviderProfile /> },
      { path: "client/provider/:id/services", element: <ServiceSelection /> },
      { path: "client/booking/datetime", element: <DateTimeSelection /> },
      { path: "client/booking/details", element: <BookingDetails /> },
      { path: "client/booking/confirmation", element: <BookingConfirmation /> },
      { path: "client/appointments", element: <AppointmentsList /> },
      { path: "client/profile", element: <ClientProfile /> },
      { path: "client/favourites", element: <Favourites /> },
      { path: "client/personal-info", element: <PersonalInfo /> },
      { path: "client/addresses", element: <Addresses /> },
      { path: "client/reviews", element: <Reviews /> },
      { path: "client/booking-history", element: <BookingHistory /> },

      // Provider Mode Screens
      { path: "provider/type-selection", element: <ProviderTypeSelection /> },
      { path: "provider/register/step1", element: <ProviderRegistrationStep1 /> },
      { path: "provider/dashboard", element: <ProviderDashboard /> },
      { path: "provider/calendar", element: <ProviderCalendar /> },
      { path: "provider/services", element: <ServicesManagement /> },
      { path: "provider/settings", element: <ProviderSettings /> },
      { path: "provider/reviews", element: <ProviderReviews /> },

      // 404
      { path: "*", element: <NotFound /> },
    ],
  },
]);