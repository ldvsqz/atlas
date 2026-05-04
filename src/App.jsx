import React, { useState, useEffect, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { colors } from '@mui/material';
import Menu from "./Components/Menu/Menu";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
import Events from "./Pages/Events";
import Users from "./Pages/User/Users";
import User from "./Pages/User/User";
import Settings from "./Pages/Settings/Settings";
import Exercises from "./Pages/Exercises/Exercises";
import Aboutus from "./Pages/Aboutus/Aboutus";
import ResetPassword from './Pages/ResetPassword/ResetPassword';
import Finance from "./Pages/Finance/Finance";
import TrainingPage from "./features/training/pages/TrainingPage";
import packageInfo from '../package.json';


function App() {
  const [themeMode, setThemeMode] = useState(localStorage.getItem("THEME") || 'dark');

  useEffect(() => {
    localStorage.setItem("THEME", themeMode);
  }, [themeMode]);


  const toggleThemeMode = () => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: themeMode == 'dark' ? colors.deepOrange : colors.blueGrey
        },
      }),
    [themeMode]
  );

  const version = packageInfo.version;
  const getMenu = (header = "Atlas") => (<Menu header={header} version={version} toggleThemeMode={toggleThemeMode} themeMode={themeMode} />);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <RouteTracker>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/reset" element={<ResetPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/events" element={<Events menu={getMenu("Eventos")} />} />
          <Route path="/users" element={<Users menu={getMenu("Personas")} />} />
          <Route path="/finance" element={<Finance menu={getMenu("Finanzas")} />} />
          <Route path="/training" element={<TrainingPage menu={getMenu("Planificación")} />} />
          <Route path="/settings" element={<Settings menu={getMenu("Configuración")} />} />
          <Route path="/exercises" element={<Exercises menu={getMenu("Ejercicios")} />} />
          <Route path="/aboutus" element={<Aboutus menu={getMenu("Sobre nosotros")} />} />
          <Route path="/user/:uid" element={<User menu={getMenu("Atlas")} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </RouteTracker>
      </Router>
    </ThemeProvider>
  );
}

// Componente para guardar la ruta actual en localStorage
function RouteTracker({ children }) {
  const location = useLocation();

  useEffect(() => {
    // No guardar rutas de login, reset o register
    if (!["/", "/login", "/reset", "/register"].includes(location.pathname)) {
      localStorage.setItem("LAST_ROUTE", location.pathname + location.search);
    }
  }, [location]);

  return children;
}

export default App;
