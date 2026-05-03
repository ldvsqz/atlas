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
    "exerciseIds": ["exerciseIdC", "exerciseIdD"]
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
