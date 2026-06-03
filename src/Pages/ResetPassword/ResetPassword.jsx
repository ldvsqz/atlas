import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { Link, useNavigate } from "react-router-dom";
import { auth, sendPasswordReset } from "../../../Firebase/authFunctions";
import { TextField, Button, Typography, Container, Backdrop, CircularProgress } from '@mui/material';
import "./ResetPassword.css";
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resetSuccessMessage = 'Si el correo está registrado, recibirás instrucciones para recuperar la contraseña.';

const getResetErrorMessage = (error) => {
  switch (error?.code) {
    case 'auth/too-many-requests':
      return 'Se realizaron demasiados intentos. Intente nuevamente más tarde.';
    case 'auth/network-request-failed':
      return 'No se pudo conectar con el servicio. Revise su conexión e intente nuevamente.';
    default:
      return 'No se pudo solicitar la recuperación. Intente nuevamente.';
  }
};

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (loading) return;
    if (user) navigate(`/user/${user.uid}`, { state: { uid: user.uid } });
  }, [user, loading, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      showSnackbar('Ingrese un correo electrónico válido.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await sendPasswordReset(normalizedEmail);
      showSnackbar(resetSuccessMessage, 'success');
    } catch (error) {
      if (error?.code === 'auth/user-not-found') {
        showSnackbar(resetSuccessMessage, 'success');
      } else {
        showSnackbar(getResetErrorMessage(error), 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="form" maxWidth="sm" sx={{ mt: 12 }} onSubmit={handleSubmit}>
      <Typography variant="h4" align="center" gutterBottom>
        Atlas
      </Typography>
      <TextField
        label="Correo electrónico"
        type="email"
        placeholder="Correo electrónico"
        fullWidth
        margin="normal"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isSubmitting}
        required
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 2 }}
        disabled={isSubmitting}
      >
        Enviar correo de recuperación
      </Button>
      <Typography variant="body1" align="center" gutterBottom>
        <Link to="/">Iniciar sesión</Link>
      </Typography>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={isSubmitting}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Container>
  );
}
export default ResetPassword;
