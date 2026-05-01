import React, { useState, useEffect } from 'react';
import StatsService from '../../../Firebase/statsService';
import StatsModel from '../../models/StatsModel'
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Timestamp } from 'firebase/firestore';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import Util from '../../assets/Util';
import './SetStats.css';


function SetStats({ stats = new StatsModel(), uid = '', isEditing = false, onSave }) {
  const [statsState, setStatsState] = useState(new StatsModel());
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const util = new Util();

  useEffect(() => {
    if (!!stats) {
      setStatsState(stats)
    } else {
      const stats = new StatsModel();
      stats.uid = uid;
      setStatsState(stats)
    }
  }, []);

  useEffect(() => {
    const weight = parseFloat(statsState.weight_kg) || 0;
    const height = parseFloat(statsState.Height_cm) || 0;

    if (weight > 0 && height > 0) {
      const newIMC = util.calculateIMC(weight, height);
      setStatsState(prevState => ({
        ...prevState,
        IMC: newIMC,
      }));
    }
  }, [statsState.weight_kg, statsState.Height_cm]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const updatedStats = { ...statsState };
    updatedStats.weight_kg = updatedStats.weight_kg ? updatedStats.weight_kg : 0.00;
    updatedStats.weight_kg_end = updatedStats.weight_kg_end ? updatedStats.weight_kg_end : 0.00;
    updatedStats.Height_cm = updatedStats.Height_cm ? updatedStats.Height_cm : 0;
    updatedStats.considerations.recent_surgeries = updatedStats.considerations.recent_surgeries ? updatedStats.considerations.recent_surgeries : 'Ninguna';
    updatedStats.considerations.risks_factors = updatedStats.considerations.risks_factors ? updatedStats.considerations.risks_factors : 'Ninguna';
    handleClose();
    if (isEditing) {
      StatsService.update(updatedStats.id, updatedStats);
    } else {
      updatedStats.date = Timestamp.fromDate(new Date());
      StatsService.add(updatedStats);
    }
    onSave(updatedStats);
  };


  return (
    <>
      <Button fullwidth variant="outlined" onClick={handleOpen}>
        {isEditing ? 'Editar ultimas medidas' : 'Agregar nuevas medidas'}
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <DialogTitle id="alert-dialog-title">
          {isEditing ? 'Medidas actuales' : 'Nuevas medidas'}
        </DialogTitle>
        <DialogContent>
          {/* Form fields for stats input 
          <Typography variant="h6" gutterBottom>
            Hábitos
          </Typography>
          <FormControl sx={{ m: 3 }}>
            <Grid container sx={{ color: 'text.primary' }}>
              <Grid item sx={{ mt: 2, marginLeft: '15px' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={statsState.habits.smoke}
                      onChange={(event) =>
                        setStatsState({
                          ...statsState,
                          habits: { ...statsState.habits, smoke: event.target.checked },
                        })
                      }
                    />
                  }
                  label="Fuma"
                />
              </Grid>
              <Grid item sx={{ mt: 2, marginLeft: '15px' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={statsState.habits.drink}
                      onChange={(event) =>
                        setStatsState({
                          ...statsState,
                          habits: { ...statsState.habits, drink: event.target.checked },
                        })
                      }
                    />
                  }
                  label="Bebe"
                />
              </Grid>
              <Grid item sx={{ mt: 2, marginLeft: '15px' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={statsState.habits.running}
                      onChange={(event) =>
                        setStatsState({
                          ...statsState,
                          habits: { ...statsState.habits, running: event.target.checked },
                        })
                      }
                    />
                  }
                  label="Corre"
                />
              </Grid>. 
              <Grid item sx={{ mt: 2, marginLeft: '15px' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={statsState.habits.lifting}
                      onChange={(event) =>
                        setStatsState({
                          ...statsState,
                          habits: { ...statsState.habits, lifting: event.target.checked },
                        })
                      }
                    />
                  }
                  label="Pesas"
                />
              </Grid>
            </Grid>
          </FormControl>
          */}

          <Typography variant="h6" gutterBottom>
            Consideraciones
          </Typography>
          <Grid container sx={{ color: 'text.primary' }}>
            {/*
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Cirugías recientes" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                type="text"
                value={statsState.considerations.recent_surgeries}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    considerations: { ...statsState.considerations, recent_surgeries: event.target.value },
                  })
                }
              />
            </Grid>
            */}
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Factores de riesgo" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                type="text"
                value={statsState.considerations?.risks_factors || ''}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    considerations: { ...statsState.considerations, risks_factors: event.target.value },
                  })
                }
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Medidas
          </Typography>
          <Grid container sx={{ color: 'text.primary' }}>
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Peso base kg" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.weight_kg}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    weight_kg: event.target.value,
                  })
                }
              />
            </Grid>

            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Peso salida kg" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.weight_kg_end}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    weight_kg_end: event.target.value,
                  })
                }
              />
            </Grid>


            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Estatura cm" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.Height_cm}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    Height_cm: event.target.value,
                  })
                }
              />
            </Grid>

            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="IMC" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.IMC || '0.00'}
                disabled
                inputProps={{ readOnly: true }}
              />
            </Grid>
            {/* 
            
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Grasa corp %" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.body_fat}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    body_fat: event.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Músculo %" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.muscle}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    muscle: event.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Grasa viceral %" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.visceral_fat}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    visceral_fat: event.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Edad metabólica" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.metabolic_age}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    metabolic_age: event.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Kcal" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.kcal}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    kcal: event.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Pecho/espalda cm" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.chest_back_cm}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    chest_back_cm: event.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Cintura cm" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.waist_cm}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    waist_cm: event.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Cadera cm" variant="standard" sx={{ maxWidth: '90%', padding: '10px' }}
                value={statsState.hip_cm}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    hip_cm: event.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Brazo izq cm" variant="standard" sx={{ maxWidth: '40%', padding: '10px' }}
                value={statsState.l_amr_cm}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    l_amr_cm: event.target.value,
                    r_amr_cm: event.target.value,
                  })
                }
              />
              <TextField id="standard-basic" label="Brazo der cm" variant="standard" sx={{ maxWidth: '40%', padding: '10px' }}
                value={statsState.r_amr_cm}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    r_amr_cm: event.target.value,
                  })
                }
              />
            </Grid>

            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Pierna izq cm" variant="standard" sx={{ maxWidth: '40%', padding: '10px' }}
                value={statsState.l_quad_cm}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    l_quad_cm: event.target.value,
                    r_quad_cm: event.target.value,
                  })
                }
              /><TextField id="standard-basic" label="Pierna der cm" variant="standard" sx={{ maxWidth: '40%', padding: '10px' }}
                value={statsState.r_quad_cm}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    r_quad_cm: event.target.value,
                  })
                }
              />
            </Grid>

            <Grid item xs={6} sx={{ mt: 2 }}>
              <TextField id="standard-basic" label="Pant. izq cm" variant="standard" sx={{ maxWidth: '40%', padding: '10px' }}
                value={statsState.l_calf_cm}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    l_calf_cm: event.target.value,
                    r_calf_cm: event.target.value,
                  })
                }
              />
              <TextField id="standard-basic" label="Pant. der cm" variant="standard" sx={{ maxWidth: '40%', padding: '10px' }}
                value={statsState.r_calf_cm}
                onChange={(event) =>
                  setStatsState({
                    ...statsState,
                    r_calf_cm: event.target.value,
                  })
                }
              />
            </Grid>
            */}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogActions>
      </Dialog>

    </>
  );

}

export default SetStats;
