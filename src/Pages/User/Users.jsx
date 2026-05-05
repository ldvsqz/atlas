import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

// services and utilities
import UserService from '../../../Firebase/userService';
import FinanceService from '../../../Firebase/financeService';
import Util from '../../assets/Util';
import UserModel from '../../models/UserModel';
import FinanceModel from '../../models/FinanceModel';
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
import userService from '../../../Firebase/userService';
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';


function User({ menu }) {
  const [Users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [showRenewAlert, setShowRenewAlert] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [checked, setChecked] = React.useState(true);
  const [showAdmins, setShowAdmins] = React.useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    phone: '',
    birthday: null,
    role: 1
  });
  const navigate = useNavigate();
  const util = new Util();

  const { showSnackbar } = useSnackbar();


  useEffect(() => {
    const fetchUsers = async () => {
      const UsersData = await UserService.getAll();
      setUsers(UsersData);
      const activeUsers = UsersData.filter((user) => util.isMembershipDisplayable(user.until));
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
        description: `Renovación de membresía - ${user.name}`,
        date: new Date(),
        category: 'membresia'
      };
      FinanceService.add(movement).then(() => {
        showSnackbar('Movimiento financiero agregado exitosamente', 'success');
      }).catch((error) => {
        console.error('Error adding finance movement:', error);
      });
      // Refresh the users list
      const UsersData = await UserService.getAll();
      setUsers(UsersData);
      setFilteredUsers(UsersData);
      handleWaNotificationResponse(true, user); // Notify user via WhatsApp about the renewal
    }
  };

  const handleWaNotificationResponse = (response, user) => {
    if (response) {
     const message = util.selectMembershipMessage(user.name, user.until);
     if(user.phone){
     util.openWAChat(user.phone, message);
    } else {
      showSnackbar('El usuario no tiene un número telefónico registrado.', 'error');
    }
  }
}

  const handleOpenAddUserModal = () => {
    setOpenAddUserModal(true);
  };

  const handleCloseAddUserModal = () => {
    setOpenAddUserModal(false);

    setNewUser(new UserModel('', '', '', '', '', '', null));
  };

  const handleAddUserChange = (field, value) => {
    setNewUser({
      ...newUser,
      [field]: value
    });
  };

  const handleAddUserSubmit = async () => {
    const formattedName = util.formatMailNanme(newUser.name);
    const email = util.generateemail(formattedName);
    try {
      console.log(newUser);
      const birthdayDate = newUser.birthday ? newUser.birthday.toDate() : Timestamp.now();
      const user = new UserModel(birthdayDate, formattedName, email, newUser.name, newUser.phone, email, Timestamp.now());
      await userService.add(user);
      const UsersData = await UserService.getAll();
      setUsers(UsersData);
      setFilteredUsers(UsersData);
      handleCloseAddUserModal();
      showSnackbar('Usuario creado exitosamente', 'success');
    } catch (error) {
      console.error('Error creating user:', error);
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
                            !util.isMembershipActive(user.until)  &&
                              <Alert
                                buttonName="Notificar"
                                title="Notificar"
                                message={`¿Desea notificar elvencimiento de la membresía de: ${user.name}?`}
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
      >
        <DialogTitle id="add-user-dialog-title">
          Agregar Nuevo Usuario
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre completo"
                variant="standard"
                value={newUser.name}
                onChange={(e) => handleAddUserChange('name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Número telefónico"
                variant="standard"
                value={newUser.phone}
                onChange={(e) => handleAddUserChange('phone', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <LocalizationProvider
                adapterLocale="es-ES"
                dateAdapter={AdapterDayjs}>
                <DatePicker
                  format="LL"
                  label="Fecha de nacimiento"
                  maxDate={dayjs()}
                  value={newUser.birthday ? dayjs(newUser.birthday) : null}
                  onChange={(newDate) => handleAddUserChange('birthday', newDate ? Timestamp.fromDate(new Date(newDate)) : null)}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddUserModal}>Cancelar</Button>
          <Button onClick={handleAddUserSubmit} variant="contained">
            Crear Usuario
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
