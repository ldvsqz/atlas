import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TextField, Button, Typography, Container } from '@mui/material';
import { registerWithEmailAndPassword } from "./../../../Firebase/authFunctions";
import "./Register.css";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Timestamp } from 'firebase/firestore';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';

const today = dayjs();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getRegisterErrorMessage = (error) => {
  switch (error?.code) {
    case 'app/dni-already-exists':
      return 'Ya existe un perfil registrado con ese DNI.';
    case 'app/email-already-exists':
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con ese correo.';
    case 'auth/invalid-email':
      return 'Ingrese un correo electrónico válido.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'app/profile-create-failed':
      return 'No se pudo crear el perfil. Intente nuevamente.';
    default:
      return 'Error al registrar el usuario. Intente nuevamente.';
  }
};

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState(null);
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [openBackdrop, setOpenBackDrop] = useState(false);
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const validateForm = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!dni.trim()) {
      showSnackbar('Ingrese el número de cédula.', 'error');
      return false;
    }

    if (!name.trim()) {
      showSnackbar('Ingrese el nombre completo.', 'error');
      return false;
    }

    if (!birthday || !birthday.isValid() || birthday.isAfter(today, 'day')) {
      showSnackbar('Ingrese una fecha de nacimiento válida.', 'error');
      return false;
    }

    if (!phone.trim()) {
      showSnackbar('Ingrese el número de teléfono.', 'error');
      return false;
    }

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      showSnackbar('Ingrese un correo electrónico válido.', 'error');
      return false;
    }

    if (!password || password.length < 6) {
      showSnackbar('La contraseña debe tener al menos 6 caracteres.', 'error');
      return false;
    }

    return true;
  };

  const register = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setOpenBackDrop(true);

    try {
      const birthdayTimestamp = Timestamp.fromDate(birthday.toDate());
      const createdUser = await registerWithEmailAndPassword(
        dni,
        birthdayTimestamp,
        phone,
        name,
        email,
        password,
      );

      localStorage.setItem('UID', createdUser.uid);
      localStorage.setItem('ROL', createdUser.rol);
      showSnackbar('Usuario registrado correctamente.', 'success');
      navigate(`/user/${createdUser.uid}`, { state: { uid: createdUser.uid } });
    } catch (error) {
      showSnackbar(getRegisterErrorMessage(error), 'error');
    } finally {
      setOpenBackDrop(false);
    }
  };

  return (
    <Container component="form" maxWidth="sm" sx={{ mt: 12 }} onSubmit={register}>
      <Typography variant="h4" align="center" gutterBottom>
        Atlas
      </Typography>
      <TextField
        label="Número de cédula"
        fullWidth
        margin="normal"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
        placeholder="Número de cédula"
        disabled={openBackdrop}
        required
      />
      <TextField
        label="Nombre completo"
        fullWidth
        margin="normal"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre completo"
        disabled={openBackdrop}
        required
      />
      <LocalizationProvider adapterLocale="es" dateAdapter={AdapterDayjs}>
        <DatePicker
          format="LL"
          label="Fecha de nacimiento"
          maxDate={today}
          value={birthday}
          onChange={(newDate) => setBirthday(newDate)}
          disabled={openBackdrop}
          slotProps={{
            textField: {
              fullWidth: true,
              margin: 'normal',
              required: true,
            },
          }}
        />
      </LocalizationProvider>
      <TextField
        label="Número de teléfono"
        fullWidth
        margin="normal"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Número de teléfono"
        disabled={openBackdrop}
        required
      />
      <TextField
        label="Correo electrónico"
        type="email"
        fullWidth
        margin="normal"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Correo electrónico"
        disabled={openBackdrop}
        required
      />
      <TextField
        type="password"
        label="Contraseña"
        fullWidth
        margin="normal"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        disabled={openBackdrop}
        required
      />
      <Button variant="contained" color="primary" fullWidth type="submit" disabled={openBackdrop}>
        Registrarse
      </Button>
      <Typography variant="body1" align="center" gutterBottom>
        ¿Ya tienes cuenta? <Link to="/">Iniciar sesión</Link>.
      </Typography>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={openBackdrop}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Container>
  );
}
export default Register;
