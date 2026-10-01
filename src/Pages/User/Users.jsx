import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

// services and utilities
import UserService from '../../../Firebase/userService';
import FinanceService from '../../../Firebase/financeService';
import StatService from '../../../Firebase/statsService';
import Util from '../../assets/Util';
import FinanceModel from '../../models/FinanceModel';
import { getCurrentGymId } from '../../../Firebase/tenant';
import moduleSettings from '../../config/moduleSettings';
//MUI
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Grid from '@mui/material/Grid';
import Alert from '../../Components/Alert/Alert';
import { Timestamp } from 'firebase/firestore';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

//components
import Menu from '../../Components/Menu/Menu';
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';


function User({ menu }) {
  const [Users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [showRenewAlert, setShowRenewAlert] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [latestStatsByUser, setLatestStatsByUser] = useState({});
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [checked, setChecked] = React.useState(true);
  const [showAdmins, setShowAdmins] = React.useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    phone: '',
    birthday: null
  });
  const navigate = useNavigate();
  const util = new Util();

  const { showSnackbar } = useSnackbar();

  const getSafeDate = (date) => {
    if (!date) return null;
    if (typeof date.toDate === 'function') return date.toDate();
    if (typeof date.seconds === 'number') return util.getDateFromFirebase(date);

    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const getDateTime = (date) => {
    const safeDate = getSafeDate(date);
    return safeDate ? safeDate.getTime() : 0;
  };

  const formatMembershipTenure = (createdAt) => {
    const startDate = getSafeDate(createdAt);
    if (!startDate) return 'No disponible';

    const now = new Date();
    let years = now.getFullYear() - startDate.getFullYear();
    let months = now.getMonth() - startDate.getMonth();
    if (now.getDate() < startDate.getDate()) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    if (years > 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
    return `${Math.max(months, 0)} ${months === 1 ? 'mes' : 'meses'}`;
  };

  const getLatestStatsByUser = (stats = []) => stats.reduce((acc, stat) => {
    if (!stat?.uid) return acc;

    const currentStats = acc[stat.uid];
    if (!currentStats || getDateTime(stat.date) > getDateTime(currentStats.date)) {
      acc[stat.uid] = stat;
    }

    return acc;
  }, {});

  const getAgeLabel = (birthday) => {
    const birthdayDate = getSafeDate(birthday);
    if (!birthdayDate || !Number.isFinite(util.getAge(birthdayDate))) return '';

    const age = util.getAge(birthdayDate);
    return Number.isFinite(age) && age > 0 ? `${age} años` : '';
  };

  const getWeightLabel = (user) => {
    const weight = latestStatsByUser[user.uid]?.weight_kg;
    const numericWeight = Number(weight);

    if (!Number.isFinite(numericWeight) || numericWeight <= 0) return '';

    const formattedWeight = Number.isInteger(numericWeight)
      ? numericWeight.toString()
      : numericWeight.toFixed(1);

    return `${formattedWeight} kg`;
  };


  useEffect(() => {
    const fetchUsers = async () => {
      const gymId = await getCurrentGymId();
      const [UsersData, statsData = []] = await Promise.all([
        UserService.getAll(gymId),
        StatService.getAll().catch((error) => {
          console.error('Error fetching user stats:', error);
          return [];
        })
      ]);

      setUsers(UsersData);
      setLatestStatsByUser(getLatestStatsByUser(statsData || []));
      const assignedUsers = UsersData.filter(
        (user) => typeof user.gymId === 'string' && user.gymId.trim().length > 0,
      );
      setUsers(assignedUsers);
      const activeUsers = assignedUsers.filter((user) => util.isMembershipDisplayable(user.until));
      setFilteredUsers(activeUsers);
      setLoading(false)
    };
    fetchUsers();
  }, []);


  const handleSearch = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    const filteredUsersData = Users.filter((user) =>
      user.name.toLowerCase().includes(term)
    );
    setChecked(false);
    setFilteredUsers(filteredUsersData);
  };


  const handleViewProfile = (uid) => {
    navigate(`/user/${uid}`, { state: { uid } });
  };

  const handleRenewMembership = (user) => {
    setSelectedUser(user);
    setShowRenewAlert(true);
  };

  const handleRenewResponse = async (response, user) => {
    if (response) {
      const newUntilDate = util.renewMembership(user.until);
      const newFirebaseUntil = Timestamp.fromDate(newUntilDate);
      const updatedUser = { ...user };
      updatedUser.until = newFirebaseUntil;

      await UserService.update(user.uid, updatedUser);
      showSnackbar(`Membresía de ${user.name} renovada hasta ${util.formatDateShort(newUntilDate)}`, 'success');
      // Add finance movement
      const movement = {
        type: 'income',
        amount: 15000,
        description: user.name,
        date: new Date(),
        category: 'membresia'
      };
      FinanceService.add(movement).then(() => {
        showSnackbar('Movimiento financiero agregado exitosamente', 'success');
      }).catch((error) => {
        console.error('Error adding finance movement:', error);
      });
      // Refresh the users list
      const UsersData = await UserService.getAll(await getCurrentGymId());
      const activeUsers = UsersData.filter((user) => util.isMembershipDisplayable(user.until));
      setUsers(UsersData);
      setFilteredUsers(activeUsers);
      // handleWaNotificationResponse(true, user);
    }
  };

  const handleWaNotificationResponse = async (response, user) => {
    if (!response) return;

    const configuredMessage = moduleSettings.getSettings('members').notificationMessage?.trim();
    const msgText = configuredMessage
      ? configuredMessage
        .replaceAll('{{nombre}}', util.getFirstName(user.name))
        .replaceAll('{{fechaMembresia}}', util.formatDateShort(util.getDateFromFirebase(user.until)))
      : util.selectMembershipMessage(user.name, user.until);
    const phone = user.phone || '71699673';
    util.openWAChat(phone, msgText);
    showSnackbar(`Abriendo WhatsApp Web para notificar a ${user.name}...`, 'info');
  };

  const handleOpenAddUserModal = () => {
    setOpenAddUserModal(true);
  };

  const handleCloseAddUserModal = () => {
    if (creatingUser) return;
    setOpenAddUserModal(false);
    setNewUser({ name: '', phone: '', birthday: null });
  };

  const handleAddUserChange = (field, value) => {
    setNewUser({
      ...newUser,
      [field]: value
    });
  };

  const handleAddUserSubmit = async () => {
    if (!newUser.name.trim() || !newUser.phone.trim() || !newUser.birthday) {
      showSnackbar('Complete el nombre, número telefónico y fecha de nacimiento.', 'error');
      return;
    }

    try {
      setCreatingUser(true);
      const gymId = await getCurrentGymId();
      await UserService.createMember({
        name: newUser.name.trim(),
        phone: newUser.phone.trim(),
        birthday: newUser.birthday,
        gymId,
      });
      const UsersData = await UserService.getAll();
      setUsers(UsersData);
      setFilteredUsers(UsersData);
      setOpenAddUserModal(false);
      setNewUser({ name: '', phone: '', birthday: null });
      showSnackbar('Usuario agregado correctamente.', 'success');
    } catch (error) {
      console.error('Error creating user:', error);
      showSnackbar(error.message || 'No se pudo crear el usuario.', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleChangeCheck = (event) => {
    setChecked(event.target.checked);
    if (event.target.checked) {
      const filteredUsersData = Users.filter((user) => {
        const isActive = util.isMembershipDisplayable(user.until);
        const shouldInclude = showAdmins ? true : user.rol !== 0;
        return isActive && shouldInclude;
      }
      );
      setFilteredUsers(filteredUsersData);
    } else {
      const filteredUsersData = Users.filter((user) => {
        return showAdmins ? true : user.rol !== 0;
      });
      setFilteredUsers(filteredUsersData);
    }
  };

  const handleChangeShowAdmins = (event) => {
    setShowAdmins(event.target.checked);
    if (event.target.checked) {
      // Show only role 0 users (admins)
      const filteredUsersData = Users.filter((user) => {
        return user.rol === 0;
      });
      setFilteredUsers(filteredUsersData);
    } else {
      // Show role 1 users with active filter applied
      if (checked) {
        const filteredUsersData = Users.filter((user) => {
          return util.isMembershipActive(user.until) && user.rol !== 0;
        });
        setFilteredUsers(filteredUsersData);
      } else {
        const filteredUsersData = Users.filter((user) => {
          return user.rol !== 0;
        });
        setFilteredUsers(filteredUsersData);
      }
    }
  };

  return (

    <div>
      {menu}
      <Container fixed sx={{ mt: 4, pr: 0, pl: 0 }}>  
        <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
          <CardContent>
            <TextField label="Buscar" variant="standard" fullWidth
              value={searchTerm}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e);
              }}
              InputProps={{
                startAdornment: focused ? null : (
                  <InputAdornment position="start">
                  </InputAdornment>
                ),
              }}
            />

            <FormControlLabel
              label={'Admins'}
              control={<Checkbox checked={showAdmins} onChange={handleChangeShowAdmins} />}
              sx={{ gap: 1, m: 0 }}
            />

            {!showAdmins && (
              <FormControlLabel
                label={checked ? `Activos: ${filteredUsers.filter(user => user.rol !== 0 && util.isMembershipActive(user.until)).length}` : `Todos: ${filteredUsers.filter(user => user.rol !== 0).length}`}
                control={<Checkbox checked={checked} onChange={handleChangeCheck} />}
                sx={{ gap: 1, m: 0 }}
              />
            )}
          </CardContent>
        </Card>
        {loading ? (
          <Stack spacing={1}>
            <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
            <Skeleton variant="rounded" height={40} />
            <Skeleton variant="rounded" height={40} />
            <Skeleton variant="rounded" height={40} />
          </Stack>
        ) : (
          <Box sx={{ width: '100%' }}>

            <TableContainer component={Paper} sx={{ mt: 4 }}>
              <Table sx={{ minWidth: '100%' }} aria-label="simple table">
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    {!showAdmins && <TableCell>Hasta</TableCell>}
                    {!showAdmins && <TableCell>Acción</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    (user.rol !== 0 || showAdmins) ? (
                      <TableRow
                        key={user.uid}
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                          padding: '4px',
                          cursor: 'pointer',
                          backgroundColor: user.rol === 0 ? 'action.selected' : 'inherit'
                        }}>
                        <TableCell onClick={() => handleViewProfile(user.uid)} sx={{ cursor: 'pointer' }}>
                          {user.name}
                          <Box sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.25 }}>
                            {getAgeLabel(user.birthday)} {user.weight !== undefined && user.weight !== null ? '·' : ''} {getWeightLabel(user)}
                          </Box>
                        </TableCell>
                        {!showAdmins && (
                        <TableCell
                          onClick={() => handleViewProfile(user.uid)}
                          sx={{
                            color: (() => {
                              const daysLeft = (new Date(util.getDateFromFirebase(user.until)) - new Date()) / (1000 * 60 * 60 * 24);
                              return daysLeft > 0 && daysLeft <= 5 ? '#DAA520' : util.dateExpireColor(util.getDateFromFirebase(user.until));
                            })(),
                            cursor: 'pointer'
                          }}>
                          {util.formatDateShort(util.getDateFromFirebase(user.until))} {user.rol === 0 && '(Admin)'}
                        </TableCell>
                          )}
                        {!showAdmins && (

                          <TableCell>
                            <Alert
                              buttonName="Renovar"
                              title="Renovar membresía"
                              message={`¿Desea renovar la membresía de: ${user.name}?`}
                              onResponse={(response) => handleRenewResponse(response, user)}
                            />
                            { 
                              <Alert
                                buttonName="Notificar"
                                title="Notificar"
                                message={`¿Desea notificar el vencimiento de la membresía de: ${user.name}?`}
                                onResponse={(response) => handleWaNotificationResponse(response, user)}
                              />
                            }
                          </TableCell>
                        )}
                      </TableRow>
                    ) : null
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Container>

      <Dialog
        open={openAddUserModal}
        onClose={handleCloseAddUserModal}
        aria-labelledby="add-user-dialog-title"
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle id="add-user-dialog-title" sx={{ px: { xs: 3, sm: 4 }, pt: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            Agregar usuario
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 3, sm: 4 }, pb: 1 }}>
          <DialogContentText sx={{ mb: 2, color: 'text.secondary' }}>
            Registra los datos personales del nuevo miembro.
          </DialogContentText>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                autoFocus
                required
                label="Nombre completo"
                placeholder="Ej. María Rodríguez"
                value={newUser.name}
                onChange={(e) => handleAddUserChange('name', e.target.value)}
                disabled={creatingUser}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="tel"
                label="Número telefónico"
                placeholder="Ej. 8888-8888"
                value={newUser.phone}
                onChange={(e) => handleAddUserChange('phone', e.target.value)}
                disabled={creatingUser}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider
                adapterLocale="es-ES"
                dateAdapter={AdapterDayjs}>
                <DatePicker
                  format="LL"
                  label="Fecha de nacimiento"
                  maxDate={dayjs()}
                  value={newUser.birthday ? dayjs(newUser.birthday) : null}
                  onChange={(newDate) => handleAddUserChange('birthday', newDate?.isValid() ? newDate.toDate() : null)}
                  disabled={creatingUser}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 3, sm: 4 }, py: 2.5, gap: 1 }}>
          <Button onClick={handleCloseAddUserModal} disabled={creatingUser} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleAddUserSubmit} variant="contained" disabled={creatingUser} sx={{ px: 3 }}>
            {creatingUser ? 'Guardando…' : 'Agregar usuario'}
          </Button>
        </DialogActions>
      </Dialog>

      <Fab
        color="primary"
        aria-label="add"
        onClick={handleOpenAddUserModal}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <AddIcon />
      </Fab>
    </div>
  );
}

export default User;
