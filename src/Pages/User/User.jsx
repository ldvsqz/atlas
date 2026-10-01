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
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import MuiTooltip from '@mui/material/Tooltip';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import KeyIcon from '@mui/icons-material/Key';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import MuiAlert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import InsightsIcon from '@mui/icons-material/Insights';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
//components
import Menu from '../../Components/Menu/Menu';
import SetUser from "./SetUser";
import Alert from '../../Components/Alert/Alert';
import SetStats from '../../Components/Stats/SetStats';
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';
//serives and utilities
import StatService from '../../../Firebase/statsService';
import UserService, { isGeneratedMemberProfileEmail } from '../../../Firebase/userService';
import RoutineService from '../../../Firebase/RoutineService';
import Util from '../../assets/Util';
import UserModel from "../../models/UserModel";
import { Timestamp } from 'firebase/firestore';
import 'firebase/firestore';
import { useAuthProfile } from '../../hooks/useAuthProfile';
import { sendPasswordReset } from '../../../Firebase/authFunctions';
import { createMemberEmailPasswordAccount, getMemberAuthStatus } from '../../../Firebase/memberAuthService';
import TenantService from '../../../Firebase/tenantService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../Firebase/firebase';

const getStatDate = (stat) => {
  if (!stat?.date) return null;
  if (stat.date.toDate) return stat.date.toDate();
  if (stat.date.seconds) return new Date(stat.date.seconds * 1000);
  const parsedDate = new Date(stat.date);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const toChartNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

function User({ menu }) {
  const location = useLocation();
  const util = new Util();
  const [user, setUser] = useState(new UserModel());
  const [stats, setStats] = useState({});
  const [statsHistory, setStatsHistory] = useState([]);
  const [routine, setRoutine] = useState({});
  const [loading, setLoading] = useState(true);
  const { user: authUser, isAdmin, isSuperAdmin } = useAuthProfile();
  const currentUid = authUser?.uid;
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [transferGymId, setTransferGymId] = useState('');
  const [transferDetails, setTransferDetails] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [requestsDialogOpen, setRequestsDialogOpen] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [memberAuthStatus, setMemberAuthStatus] = useState({ loading: true, hasAccount: false, hasEmailPassword: false });
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const { showSnackbar } = useSnackbar();
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const uid = (location && location.state && location.state.uid) || params.uid || authUser?.uid;
    if (!uid) {
      // No UID provided via state, params or localStorage: redirect to users list
      navigate('/users');
      return;
    }

    const fetchClientData = async () => {
      try {
        setLoading(true);
        const [userData, userStats, userStatsHistory, userRoutine] = await Promise.all([
          UserService.get(uid),
          StatService.getLast(uid),
          StatService.getAllByUID(uid),
          RoutineService.getLast(uid),
        ]);
        const tenantData = await TenantService.getAll();
        setTenants(tenantData);
        if (uid === authUser?.uid) {
          setMyRequests(await TenantService.getMyRequests(uid));
        }

        setUser(userData || new UserModel());
        setStats(userStats || {});
        setStatsHistory(userStatsHistory || []);
        setRoutine(userRoutine || {});
      } catch (err) {
        console.error('Error fetching user data', err);
        showSnackbar('Error al cargar datos del usuario', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [location.state, params.uid, navigate, authUser?.uid]);

  useEffect(() => {
    let active = true;
    if (!user.uid) return undefined;

    setMemberAuthStatus({ loading: true, hasAccount: false, hasEmailPassword: false });
    getMemberAuthStatus(user.uid)
      .then((status) => {
        if (active) setMemberAuthStatus({ loading: false, ...status });
      })
      .catch(() => {
        if (active) setMemberAuthStatus({ loading: false, hasAccount: false, hasEmailPassword: false, unavailable: true });
      });

    return () => {
      active = false;
    };
  }, [user.uid]);



  function handleOnRenew(response) {
    if (response) {
      const newUntilDate = util.renewMembership(user.until);
      const newFirebaseUntil = Timestamp.fromDate(newUntilDate);
      const refreshedUser = { ...user };
      refreshedUser.until = newFirebaseUntil;
      setUser(refreshedUser);
      UserService.update(user.uid, refreshedUser);
    }
  }
  async function handleOnsetRoutine() {
    const userRoutine = await RoutineService.getLast(user.uid);
    setRoutine(userRoutine);
  }

  async function handleOnSaveStats() {
    const [userStats, userStatsHistory] = await Promise.all([
      StatService.getLast(user.uid),
      StatService.getAllByUID(user.uid),
    ]);
    setStats(userStats || {});
    setStatsHistory(userStatsHistory || []);
  }

  function handleOnCopyNumber(number) {
    util.openWAChat(number);
  }

  async function handlePasswordReset() {
    try {
      await sendPasswordReset(user.email);
      showSnackbar('Se envio un enlace para cambiar la contraseña.', 'success');
    } catch {
      showSnackbar('No se pudo enviar el enlace para cambiar la contraseña.', 'error');
    }
  }

  async function handleCreateAuthAccount() {
    try {
      setIsOperationLoading(true);
      const status = await createMemberEmailPasswordAccount(user.uid, temporaryPassword);
      
      setCreateAccountDialogOpen(false);
      setTemporaryPassword('');
      showSnackbar('Cuenta de acceso creada correctamente.', 'success');
    } catch (error) {
      showSnackbar(error.message || 'No se pudo crear la cuenta de acceso.', 'error');
    } finally {
      setIsOperationLoading(false);
    }
  }

  const statsChartData = statsHistory
    .map((stat) => {
      const date = getStatDate(stat);
      return {
        date,
        label: date ? util.formatDateShort(date) : '—',
        pesoBase: toChartNumber(stat.weight_kg),
        imc: toChartNumber(stat.IMC),
      };
    })
    .filter((item) => item.date)
    .sort((a, b) => a.date - b.date);

  const latestConsiderations = stats?.considerations || {};
  const recentSurgeries = latestConsiderations.recent_surgeries || 'Ninguna';
  const riskFactors = latestConsiderations.risks_factors || 'Ninguna';
  const hasMedicalConsiderations = [recentSurgeries, riskFactors].some((value) => {
    const normalizedValue = value.toString().trim().toLowerCase();
    return normalizedValue && normalizedValue !== 'ninguna';
  });
  const hasStats = Boolean(stats?.date);
  const isOwnProfile = currentUid === user.uid;
  const canAddStats = isAdmin || (isOwnProfile && !hasStats);
  const canEditStats = isAdmin && hasStats;
  const currentTenant = tenants.find((tenant) => tenant.id === user.gymId);
  const requestLabels = {
    gymRequests: 'Crear gimnasio',
    gymMembershipRequests: 'Unirse a gimnasio',
    gymTransferRequests: 'Traslado de gimnasio',
  };
  const requestStatusLabels = {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  };
  const avatarActionButtonSx = {
    width: 42,
    minWidth: 42,
    height: 42,
    p: 0,
  };

  async function handleTransferRequest() {
    try {
      setIsOperationLoading(true);
      await TenantService.requestTransfer(authUser, transferGymId, transferDetails, user);
      setTransferDialogOpen(false);
      setTransferGymId('');
      setTransferDetails('');
      showSnackbar('Solicitud de traslado enviada.', 'success');
    } catch {
      showSnackbar('No se pudo enviar la solicitud de traslado.', 'error');
    } finally {
      setIsOperationLoading(false);
    }
  }

  async function handleProfilePhotoChange(event) {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !isOwnProfile) return;

      if (!file.type.startsWith('image/')) {
        showSnackbar('Seleccione una imagen válida.', 'error');
        return;
      }
      if (file.size >= 5 * 1024 * 1024) {
        showSnackbar('La imagen debe pesar menos de 5 MB.', 'error');
        return;
      }

      try {
        setPhotoUploading(true);
        const photoRef = ref(storage, `users/${user.uid}/profile/avatar`);
        await uploadBytes(photoRef, file, { contentType: file.type });
        const photoURL = await getDownloadURL(photoRef);
        await UserService.update(user.uid, { photoURL });
        setUser((current) => ({ ...current, photoURL }));
        showSnackbar('Foto de perfil actualizada.', 'success');
      } catch (error) {
        console.error('Error uploading profile photo:', error);
        showSnackbar('No se pudo actualizar la foto de perfil.', 'error');
      } finally {
        setPhotoUploading(false);
    }
  }


  return (
    <div>
      {menu}
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        {loading ? (
          <Stack spacing={1} sx={{ width: '100%', mt: 4 }}>
            <Skeleton animation="wave" variant="rectangular" height={60} />
            <Skeleton animation="wave" variant="rectangular" height={40} />
            <Skeleton animation="wave" variant="rectangular" height={40} />
            <Skeleton animation="wave" variant="rectangular" height={40} />
          </Stack>
        ) : (
          <Box sx={{ width: '100%' }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flex: 1, flexWrap: 'wrap', minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                        <Box sx={{ position: 'relative' }}>
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={isOwnProfile ? (
                              <IconButton
                                component="label"
                                htmlFor="profile-photo-upload"
                                disabled={photoUploading}
                                aria-label="Cambiar foto de perfil"
                                size="small"
                                sx={{
                                  backgroundColor: 'primary.main',
                                  color: 'primary.contrastText',
                                  '&:hover': { backgroundColor: 'primary.dark' },
                                  '&.Mui-disabled': { backgroundColor: 'action.disabledBackground' },
                                }}
                              >
                                {photoUploading ? <CircularProgress size={16} color="inherit" /> : <EditIcon fontSize="small" />}
                              </IconButton>
                            ) : null}
                          >
                            <Avatar src={user.photoURL || undefined} sx={{ width: 72, height: 72, fontSize: 28 }}>
                              {user.name?.charAt(0) || 'U'}
                            </Avatar>
                          </Badge>
                          {isOwnProfile && (
                            <>
                              <input
                                id="profile-photo-upload"
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleProfilePhotoChange}
                              />
                            </>
                          )}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h5" fontWeight={700} noWrap>{user.name || 'Usuario'}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {util.getAge(util.getDateFromFirebase(user.birthday))} años · nac. {util.formatDateShort(util.getDateFromFirebase(user.birthday))}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {currentUid === user.uid && isAdmin ? 'Administrador' : `Activo hasta ${util.formatDateShort(util.getDateFromFirebase(user.until))}`}
                          </Typography>
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ ml: 'auto', flexShrink: 0 }}>
                        {isOwnProfile && (
                          <MuiTooltip title={`Estado de mis solicitudes${myRequests.some((request) => request.status === 'pending') ? ' pendientes' : ''}`}>
                            <Button variant="outlined" aria-label="Ver estado de mis solicitudes" onClick={() => setRequestsDialogOpen(true)} sx={avatarActionButtonSx}>
                              <AssignmentOutlinedIcon />
                            </Button>
                          </MuiTooltip>
                        )}
                        {isOwnProfile && user.gymId && (
                          <MuiTooltip title="Solicitar traslado de gimnasio">
                            <Button variant="outlined" aria-label="Solicitar traslado de gimnasio" onClick={() => setTransferDialogOpen(true)} sx={avatarActionButtonSx}>
                              <SwapHorizIcon />
                            </Button>
                          </MuiTooltip>
                        )}
                        {isAdmin && !isOwnProfile && (
                          <Alert
                            variant="outlined"
                            buttonSx={avatarActionButtonSx}
                            buttonName={<AutorenewIcon />}
                            buttonTooltip="Renovar membresía"
                            title="Renovar membresía"
                            message={`¿Desea renovar la membresía de: ${user.name}?`}
                            onResponse={handleOnRenew}
                          />
                        )}
                        {isOwnProfile && memberAuthStatus.hasEmailPassword && !isGeneratedMemberProfileEmail(user.email) && (
                          <MuiTooltip title="Enviar enlace para cambiar contraseña">
                            <Button variant="outlined" aria-label="Cambiar contraseña" onClick={handlePasswordReset} sx={avatarActionButtonSx}>
                              <KeyIcon />
                            </Button>
                          </MuiTooltip>
                        )}
                        {isSuperAdmin && user.email && !isGeneratedMemberProfileEmail(user.email) && !memberAuthStatus.loading && !memberAuthStatus.unavailable && !memberAuthStatus.hasAccount && (
                          <MuiTooltip title="Crear cuenta de acceso">
                            <Button variant="outlined" aria-label="Crear cuenta de acceso" onClick={() => setCreateAccountDialogOpen(true)} sx={avatarActionButtonSx}>
                              <PersonAddIcon />
                            </Button>
                          </MuiTooltip>
                        )}
                        <SetUser user={user} onSave={(updatedUser) => setUser(updatedUser)} buttonSx={avatarActionButtonSx} iconOnly />
                      </Stack>
                    </Box>
                    </Box>
                    <Divider sx={{ mb: 2.5 }} />
                    <Grid container spacing={1.25}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ minHeight: 72, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                          <Typography variant="caption" color="text.secondary">Email</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{user.email || '—'}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ minHeight: 72, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Teléfono</Typography>
                          {user.phone ? (
                            <MuiTooltip title="Abrir chat de WhatsApp">
                              <Button
                                variant="text"
                                startIcon={<WhatsAppIcon />}
                                onClick={() => handleOnCopyNumber(user.phone)}
                                sx={{ minWidth: 0, minHeight: 0, px: 0, py: 0.25, justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
                              >
                                {user.phone}
                              </Button>
                            </MuiTooltip>
                          ) : (
                            <Typography variant="body2" fontWeight={600}>—</Typography>
                          )}
                        </Box>
                        </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ minHeight: 72, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                          <Typography variant="caption" color="text.secondary">DNI</Typography>
                          <Typography variant="body2" fontWeight={600}>{user.dni || '—'}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ minHeight: 72, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                          <Typography variant="caption" color="text.secondary">Gimnasio</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{currentTenant?.name || user.gymId || 'Sin gimnasio asignado'}</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
                <Dialog open={requestsDialogOpen} onClose={() => setRequestsDialogOpen(false)} fullWidth maxWidth="sm">
                  <DialogTitle>Estado de mis solicitudes</DialogTitle>
                  <DialogContent>
                    {!myRequests.length && (
                      <Typography color="text.secondary">No tienes solicitudes registradas.</Typography>
                    )}
                    <Stack spacing={1.5}>
                      {myRequests.map((request) => (
                        <Box key={`${request.type}-${request.id}`} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="body1" fontWeight={600}>
                            {requestLabels[request.type] || 'Solicitud'}: {request.name || request.gymId || '—'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Estado: {requestStatusLabels[request.status] || request.status || 'Desconocido'}
                          </Typography>
                          {request.details && <Typography variant="body2">Detalles: {request.details}</Typography>}
                        </Box>
                      ))}
                    </Stack>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setRequestsDialogOpen(false)}>Cerrar</Button>
                  </DialogActions>
                </Dialog>
                <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} fullWidth maxWidth="sm">
                  <DialogTitle>Solicitar traslado</DialogTitle>
                  <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                      Gimnasio actual: {currentTenant?.name || user.gymId}
                    </DialogContentText>
                    <TextField
                      select
                      fullWidth
                      label="Gimnasio destino"
                      value={transferGymId}
                      onChange={(event) => setTransferGymId(event.target.value)}
                      SelectProps={{ native: false }}
                    >
                      {tenants.filter((tenant) => tenant.id !== user.gymId).map((tenant) => (
                        <MenuItem key={tenant.id} value={tenant.id}>{tenant.name}</MenuItem>
                      ))}
                    </TextField>
                    <TextField fullWidth multiline rows={3} label="Motivo o detalles" value={transferDetails} onChange={(event) => setTransferDetails(event.target.value)} sx={{ mt: 2 }} />
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setTransferDialogOpen(false)}>Cancelar</Button>
                    <Button variant="contained" disabled={!transferGymId || isOperationLoading} onClick={handleTransferRequest}>Enviar solicitud</Button>
                  </DialogActions>
                </Dialog>
                <Dialog open={createAccountDialogOpen} onClose={() => !isOperationLoading && setCreateAccountDialogOpen(false)} fullWidth maxWidth="xs">
                  <DialogTitle>Crear cuenta de acceso</DialogTitle>
                  <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                      Se creará una cuenta para {user.email || 'el correo registrado'} con una contraseña temporal.
                    </DialogContentText>
                    <TextField
                      fullWidth
                      autoFocus
                      type="password"
                      label="Contraseña temporal"
                      value={temporaryPassword}
                      onChange={(event) => setTemporaryPassword(event.target.value)}
                      helperText="Debe tener al menos 6 caracteres."
                    />
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setCreateAccountDialogOpen(false)} disabled={isOperationLoading}>Cancelar</Button>
                    <Button variant="contained" onClick={handleCreateAuthAccount} disabled={temporaryPassword.length < 6 || isOperationLoading}>
                      Crear cuenta
                    </Button>
                  </DialogActions>
                </Dialog>
              </Grid>
              <Grid item xs={12}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch" sx={{ '& > .MuiCard-root': { flex: 1 } }}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                        <Typography variant="h6">Medidas del {util.formatDate(util.getDateFromFirebase(stats.date)) || '—'}</Typography>
                        <Stack direction="row" spacing={1}>
                          {canAddStats && <SetStats stats={stats} uid={user.uid} isEditing={false} onSave={handleOnSaveStats} buttonSx={avatarActionButtonSx} iconOnly />}
                          {canEditStats && <SetStats stats={stats} uid={user.uid} isEditing={true} onSave={handleOnSaveStats} buttonSx={avatarActionButtonSx} iconOnly />}
                        </Stack>
                      </Box>
                      {hasStats ? (
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
                  </Card>

                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <HealthAndSafetyIcon color={hasMedicalConsiderations ? 'warning' : 'success'} />
                        <Typography variant="h6">Consideraciones médicas</Typography>
                      </Stack>
                      {hasStats ? (
                        <Stack spacing={1.5}>
                          <MuiAlert severity={hasMedicalConsiderations ? 'warning' : 'success'} variant="outlined">
                            {hasMedicalConsiderations
                              ? 'Revisar estas consideraciones antes de planificar entrenamientos.'
                              : 'Sin consideraciones médicas relevantes registradas.'}
                          </MuiAlert>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Cirugías recientes</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{recentSurgeries}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Factores de riesgo</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{riskFactors}</Typography>
                          </Box>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No hay consideraciones registradas.</Typography>
                      )}
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
            <Card variant="outlined" sx={{ borderRadius: 2, mt: 3 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <InsightsIcon color="primary" />
                  <Typography variant="h6">Evolución física</Typography>
                </Stack>
                {statsChartData.length > 1 ? (
                  <Box sx={{ width: '100%', height: { xs: 280, md: 340 } }}>
                    <ResponsiveContainer>
                      <LineChart data={statsChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="pesoBase" name="Peso base" stroke="#2e7d32" strokeWidth={2} connectNulls />
                        <Line type="monotone" dataKey="imc" name="IMC" stroke="#ed6c02" strokeWidth={2} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Se necesitan al menos dos registros de medidas para mostrar gráficos.
                  </Typography>
                )}
              </CardContent>
            </Card>
            <Divider sx={{ my: 3 }} />
            {/* 
            <Grid container sx={{ color: 'text.primary' }}>
              <Grid item xs={isAdmin ? 6 : 12}>
                <Stats stats={stats} />
              </Grid>
              <Grid item xs={6}>
                {isAdmin && <SetStats stats={stats} uid={user.uid} isEditing={false} onSave={(updatedStats) => {
                  handleOnSaveStats()
                }} />
                }
              </Grid>
            </Grid>

            <Divider />
            <Routines routine={routine} />
            {isAdmin && <SetRoutine uid={user.uid} onSaveRoutine={(newRoutine) => {
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
