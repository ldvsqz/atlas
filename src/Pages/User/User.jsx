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
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';
//components
import Menu from '../../Components/Menu/Menu';
import SetUser from "./SetUser";
import Alert from '../../Components/Alert/Alert';
import SetStats from '../../Components/Stats/SetStats';
import Stats from '../../Components/Stats/Stats';
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';
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
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [newRole, setNewRole] = useState(null);

  const { showSnackbar } = useSnackbar();
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
        showSnackbar('Error al cargar datos del usuario', 'error');
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

  async function handleRoleChange() {
    if (newRole === null) return;
    try {
      setIsOperationLoading(true);
      const updatedUser = { ...user, rol: newRole };
      await UserService.update(user.uid, updatedUser);
      setUser(updatedUser);
      setRoleChangeDialogOpen(false);
      setNewRole(null);
      showSnackbar('Rol actualizado correctamente', 'success');
    } catch (err) {
      console.error('Error updating role', err);
      showSnackbar('Error al actualizar el rol del usuario', 'error');
    } finally {
      setIsOperationLoading(false);
    }
  }

  async function handleDeleteUser() {
    try {
      setIsOperationLoading(true);
      await UserService.delete(user.uid);
      setDeleteDialogOpen(false);
      showSnackbar('Usuario eliminado correctamente', 'success');
      setTimeout(() => {
        navigate('/users');
      }, 1500);
    } catch (err) {
      console.error('Error deleting user', err);
      showSnackbar('Error al eliminar el usuario', 'error');
    } finally {
      setIsOperationLoading(false);
    }
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
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                        <Avatar sx={{ width: 72, height: 72, fontSize: 28 }}>{user.name?.charAt(0) || 'U'}</Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h5" fontWeight={700} noWrap>{user.name || 'Usuario'}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {util.getAge(util.getDateFromFirebase(user.birthday))} años
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {currentUid === user.uid && currentRol == 0 ? 'Administrador' : `Activo hasta ${util.formatDateShort(util.getDateFromFirebase(user.until))}`}
                          </Typography>
                        </Box>
                      </Box>
                      {user.phone && currentUid !== user.uid && (
                        <Button
                          fullWidth
                          variant="outlined"
                          size="small"
                          startIcon={<WhatsAppIcon />}
                          onClick={() => handleOnCopyNumber(user.phone)}
                        >
                          Contactar
                        </Button>
                      )}
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={12}>
                        <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                        <Typography variant="body1" gutterBottom>{user.email || '—'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={12}>
                          <Typography variant="subtitle2" color="text.secondary">Teléfono</Typography>
                          <Typography variant="body1">{user.phone || '—'}</Typography>
                        </Grid>
                      <Grid item xs={12} sm={12}>
                        <Typography variant="subtitle2" color="text.secondary">DNI</Typography>
                        <Typography variant="body1" gutterBottom>{user.dni || '—'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={12}>
                        <Typography variant="subtitle2" color="text.secondary">Rol</Typography>
                        <Typography variant="body1">{user.rol === 0 ? 'Admin' : 'Miembro'}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, p: 2 }}>
                    
                    <Grid container spacing={4} mb={6}>
                      <Grid item xs={12} md={6}>
                        <SetUser user={user} onSave={(updatedUser) => setUser(updatedUser)} />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {currentRol == 0 && currentUid !== user.uid && (
                          <Alert
                          fullWidth
                          buttonName="Renovar membresía"
                          title="Renovar membresía"
                          message={`¿Desea renovar la membresía de: ${user.name}?`}
                          onResponse={(response) => handleOnRenew(response)}
                          />
                        )}
                      </Grid>


                      {currentRol == 0 && currentUid !== user.uid && (
                        <>
                      <Grid item xs={12} md={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<AdminPanelSettingsIcon />}
                          onClick={() => {
                            setNewRole(user.rol === 0 ? 1 : 0);
                            setRoleChangeDialogOpen(true);
                          }}
                          disabled={isOperationLoading}
                        >
                          
                          {user.rol === 0 ? 'Hacer miembro' : 'Hacer admin'}
                        </Button>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => setDeleteDialogOpen(true)}
                          disabled={isOperationLoading}
                          >
                          Eliminar
                        </Button>
                      </Grid>
                    </>
                  )}
                    </Grid>
                  </CardActions>
                </Card>
              </Grid>
              <Grid item xs={12} md={5}>
                <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="h6" mb={2}>Medidas del {util.formatDate(util.getDateFromFirebase(stats.date)) || '—'}</Typography>
                    {stats && stats.date ? (
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="text.secondary">Estatura</Typography>
                          <Typography variant="body1">{stats.Height_cm ?? '—'} cm</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="text.secondary">Peso base</Typography>
                          <Typography variant="body1">{stats.weight_kg ?? '—'} kg</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="text.secondary">Peso salida</Typography>
                          <Typography variant="body1">{stats.weight_kg_end ?? '—'} kg</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="text.secondary">IMC</Typography>
                          <Typography variant="body1">{stats.IMC ?? '—'}</Typography>
                        </Grid>
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No tiene medidas registradas</Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, p: 2 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        {currentRol == 0 && <SetStats stats={stats} uid={user.uid} isEditing={false} onSave={handleOnSaveStats} />}
                      </Grid>
                      <Grid item xs={6}>
                        {currentRol == 0 && stats.date && <SetStats stats={stats} uid={user.uid} isEditing={true} onSave={handleOnSaveStats} />}
                      </Grid>
                    </Grid>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
            <Divider />
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

      {/* Role Change Dialog */}
      <Dialog
        open={roleChangeDialogOpen}
        onClose={() => !isOperationLoading && setRoleChangeDialogOpen(false)}
      >
        <DialogTitle>Cambiar rol de usuario</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Desea cambiar el rol de <strong>{user.name}</strong> de <strong>{user.rol === 0 ? 'Admin' : 'Miembro'}</strong> a <strong>{newRole === 0 ? 'Admin' : 'Miembro'}</strong>?
          </DialogContentText>
          <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={isOperationLoading}>
            <CircularProgress color="inherit" />
          </Backdrop>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRoleChangeDialogOpen(false)}
            disabled={isOperationLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleRoleChange}
            variant="contained"
            disabled={isOperationLoading}
          >
            Cambiar rol
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isOperationLoading && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Eliminar usuario</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'error.main' }}>
            ¿Desea eliminar permanentemente al usuario <strong>{user.name}</strong>? Esta acción no se puede deshacer.
          </DialogContentText>
          <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={isOperationLoading}>
            <CircularProgress color="inherit" />
          </Backdrop>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isOperationLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            disabled={isOperationLoading}
          >
            Eliminar usuario
          </Button>
        </DialogActions>
      </Dialog>
    </div >
  );
}

export default User;