# Training Firestore examples

## exercises

```json
{
  "id": "exerciseId",
  "name": "Sentadilla trasera",
  "category": "Fuerza",
  "description": "Sentadilla con barra en espalda alta o baja.",
  "intensity": "Alta",
  "equipment": "Barra",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

## cycles

```json
{
  "id": "cycleId",
  "name": "Base competitiva 2026",
  "type": "macro",
  "description": "Trabajo anual de fuerza y acondicionamiento.",
  "weeks": 16,
  "parentCycleId": "",
  "startsAt": null,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

## cycles/{cycleId}/days/{week-day}

```json
{
  "weekIndex": 1,
  "dayOfWeek": 1,
  "dayIndex": 1,
  "name": "Día 1",
  "mainBlock": {
    "notes": "RPE 7-8.",
    "exerciseIds": ["exerciseIdC", "exerciseIdD"],
    "mainCircuit": {
      "laps": 2,
      "workMinutes": 3,
      "transitionMinutes": 1,
      "stations": [
        {
          "order": 1,
          "category": "Coordinación",
          "exerciseId": "gymExerciseIdA",
          "gridPosition": {
            "x": 2,
            "y": 0,
            "w": 1,
            "h": 2
          }
        },
        {
          "order": 2,
          "category": "Potencia y pliometría",
          "exerciseId": "gymExerciseIdB",
          "gridPosition": {
            "x": 1,
            "y": 1,
            "w": 1,
            "h": 1
          }
        },
        {
          "order": 3,
          "category": "Fuerza",
          "exerciseId": "gymExerciseIdC",
          "gridPosition": {
            "x": 0,
            "y": 2,
            "w": 2,
            "h": 2
          }
        },
        {
          "order": 4,
          "category": "Resistencia",
          "exerciseId": "gymExerciseIdD",
          "gridPosition": {
            "x": 2,
            "y": 3,
            "w": 1,
            "h": 1
          }
        },
        {
          "order": 5,
          "category": "Técnica",
          "exerciseId": "gymExerciseIdE",
          "gridPosition": {
            "x": 1,
            "y": 4,
            "w": 1,
            "h": 1
          }
        }
      ]
    }
  },
  "extraBlock": {
    "notes": "",
    "exerciseIds": []
  },
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Los bloques guardan `exerciseIds`, no copias del documento de ejercicio. Los días viven en subcolección para evitar documentos de ciclo gigantes. Cada ciclo crea `weeks * 5` documentos de día, agrupados por `weekIndex`. `warmupBlock` y `shadowBlock` no se guardan porque son ejercicios fijos; solo se muestran en la UI como parte del orden del día. `mainBlock` siempre representa "Bloque principal" y `extraBlock` siempre representa "Extra", por eso no guardan título.

## mainBlock.mainCircuit

El bloque principal debe guardarse como un circuito físico listo para renderizar en el Grid Builder:

- `laps` siempre debe ser `2`.
- Cada circuito debe tener exactamente `5` estaciones.
- Cada estación representa `3` minutos de trabajo y `1` minuto de transición.
- Cada estación debe tener exactamente un `exerciseId`.
- Los `exerciseId` de `mainCircuit` deben existir en `gymExercises`, porque esa colección contiene `width`, `height` y `category`.
- Cada ejercicio debe pertenecer a la categoría asignada a su estación.
- `gridPosition` usa el mismo formato del Grid Builder: `{ "x": 0, "y": 0, "w": 1, "h": 1 }`.
- `w` y `h` deben coincidir con `width` y `height` del ejercicio en `gymExercises`.
- Ninguna estación puede superponerse con otra estación o con zonas reservadas del grid.
- Todas las estaciones deben quedar dentro del tamaño del gimnasio.

Para construir o validar este objeto desde código, usar `buildMainCircuit` y `validateMainCircuit` en `src/features/training/utils/mainCircuitBuilder.js`.
