import React, { useState, useEffect } from 'react';
import UserService from '../../../Firebase/userService';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Grid from '@mui/material/Grid';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import { Timestamp } from 'firebase/firestore';
import 'dayjs/locale/es';
import dayjs from 'dayjs';
import "./user.css";
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';



const today = dayjs();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toEditableText = (value) => value == null ? '' : String(value);

const normalizeUser = (user = {}) => ({
  ...user,
  dni: toEditableText(user?.dni),
  email: toEditableText(user?.email),
  name: toEditableText(user?.name),
  phone: toEditableText(user?.phone),
});

const toDayjs = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  if (value.toDate) return dayjs(value.toDate());
  if (value.seconds) return dayjs(new Date(value.seconds * 1000));

  const parsedDate = dayjs(value);
  return parsedDate.isValid() ? parsedDate : null;
};

const toTimestamp = (value) => {
  const parsedDate = dayjs(value);
  return parsedDate.isValid() ? Timestamp.fromDate(parsedDate.toDate()) : null;
};

function SetUser({ user, onSave }) {
  const [userState, setUserState] = useState(() => normalizeUser(user));
  const [open, setOpen] = useState(false);
  const handleOpen = () => {
    setUserState(normalizeUser(user));
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const [openBackdrop, setOpenBackDrop] = useState(false);

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (!open) {
      setUserState(normalizeUser(user));
    }
  }, [user, open]);


  const handleCloseBackDrop = () => {
    setOpenBackDrop(false);
  };
  const handleOpenBackDrop = () => {
    setOpenBackDrop(true);
  };


  const handleSubmit = (event) => {
    event.preventDefault();

    const updatedUser = {
      ...userState,
      dni: userState.dni.trim(),
      email: userState.email.trim(),
      name: userState.name.trim(),
      phone: userState.phone.trim(),
    };

    if (!updatedUser.email || !emailRegex.test(updatedUser.email)) {
      showSnackbar('Ingrese un email válido', 'error');
      return;
    }

    handleOpenBackDrop();
    const userData = { ...updatedUser };
    delete userData.id;
    UserService.update(userData.uid, userData).then(() => {
      onSave(updatedUser);
      handleClose();
      handleCloseBackDrop();
      showSnackbar('Datos del usuario guardados correctamente', 'success');
    }).catch(() => {
      handleCloseBackDrop();
      showSnackbar('Error al guardar los datos del usuario', 'error');
    });
  };

  return (
    <div>
      <Button fullWidth variant="outlined" startIcon={<EditIcon />} sx={{ width: "100%" }} onClick={handleOpen}>Editar datos</Button>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          id="modal-modal-title"
          sx={{
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 1.5,
            px: 3,
            py: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} noWrap>
              Datos personales
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {userState.name || 'Usuario'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box
            component="form"
            id="edit-user-form"
            onSubmit={handleSubmit}
            sx={{
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'grey.50',
              p: 3,
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Nombre completo"
                  value={userState.name}
                  onChange={(event) => setUserState({
                    ...userState,
                    name: event.target.value,
                  })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="DNI"
                  value={userState.dni}
                  onChange={(event) => setUserState({
                    ...userState,
                    dni: event.target.value,
                  })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="email"
                  required
                  label="Email"
                  value={userState.email}
                  onChange={(event) => setUserState({
                    ...userState,
                    email: event.target.value,
                  })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Número telefónico"
                  value={userState.phone}
                  onChange={(event) => setUserState({
                    ...userState,
                    phone: event.target.value,
                  })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider adapterLocale="es" dateAdapter={AdapterDayjs}>
                  <DatePicker
                    format="LL"
                    label="Fecha de nacimiento"
                    maxDate={today}
                    value={toDayjs(userState.birthday)}
                    onChange={(newDate) => setUserState({
                      ...userState,
                      birthday: toTimestamp(newDate),
                    })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider adapterLocale="es" dateAdapter={AdapterDayjs}>
                  <DatePicker
                    format="LL"
                    label="Suscripción hasta"
                    value={toDayjs(userState.until)}
                    onChange={(newDate) => setUserState({
                      ...userState,
                      until: toTimestamp(newDate),
                    })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          </Box>
          <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={openBackdrop}>
            <CircularProgress color="inherit" />
          </Backdrop>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={openBackdrop}>Cancelar</Button>
          <Button
            type="submit"
            form="edit-user-form"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={openBackdrop}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default SetUser;
