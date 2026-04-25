import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
// MUI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
//components
import Menu from '../../Components/Menu/Menu';
import SetUser from "./SetUser";
import Alert from '../../Components/Alert/Alert';
import Routines from '../../Components/Routines/Routines';
import SetRoutine from "../../Components/Routines/SetRoutine";
import SetStats from '../../Components/Stats/SetStats';
import Stats from '../../Components/Stats/Stats';
//serives and utilities
import StatService from '../../../Firebase/statsService';
import UserService from '../../../Firebase/userService';
import RoutineService from '../../../Firebase/RoutineService';
import Util from '../../assets/Util';
import UserModel from "../../models/UserModel";
import { Timestamp } from 'firebase/firestore';
import 'firebase/firestore';

function User({ menu }) {
  const location = useLocation();
  const util = new Util();
  const [user, setUser] = useState(new UserModel());
  const [stats, setStats] = useState({});
  const [routine, setRoutine] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentRol, setRol] = useState(localStorage.getItem("ROL"));
  const [currentUid, setCurrentUid] = useState(localStorage.getItem("UID"));

  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const uid = (location && location.state && location.state.uid) || params.uid || localStorage.getItem("UID");
    if (!uid) {
      // No UID provided via state, params or localStorage: redirect to users list
      navigate('/users');
      return;
    }

    const fetchClientData = async () => {
      try {
        setLoading(true);
        const userData = await UserService.get(uid);
        const userStats = await StatService.getLast(uid);
        const userRoutine = await RoutineService.getLast(uid);

        setUser(userData || new UserModel());
        setStats(userStats || {});
        setRoutine(userRoutine || {});
      } catch (err) {
        console.error('Error fetching user data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [location.state, params.uid, navigate]);



  function handleOnRenew(response) {
    if (response) {
      const newUntilDate = util.renewMembership(user.until);
      const newFirebaseUntil = Timestamp.fromDate(newUntilDate);
      const refreshedUser = { ...user };
      refreshedUser.until = newFirebaseUntil;
      setUser(refreshedUser);
      UserService.update(user.uid, refreshedUser).then(() => {
        console.log("Membresía renovada");
      });
    }
  }
  async function handleOnsetRoutine() {
    const userRoutine = await RoutineService.getLast(user.uid);
    setRoutine(userRoutine);
  }

  async function handleOnSaveStats() {
    const userStats = await StatService.getLast(user.uid);
    setStats(userStats)
  }

  function handleOnCopyNumber(number) {
    util.openWAChat(number);
  }


  return (
    <div>
      {menu}
      <Container fixed>
        {loading ? (
          <Stack spacing={1} sx={{ width: '100%', mt: 4 }}>
            <Skeleton animation="wave" variant="rectangular" height={60} />
            <Skeleton animation="wave" variant="rectangular" height={40} />
            <Skeleton animation="wave" variant="rectangular" height={40} />
            <Skeleton animation="wave" variant="rectangular" height={40} />
          </Stack>
        ) : (
          <Box sx={{ width: '100%', mt: 4 }}>
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar />
                </ListItemAvatar>
                <ListItemText
                  primary={`${user.name || ''}, ${util.getAge(util.getDateFromFirebase(user.birthday))}`}
                  secondary={currentUid === user.uid && currentRol == 0 ? '' : `Activo hasta: ${util.formatDateShort(util.getDateFromFirebase(user.until))}`}
                />
              </ListItem>
              {
                user.phone && currentUid != user.uid &&
                <ListItemButton onClick={() => handleOnCopyNumber(user.phone)}>
                  <ListItemIcon>
                    <WhatsAppIcon />
                  </ListItemIcon>
                  <ListItemText primary={user.phone} />
                </ListItemButton>
              }
            </List>
            <Grid container sx={{ color: 'text.primary' }}>
              <Grid item xs={currentRol == 0 ? 6 : 12}>
                <SetUser user={user}
                  onSave={(updatedUser) =>
                    setUser(updatedUser)
                  } />
              </Grid>
              <Grid item xs={currentRol == 0 ? 6 : 12}>
                {currentRol == 0 && currentUid !== user.uid && <Alert
                  buttonName={"Renovar membresía"}
                  title={"Renovar membresía"}
                  message={`¿Desea renovar la membresía de: ${user.name}?`}
                  onResponse={(response) =>
                    handleOnRenew(response)} />
                }
              </Grid>
            </Grid>
            <Divider />
            <Typography variant="h6" align='center'>
              Medidas
            </Typography>
            <Grid container sx={{ color: 'text.primary' }}>
              <Grid item xs={currentRol == 0 ? 6 : 12}>
                <Stats stats={stats} />
              </Grid>
              <Grid item xs={6}>
                {currentRol == 0 && <SetStats stats={stats} uid={user.uid} isEditing={false} onSave={(updatedStats) => {
                  handleOnSaveStats()
                }} />
                }
              </Grid>
            </Grid>
            {/* 
            <Grid container sx={{ color: 'text.primary' }}>
              <Grid item xs={currentRol == 0 ? 6 : 12}>
                <Stats stats={stats} />
              </Grid>
              <Grid item xs={6}>
                {currentRol == 0 && <SetStats stats={stats} uid={user.uid} isEditing={false} onSave={(updatedStats) => {
                  handleOnSaveStats()
                }} />
                }
              </Grid>
            </Grid>

            <Divider />
            <Routines routine={routine} />
            {currentRol == 0 && <SetRoutine uid={user.uid} onSaveRoutine={(newRoutine) => {
             handleOnsetRoutine()
             }} />
            } */}
          </Box>
        )}
      </Container>
    </div >
  );
}

export default User;