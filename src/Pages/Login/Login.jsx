import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithEmailAndPassword, signInWithGoogle } from "../../../Firebase/authFunctions";
import { TextField, Button, Typography, Container, ListItemIcon } from '@mui/material';
import { useAuthState } from "react-firebase-hooks/auth";
import UserService from '../../../Firebase/userService'
import "./Login.css";
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';
import Divider from '@mui/material/Divider';
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';


function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, loading, error] = useAuthState(auth);
  const [loadingCircle, setLoadingCircle] = useState(false);
  const [openSnack, setOpen] = useState(false);
  const navigate = useNavigate();

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    setLoadingCircle(true);
    if (user) {
      UserService.get(user.uid).then(userData => {
        if (!!userData) {
          const uid = user.uid;
          localStorage.setItem('UID', uid);
          localStorage.setItem('ROL', userData.rol);
          setLoadingCircle(false);
          
          // Redirigir a la última ruta guardada, o a /users por defecto
          const lastRoute = localStorage.getItem('LAST_ROUTE');
          const redirectPath = lastRoute || '/users';
          navigate(redirectPath, { state: { uid } });
        }
      }).catch(error => {
        setLoadingCircle(false);
        showSnackbar('Error al obtener datos del usuario', 'error');
      });
    } else {
      setLoadingCircle(false);
    }
  }, [user, loading]);



  return (
    <Container maxWidth="sm" sx={{ mt: 12 }}>
      {loadingCircle ? (
        <Backdrop sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loadingCircle}>
          <CircularProgress color="inherit" />
        </Backdrop>
      ) : (
        <div>
          <Typography variant="h4" align="center" gutterBottom>
            Inicio de sesión
          </Typography>
          <TextField
            label="Correo electrónico"
            type="email"
            placeholder="Correo electrónico"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Contraseña"
            placeholder="Contraseña"
            fullWidth
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button sx={{ mt: 2 }} type="submit" variant="contained" color="primary" fullWidth
            onClick={() => {
              setLoadingCircle(true);
              signInWithEmailAndPassword(auth, email, password)
                .catch(() => {
                  setLoadingCircle(false);
                  showSnackbar('Error al iniciar sesión. Verifique sus credenciales e intente nuevamente.', 'error');
                })
            }
            }
          >
            Iniciar sesión
          </Button>
          <Typography variant="body1" align="center" gutterBottom>
            <Link to="/reset">Recuperar contraseña</Link>
          </Typography>
          
          <br />
          <Divider/>
          <br />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}
            onClick={() => {
              setLoadingCircle(true);
              signInWithGoogle().then((user) => {
                setLoadingCircle(false);
              })
                .catch(() => {
                  setLoadingCircle(false);
                  showSnackbar('Error al iniciar sesión con Google', 'error');
                })
            }}>
            <ListItemIcon>
              <GoogleIcon />
            </ListItemIcon>
            Continua con Google
          </Button>
          <br />
          <br />
            <Typography variant="body1" align="center" gutterBottom>
              ¿No tienes cuenta? <Link to="/register">Registrar</Link>.
            </Typography>
        </div>
      )}

    </Container >
  );
}
export default Login;
