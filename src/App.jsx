import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, colors } from '@mui/material';
import { AuthProfileProvider, useAuthProfile } from "./hooks/useAuthProfile";
import Menu from "./Components/Menu/Menu";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
import ResetPassword from './Pages/ResetPassword/ResetPassword';
import packageInfo from '../package.json';

const Events = lazy(() => import("./Pages/Events"));
const Users = lazy(() => import("./Pages/User/Users"));
const User = lazy(() => import("./Pages/User/User"));
const Settings = lazy(() => import("./Pages/Settings/Settings"));
const Exercises = lazy(() => import("./Pages/Exercises/Exercises"));
const Aboutus = lazy(() => import("./Pages/Aboutus/Aboutus"));
const Finance = lazy(() => import("./Pages/Finance/Finance"));
const TrainingPage = lazy(() => import("./features/training/pages/TrainingPage"));
const PublicCycleView = lazy(() => import("./features/training/public/PublicCycleView"));
const GymLayoutPage = lazy(() => import("./features/gymLayout/pages/GymLayoutPage"));
const CashboxPage = lazy(() => import("./Pages/Finance/CashboxHistory"));
const GymRequest = lazy(() => import("./Pages/GymRequest/GymRequest"));
const SuperAdmin = lazy(() => import("./Pages/SuperAdmin/SuperAdmin"));
const MembershipRequests = lazy(() => import("./Pages/MembershipRequests/MembershipRequests"));

import NotificationService from "./services/notificationService";

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: colors.deepOrange,
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function NotificationManager() {
  const { user } = useAuthProfile();

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = NotificationService.onForegroundMessage((payload) => {
        const title = payload.notification?.title || payload.data?.title || 'Atlas Gym Partner 🥊';
        const body = payload.notification?.body || payload.data?.body || 'Tienes una nueva notificación de membresía.';
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/atlas.ico' });
        }
      });
      const notificationTimer = window.setTimeout(() => {
        if (NotificationService.getPermissionStatus() === 'granted') {
          NotificationService.requestAndRegisterToken(user.uid);
        }
      }, 5000);

      return () => {
        window.clearTimeout(notificationTimer);
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [user?.uid]);

  return null;
}

function App() {
  useEffect(() => {
    localStorage.setItem("THEME", "dark");
  }, []);

  const version = packageInfo.version;
  const getMenu = (header = "Atlas") => (<Menu header={header} version={version} />);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProfileProvider>
        <Router>
          <NotificationManager />
          <RouteTracker>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/reset" element={<ResetPassword />} />
              <Route path="/register" element={<Register />} />
              <Route path="/gym-request" element={<PrivateRoute><GymRequest menu={getMenu("Solicitar gimnasio")} /></PrivateRoute>} />
              <Route path="/super-admin" element={<SuperAdminRoute><SuperAdmin menu={getMenu("Administración")} /></SuperAdminRoute>} />
              <Route path="/membership-requests" element={<AdminRoute><MembershipRequests menu={getMenu("Solicitudes de membresía")} /></AdminRoute>} />
              <Route path="/public/cycle/:id" element={<PublicCycleView />} />
              <Route path="/cycle/:id" element={<PublicCycleView />} />
              <Route path="/events" element={<AdminRoute><Events menu={getMenu("Eventos")} /></AdminRoute>} />
              <Route path="/users" element={<AdminRoute><Users menu={getMenu("Miembros")} /></AdminRoute>} />
              <Route path="/finance" element={<AdminRoute><Finance menu={getMenu("Finanzas")} /></AdminRoute>} />
              <Route
                path="/cashbox"
                element={<AdminRoute><CashboxPage menu={getMenu("Arqueo de caja")} /></AdminRoute>}
              />
              <Route path="/training" element={<AdminRoute><TrainingPage menu={getMenu("Planificación")} /></AdminRoute>} />
              <Route path="/gym-layout" element={<AdminRoute><GymLayoutPage menu={getMenu("Circuitos")} /></AdminRoute>} />
              <Route path="/settings" element={<AdminRoute><Settings menu={getMenu("Configuración")} /></AdminRoute>} />
              <Route path="/exercises" element={<AdminRoute><Exercises menu={getMenu("Ejercicios")} /></AdminRoute>} />
              <Route path="/aboutus" element={<PrivateRoute><Aboutus menu={getMenu("Sobre nosotros")} /></PrivateRoute>} />
              <Route path="/user/:uid" element={<UserRoute><User menu={getMenu("Atlas")} /></UserRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </RouteTracker>
        </Router>
      </AuthProfileProvider>
    </ThemeProvider>
  );
}


function PrivateRoute({ children }) {
  const { user, loading } = useAuthProfile();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, profile, loading } = useAuthProfile();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (profile?.rol !== 0 && profile?.rol !== 2) {
    return <Navigate to={`/user/${user.uid}`} replace state={{ uid: user.uid }} />;
  }

  return children;
}

function SuperAdminRoute({ children }) {
  const { user, profile, loading } = useAuthProfile();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  if (profile?.rol !== 2) return <Navigate to={`/user/${user.uid}`} replace />;
  return children;
}

function UserRoute({ children }) {
  const { uid } = useParams();
  const { user, profile, loading } = useAuthProfile();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (profile?.rol === 0 || profile?.rol === 2 || uid === user.uid) {
    return children;
  }

  return <Navigate to={`/user/${user.uid}`} replace state={{ uid: user.uid }} />;
}

function PageLoader() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  );
}

// Componente para guardar la ruta actual en localStorage
function RouteTracker({ children }) {
  const location = useLocation();

  useEffect(() => {
    // No guardar rutas de login, reset o register
    if (
      !["/", "/login", "/reset", "/register"].includes(location.pathname)
      && !location.pathname.startsWith('/public/')
      && !location.pathname.startsWith('/cycle/')
    ) {
      localStorage.setItem("LAST_ROUTE", location.pathname + location.search);
    }
  }, [location]);

  return children;
}

export default App;
