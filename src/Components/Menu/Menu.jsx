import React, { useState, useEffect, version } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Logout from "../Logout/Logout";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import GroupIcon from "@mui/icons-material/Group";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import SettingsIcon from '@mui/icons-material/Settings';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import InfoIcon from '@mui/icons-material/Info';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import GridOnIcon from '@mui/icons-material/GridOn';
import ToggleButton from '@mui/material/ToggleButton';
import { auth } from "../../../Firebase/authFunctions";
import "./Menu.css";




function Menu({ header, version,toggleThemeMode, themeMode }) {
  const [uid, setUid] = useState(localStorage.getItem("UID"))
  const [currentRol, setRol] = useState(localStorage.getItem("ROL"));
  const [showMenu, setMenu] = useState(false);
  const dark = localStorage.getItem("THEME");
  const [darkTheme, setDarkTheme] = useState(dark == 'dark');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthState = () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/'); // Redirect to the login page if user is not authenticated
      }
    };

    checkAuthState(); // Check authentication state on component mount

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/'); // Redirect to the login page if user is not authenticated
      }
    });

    return () => {
      unsubscribe(); // Cleanup the auth state change listener on component unmount
    };
  }, []);


  useEffect(() => {
    const theme = darkTheme ? 'dark' : 'light';
    localStorage.setItem("THEME", theme);
  }, [darkTheme]);


  const toggleDrawer = (open) => (event) => {
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
      return;
    }
    setMenu(open);
  };

  const handleOnNavigate = () => {
    setUid(localStorage.getItem("UID"));
    navigate(`/user/${uid}`, { state: { uid } });
  }

  const handleOnswitchTheme = () => {
    toggleThemeMode()
    setDarkTheme(!darkTheme);
  }


  const list = () => (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        <ListItem key={"Mi perfil"} disablePadding>
          <ListItemButton onClick={() => handleOnNavigate()}>
            <ListItemIcon>
              <AccountBoxIcon />
            </ListItemIcon>
            <ListItemText primary={"Mi perfil"} />
          </ListItemButton>
        </ListItem>

        {currentRol == 0 && <ListItem key={"Personas"} disablePadding>
          <ListItemButton component={Link} to="/users">
            <ListItemIcon>
              <GroupIcon />
            </ListItemIcon>
            <ListItemText primary={"Personas"} />
          </ListItemButton>
        </ListItem>
        }

        {currentRol == 0 && <ListItem key={"Finanzas"} disablePadding>
          <ListItemButton component={Link} to="/finance">
            <ListItemIcon>
              <AttachMoneyIcon />
            </ListItemIcon>
            <ListItemText primary={"Finanzas"} />
          </ListItemButton>
        </ListItem>
        }

        {currentRol == 0 && <ListItem key={"Planificación"} disablePadding>
          <ListItemButton component={Link} to="/training">
            <ListItemIcon>
              <FitnessCenterIcon />
            </ListItemIcon>
            <ListItemText primary={"Planificación"} />
          </ListItemButton>
        </ListItem>
        }

        {currentRol == 0 && <ListItem key={"Plano del gimnasio"} disablePadding>
          <ListItemButton component={Link} to="/gym-layout">
            <ListItemIcon>
              <GridOnIcon />
            </ListItemIcon>
            <ListItemText primary={"Plano del gimnasio"} />
          </ListItemButton>
        </ListItem>
        }

        <ListItem key={"Sobre nosotros"} disablePadding>
          <ListItemButton component={Link} to="/aboutus">
            <ListItemIcon>
              <InfoIcon sx={{ color: "#ff5722" }} />
            </ListItemIcon>
            <ListItemText primary={"Sobre nosotros"} />
          </ListItemButton>
        </ListItem>

        <Divider />
        <ListItem key={"logout"} disablePadding>
          <Logout />
        </ListItem>
      </List>
    </Box >
  );


  return (
    <div>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" >
          <Toolbar >
            <IconButton
              sx={{ width: 50 }}
              onClick={toggleDrawer(true)}
              edge="start"
              aria-label="menu"
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ marginRight: "auto" }} className="header-text">
              {header}
              <div className="version-text">{version}</div>
            </Typography>
            <div style={{ marginLeft: "auto" }}>
              <ToggleButton
                value=""
                selected={darkTheme}
                onChange={() => { handleOnswitchTheme(!darkTheme) }}
              >
                {darkTheme ? <LightModeIcon /> : <DarkModeIcon />}
              </ToggleButton>
            </div>
          </Toolbar>
        </AppBar>
      </Box>
      <Drawer
        anchor={"left"}
        open={showMenu}
        onClose={toggleDrawer(false)}
      >
        {list()}
      </Drawer>
    </div>
  );
}

export default Menu;
