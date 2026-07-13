import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import InfoIcon from "@mui/icons-material/Info";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import GridOnIcon from "@mui/icons-material/GridOn";

import { auth } from "../../../Firebase/authFunctions";
import "./Menu.css";

function Menu({
  header,
  title,
  version,
}) {
  const navigate = useNavigate();

  const [showMenu, setMenu] = useState(false);
  const [uid, setUid] = useState(() => localStorage.getItem("UID"));
  const [currentRol] = useState(() => localStorage.getItem("ROL"));

  const menuTitle = header || title || "";
  const isAdmin = String(currentRol) === "0";

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/", { replace: true });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  const toggleDrawer = (open) => (event) => {
    if (
      event?.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }

    setMenu(open);
  };

  const handleOnNavigate = () => {
    const storedUid = localStorage.getItem("UID");

    setUid(storedUid);

    if (storedUid) {
      navigate(`/user/${storedUid}`, {
        state: { uid: storedUid },
      });
    }
  };

  const list = () => (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        <ListItem key="Mi perfil" disablePadding>
          <ListItemButton onClick={handleOnNavigate}>
            <ListItemIcon>
              <AccountBoxIcon />
            </ListItemIcon>
            <ListItemText primary="Mi perfil" />
          </ListItemButton>
        </ListItem>

        {isAdmin && (
          <ListItem key="Personas" disablePadding>
            <ListItemButton component={Link} to="/users">
              <ListItemIcon>
                <GroupIcon />
              </ListItemIcon>
              <ListItemText primary="Personas" />
            </ListItemButton>
          </ListItem>
        )}

        {isAdmin && (
          <ListItem key="Finanzas" disablePadding>
            <ListItemButton component={Link} to="/finance">
              <ListItemIcon>
                <AttachMoneyIcon />
              </ListItemIcon>
              <ListItemText primary="Finanzas" />
            </ListItemButton>
          </ListItem>
        )}

        {isAdmin && (
          <ListItem key="Planificación" disablePadding>
            <ListItemButton component={Link} to="/training">
              <ListItemIcon>
                <FitnessCenterIcon />
              </ListItemIcon>
              <ListItemText primary="Planificación" />
            </ListItemButton>
          </ListItem>
        )}

        {isAdmin && (
          <ListItem key="Circuitos del gimnasio" disablePadding>
            <ListItemButton component={Link} to="/gym-layout">
              <ListItemIcon>
                <GridOnIcon />
              </ListItemIcon>
              <ListItemText primary="Circuitos del gimnasio" />
            </ListItemButton>
          </ListItem>
        )}

        <ListItem key="Sobre nosotros" disablePadding>
          <ListItemButton component={Link} to="/aboutus">
            <ListItemIcon>
              <InfoIcon sx={{ color: "#ff5722" }} />
            </ListItemIcon>
            <ListItemText primary="Sobre nosotros" />
          </ListItemButton>
        </ListItem>

        <Divider />

        <ListItem key="logout" disablePadding>
          <Logout />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <div>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              sx={{ width: 50 }}
              onClick={toggleDrawer(true)}
              edge="start"
              aria-label="menu"
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="h6"
              sx={{ marginRight: "auto" }}
              className="header-text"
            >
              {menuTitle}

              {version && (
                <div className="version-text">
                  {version}
                </div>
              )}
            </Typography>
          </Toolbar>
        </AppBar>
      </Box>

      <Drawer
        anchor="left"
        open={showMenu}
        onClose={toggleDrawer(false)}
      >
        {list()}
      </Drawer>
    </div>
  );
}

export default Menu;
