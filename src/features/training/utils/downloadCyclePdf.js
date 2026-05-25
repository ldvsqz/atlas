import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import TrainingService from '../../../../Firebase/trainingService';
import { BLOCK_LABELS, CYCLE_LABELS, normalizeFirestoreDate } from '../models/trainingModels';

const formatNotes = (block) => block?.notes?.trim() || 'Sin notas';

const formatMainBlock = (block) => {
  const layoutName = block?.gymLayoutName?.trim();
  const lines = [];

  if (layoutName) {
    lines.push(`Circuito: ${layoutName}`);
  }

  lines.push(`Notas:\n${formatNotes(block)}`);

  return lines.join('\n\n');
};

const countNotes = (days = []) =>
  days.reduce(
    (total, day) =>
      total
      + (day.shadowBlock?.notes?.trim() ? 1 : 0)
      + (day.mainBlock?.notes?.trim() ? 1 : 0),
    0
  );

const countLinkedLayouts = (days = []) =>
  days.filter((day) => day.mainBlock?.gymLayoutId || day.mainBlock?.gymLayoutName).length;

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
  const createdAt = normalizeFirestoreDate(cycle.createdAt);

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(16);
  doc.text(cycle.name || 'Ciclo de entrenamiento', 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(`${CYCLE_LABELS[cycle.type] || cycle.type} · ${cycle.weeks || 1} microciclo${Number(cycle.weeks) === 1 ? '' : 's'}`, 14, 25);
  doc.text(`Creado: ${createdAt?.isValid() ? createdAt.format('DD/MM/YYYY') : 'Sin fecha'}`, 14, 30);

  autoTable(doc, {
    startY: 40,
    theme: 'plain',
    head: [['Descripción']],
    body: [[cycle.description || 'Sin descripción']],
    styles: { fontSize: 9, cellPadding: 3, textColor: [31, 41, 55] },
    headStyles: { fillColor: [241, 245, 249], textColor: [31, 41, 55], fontStyle: 'bold' },
    bodyStyles: { fillColor: [249, 250, 251] },
  });

  const descriptionTable = doc.lastAutoTable;
  const days = providedDays || await TrainingService.getCycleDays(cycle.id, cycle.weeks);
  let nextY = (descriptionTable?.finalY || 40) + 8;

  autoTable(doc, {
    startY: nextY,
    theme: 'grid',
    body: [[
      `${Object.keys(groupDaysByWeek(days)).length || 1}\nSemanas`,
      `${days.length}\nSesiones`,
      `${countNotes(days)}\nNotas`,
      `${countLinkedLayouts(days)}\nCircuitos vinculados`,
    ]],
    styles: { fontSize: 9, cellPadding: 3, halign: 'center', valign: 'middle' },
    bodyStyles: { fillColor: [236, 253, 245], textColor: [6, 78, 59], fontStyle: 'bold' },
  });

  nextY = (doc.lastAutoTable?.finalY || nextY) + 10;

  if (days.length) {
    const groupedDays = groupDaysByWeek(days);
    let tableStartY = nextY;

    Object.entries(groupedDays).forEach(([weekIndex, weekDays]) => {
      if (tableStartY > 260) {
        doc.addPage();
        tableStartY = 16;
      }

      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(`Microciclo ${weekIndex}`, 14, tableStartY);

      autoTable(doc, {
        startY: tableStartY + 4,
        theme: 'grid',
        head: [['Sesión', BLOCK_LABELS.shadowBlock, BLOCK_LABELS.mainBlock]],
        body: weekDays.map((day) => [
          `${day.name || `Día ${day.dayIndex}`}\nDía ${day.dayOfWeek || day.dayIndex}`,
          formatNotes(day.shadowBlock),
          formatMainBlock(day.mainBlock),
        ]),
        styles: { fontSize: 8.5, cellPadding: 3, valign: 'top', textColor: [31, 41, 55], lineColor: [226, 232, 240] },
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
          1: { cellWidth: 72 },
          2: { cellWidth: 82 },
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
