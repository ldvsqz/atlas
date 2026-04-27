import React, { useState, useEffect } from 'react';
import UserService from '../../../Firebase/userService';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
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
import { Timestamp } from 'firebase/firestore';
import 'dayjs/locale/es';
import dayjs from 'dayjs';
import "./user.css";
import UserModel from '../../models/UserModel';
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';



const today = dayjs();

function SetUser({ user, onSave }) {
  const [userState, setUserState] = useState(user);
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [openBackdrop, setOpenBackDrop] = useState(false);

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    setUserState(userState)
  }, []);


  const handleCloseBackDrop = () => {
    setOpenBackDrop(false);
  };
  const handleOpenBackDrop = () => {
    setOpenBackDrop(true);
  };


  const handleSubmit = (event) => {
    handleOpenBackDrop();
    event.preventDefault();
    const updatedUser = new UserModel(userState.birthday, userState.dni, userState.email, userState.name, userState.phone, userState.uid, userState.until);
    UserService.update(updatedUser.uid, updatedUser).then(() => {
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
      <Button sx={{ width: "100%" }} onClick={handleOpen}>Editar datos</Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <DialogTitle>
          {"Datos personales"}
        </DialogTitle>
        <DialogContent>
          <Grid container sx={{ color: 'text.primary' }}>
            <Grid item xs={12} mt={2}>
              <TextField id="standard-basic" label="Nombre completo" variant="standard"
                value={userState.name}
                onChange={(event) => setUserState(
                  {
                    ...userState,
                    name: event.target.value,
                  }
                )} />
            </Grid>
            <Grid item xs={12} mt={2}>
              <TextField id="standard-basic" label="Número telefónico" variant="standard"
                value={userState.phone}
                onChange={(event) => setUserState(
                  {
                    ...userState,
                    phone: event.target.value,
                  }
                )} />
            </Grid>
            <Grid item xs={12} mt={2}>
              <LocalizationProvider
                adapterLocale="es-ES"
                dateAdapter={AdapterDayjs}>
                <DatePicker
                  format="LL"
                  label="Fecha de nacimiento"
                  maxDate={today}
                  onChange={(newDate) => {
                    setUserState(
                    {
                      ...userState,
                      birthday: Timestamp.fromDate(new Date(newDate)),
                    }
                  )}} />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} mt={2}>
              <LocalizationProvider
                adapterLocale="es-ES"
                dateAdapter={AdapterDayjs}>
                <DatePicker
                  format="LL"
                  label="Suscripción hasta"
                  onChange={(newDate) => setUserState(
                    {
                      ...userState,
                      until: Timestamp.fromDate(new Date(newDate)),
                    }
                  )} />
              </LocalizationProvider>
            </Grid>
          </Grid>
          <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={openBackdrop}>
            <CircularProgress color="inherit" />
          </Backdrop>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default SetUser;
