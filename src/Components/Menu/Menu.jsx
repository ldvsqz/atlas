import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logout from "../Logout/Logout";
import { useAuthProfile } from "../../hooks/useAuthProfile";

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
import SettingsIcon from '@mui/icons-material/Settings';
import { setCurrentGymId } from '../../../Firebase/tenant';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TenantService from '../../../Firebase/tenantService';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';


import "./Menu.css";

function Menu({
  header,
  title,
  version,
}) {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isSuperAdmin } = useAuthProfile();

  const [showMenu, setMenu] = useState(false);
  const activeGymId = user?.uid
    ? localStorage.getItem(`ACTIVE_GYM_ID:${user.uid}`) || profile?.gymId || ''
    : '';
  const [activeGymName, setActiveGymName] = useState('');

  useEffect(() => {
    if (!isAdmin || !activeGymId) {
      setActiveGymName('');
      return;
    }

    let mounted = true;
    TenantService.getAll(true).then((tenants) => {
      if (mounted) {
        setActiveGymName(tenants.find((tenant) => tenant.id === activeGymId)?.name || activeGymId);
      }
    }).catch(() => {
      if (mounted) setActiveGymName(activeGymId);
    });

    return () => {
      mounted = false;
    };
  }, [activeGymId, isAdmin]);

  const menuTitle = header || title || "";

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
    if (user?.uid) {
      navigate(`/user/${user.uid}`, {
        state: { uid: user.uid },
      });
    }
  };

  const list = () => (
    <Box
      sx={{ width: 250, height: '100%', display: 'flex', flexDirection: 'column' }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {isAdmin && (profile?.gymIds?.length > 1) && (
          <ListItem>
            <Select
              fullWidth
              size="small"
              value={activeGymId}
              onChange={(event) => {
                setCurrentGymId(event.target.value);
                window.location.reload();
              }}
            >
              {profile.gymIds.map((gymId) => <MenuItem key={gymId} value={gymId}>{gymId}</MenuItem>)}
            </Select>
          </ListItem>
        )}
        <ListItem key="Mi perfil" disablePadding>
          <ListItemButton onClick={handleOnNavigate}>
            <ListItemIcon>
              <AccountBoxIcon />
            </ListItemIcon>
            <ListItemText primary="Mi perfil" />
          </ListItemButton>
        </ListItem>

        {isAdmin && (
          <ListItem key="Miembros" disablePadding>
            <ListItemButton component={Link} to="/users">
              <ListItemIcon>
                <GroupIcon />
              </ListItemIcon>
              <ListItemText primary="Miembros" />
            </ListItemButton>
          </ListItem>
        )}

        {isAdmin && !isSuperAdmin && (
          <ListItem key="Solicitudes de membresía" disablePadding>
            <ListItemButton component={Link} to="/membership-requests">
              <ListItemIcon><GroupIcon /></ListItemIcon>
              <ListItemText primary="Solicitudes de membresía" />
            </ListItemButton>
          </ListItem>
        )}

        {!isSuperAdmin && !profile?.gymId && (
          <ListItem key="Solicitar gimnasio" disablePadding>
            <ListItemButton component={Link} to="/gym-request">
              <ListItemIcon><GroupIcon /></ListItemIcon>
              <ListItemText primary="Solicitar gimnasio" />
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
          <ListItem key="Circuitos" disablePadding>
            <ListItemButton component={Link} to="/gym-layout">
              <ListItemIcon>
                <GridOnIcon />
              </ListItemIcon>
              <ListItemText primary="Circuitos" />
            </ListItemButton>
          </ListItem>
        )}

        {isAdmin && (
          <ListItem key="Configuración" disablePadding>
            <ListItemButton component={Link} to="/settings">
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Configuración" />
            </ListItemButton>
          </ListItem>
        )}

        {isSuperAdmin && (
          <ListItem key="Administración" disablePadding>
            <ListItemButton component={Link} to="/super-admin">
              <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
              <ListItemText primary="Administración" />
            </ListItemButton>
          </ListItem>
        )}

        <ListItem key="Sobre nosotros" disablePadding>
          <ListItemButton component={Link} to="/aboutus">
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="Sobre nosotros" />
          </ListItemButton>
        </ListItem>

      </List>
      <Box sx={{ mt: 'auto' }}>
        {(isAdmin && activeGymName) || version ? (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1.5 }}>
              {isAdmin && activeGymName && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.4, overflowWrap: 'anywhere' }}>
                  Administrando: {activeGymName}
                </Typography>
              )}
              {version && (
                <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.25 }}>
                  Versión {version}
                </Typography>
              )}
            </Box>
          </>
        ) : null}
        <Divider />
        <ListItem key="logout" disablePadding>
          <Logout />
        </ListItem>
      </Box>
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
