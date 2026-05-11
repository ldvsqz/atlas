import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import TrainingService from '../../../../Firebase/trainingService';
import { BLOCK_LABELS, CYCLE_LABELS, normalizeFirestoreDate } from '../models/trainingModels';

const getExerciseName = (exerciseId, exerciseMap) => {
  const exercise = exerciseMap.get(exerciseId);
  if (!exercise) return `Ejercicio no encontrado (${exerciseId})`;
  return exercise.name;
};

const formatBlock = (block, exerciseMap) => {
  const exerciseIds = block?.exerciseIds || [];
  if (!exerciseIds.length) return 'Sin ejercicios';
  return exerciseIds.map((exerciseId) => getExerciseName(exerciseId, exerciseMap)).join('\n');
};

const formatNotes = (block) => block?.notes?.trim() || 'Sin notas';

const groupDaysByWeek = (days) =>
  days.reduce((groups, day) => {
    const weekIndex = day.weekIndex || 1;
    return {
      ...groups,
      [weekIndex]: [...(groups[weekIndex] || []), day].sort((a, b) => (a.dayOfWeek || 0) - (b.dayOfWeek || 0)),
    };
  }, {});

const sanitizeFileName = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ciclo';

export const downloadCyclePdf = async (cycle, exercises, providedDays = null) => {
  const doc = new jsPDF();
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const createdAt = normalizeFirestoreDate(cycle.createdAt);

  doc.setFontSize(14);
  doc.text(cycle.name || 'Ciclo de entrenamiento', 14, 16);

  doc.setFontSize(9);
  doc.text(`Tipo: ${CYCLE_LABELS[cycle.type] || cycle.type}`, 14, 26);
  doc.text(`Creado: ${createdAt?.isValid() ? createdAt.format('DD/MM/YYYY') : 'Sin fecha'}`, 14, 31);

  autoTable(doc, {
    startY: 46,
    theme: 'grid',
    head: [['Descripción']],
    body: [[cycle.description || 'Sin descripción']],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [69, 90, 100] },
  });

  const descriptionTable = doc.lastAutoTable;
  const nextY = (descriptionTable?.finalY || 46) + 10;

  const days = providedDays || await TrainingService.getCycleDays(cycle.id, cycle.weeks);

  if (days.length) {
    const groupedDays = groupDaysByWeek(days);
    let tableStartY = nextY;

    doc.setFontSize(13);
    doc.text('Días del ciclo', 14, tableStartY);
    tableStartY += 8;

    Object.entries(groupedDays).forEach(([weekIndex, weekDays]) => {
      if (tableStartY > 260) {
        doc.addPage();
        tableStartY = 16;
      }

      doc.setFontSize(11);
      doc.text(`Semana ${weekIndex}`, 14, tableStartY);

      autoTable(doc, {
        startY: tableStartY + 4,
        theme: 'grid',
        head: [['Día', BLOCK_LABELS.shadowBlock, BLOCK_LABELS.mainBlock, BLOCK_LABELS.extraBlock]],
        body: weekDays.map((day) => [
          day.name || `Día ${day.dayIndex}`,
          `${formatBlock(day.shadowBlock, exerciseMap)}\nNotas: ${formatNotes(day.shadowBlock)}`,
          `${formatBlock(day.mainBlock, exerciseMap)}\nNotas: ${formatNotes(day.mainBlock)}`,
          `${formatBlock(day.extraBlock, exerciseMap)}\nNotas: ${formatNotes(day.extraBlock)}`,
        ]),
        styles: { fontSize: 8, cellPadding: 2, valign: 'top' },
        headStyles: { fillColor: [69, 90, 100], fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 55 },
          2: { cellWidth: 58 },
          3: { cellWidth: 55 },
        },
      });

      tableStartY = (doc.lastAutoTable?.finalY || tableStartY) + 10;
    });
  } else {
    doc.setFontSize(11);
    doc.text('Este ciclo no tiene días editables todavía.', 14, nextY);
  }

  doc.save(`${sanitizeFileName(cycle.name)}.pdf`);
};
