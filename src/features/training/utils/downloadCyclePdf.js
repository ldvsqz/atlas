import TrainingService from '../../../../Firebase/trainingService';
import GymLayoutService from '../../../../Firebase/gymLayoutService';
import { BLOCK_LABELS, CYCLE_LABELS, normalizeFirestoreDate } from '../models/trainingModels';
import { buildCircuitDetailsMap } from '../public/circuitLayoutUtils';
import { drawGymLayoutGrid, splitText } from '../../gymLayout/utils/downloadGymLayoutPdf';

const NOTES_COLUMN_WIDTH = 80;
const CIRCUIT_COLUMN_WIDTH = 120;
const NOTES_CELL_PADDING = 3;
const NOTES_TITLE_HEIGHT = 4;
const NOTES_LINE_HEIGHT = 3.4;
const NOTES_SECTION_GAP = 3;
const CIRCUIT_CELL_HEIGHT = 160;

const getCombinedNoteSections = (day, circuitDetails) => {
  const notes = [];
  const hasLinkedCircuit = Boolean(day.mainBlock?.gymLayoutId);
  const circuitNotes = circuitDetails?.layout?.listNotes?.trim();
  const stationExercises = (circuitDetails?.stations || circuitDetails?.exercises || [])
    .filter(Boolean)
    .map((exercise, index) => {
      const name = exercise?.name?.trim();
      const description = exercise?.description?.trim();
      if (!name) return null;
      return `${index + 1}. ${name}${description ? `\n- ${description}` : ''}`;
    })
    .filter(Boolean);

  if (day.shadowBlock?.notes?.trim()) {
    notes.push({ title: BLOCK_LABELS.shadowBlock, text: day.shadowBlock.notes.trim() });
  }

  if (hasLinkedCircuit) {
    if (stationExercises.length) {
      notes.push({ title: 'Orden del circuito', text: stationExercises.join('\n\n') });
    }

    if (circuitNotes) {
      notes.push({ title: 'Circuito', text: circuitNotes });
    }
  } else if (day.mainBlock?.notes?.trim()) {
    notes.push({ title: BLOCK_LABELS.mainBlock, text: day.mainBlock.notes.trim() });
  }

  if (day.extraBlock?.notes?.trim()) {
    notes.push({ title: BLOCK_LABELS.extraBlock, text: day.extraBlock.notes.trim() });
  }

  return notes;
};

const getLinkedLayoutIds = (days = []) => [...new Set(
  days
    .map((day) => day.mainBlock?.gymLayoutId)
    .filter(Boolean)
)];

const loadCircuitDetails = async (days = []) => {
  const linkedLayoutIds = getLinkedLayoutIds(days);
  if (!linkedLayoutIds.length) return {};

  const [layouts, gymExercises] = await Promise.all([
    Promise.all(linkedLayoutIds.map((layoutId) => GymLayoutService.getLayout(layoutId))),
    GymLayoutService.getExercises(),
  ]);

  return buildCircuitDetailsMap({ layouts, exercises: gymExercises });
};

const countNotes = (days = [], circuitDetails = {}) =>
  days.reduce(
    (total, day) => {
      const details = circuitDetails[day.mainBlock?.gymLayoutId];
      const hasLinkedCircuit = Boolean(day.mainBlock?.gymLayoutId);
      const linkedCircuitNotes = hasLinkedCircuit && (
        details?.layout?.listNotes?.trim()
        || details?.stations?.length
        || details?.exercises?.length
      );

      return total
        + (day.shadowBlock?.notes?.trim() ? 1 : 0)
        + (hasLinkedCircuit ? (linkedCircuitNotes ? 1 : 0) : (day.mainBlock?.notes?.trim() ? 1 : 0))
        + (day.extraBlock?.notes?.trim() ? 1 : 0);
    },
    0
  );

const countLinkedLayouts = (days = []) =>
  days.filter((day) => day.mainBlock?.gymLayoutId).length;

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

const getNotesCellHeight = (doc, noteSections = [], width = NOTES_COLUMN_WIDTH) => {
  if (!noteSections.length) return 0;

  const maxWidth = width - NOTES_CELL_PADDING * 2;
  const contentHeight = noteSections.reduce((height, section, index) => {
    const lines = splitText(doc, section.text, maxWidth);
    return height
      + NOTES_TITLE_HEIGHT
      + lines.length * NOTES_LINE_HEIGHT
      + (index === noteSections.length - 1 ? 0 : NOTES_SECTION_GAP);
  }, 0);

  return Math.ceil(contentHeight + NOTES_CELL_PADDING * 2 + 2);
};

const buildWeekRows = (weekDays = [], circuitDetails = {}, doc) =>
  weekDays.map((day) => {
    const details = circuitDetails[day.mainBlock?.gymLayoutId];
    const noteSections = getCombinedNoteSections(day, details);
    const notesMinHeight = getNotesCellHeight(doc, noteSections);
    const hasLinkedCircuit = Boolean(day.mainBlock?.gymLayoutId);
    const circuitName = day.mainBlock?.gymLayoutName || details?.layout?.name || 'Circuito vinculado';
    const circuitCell = details?.layout
      ? {
        content: '',
        circuitGrid: { day, details },
        styles: {
          minCellHeight: CIRCUIT_CELL_HEIGHT,
          cellPadding: 2,
          fillColor: [255, 255, 255],
        },
      }
      : (hasLinkedCircuit ? `Circuito: ${circuitName}\nGrid no disponible` : 'sin circuito');

    return [
      {
        content: noteSections.length ? '' : 'Sin notas',
        noteSections,
        styles: noteSections.length
          ? {
            minCellHeight: notesMinHeight,
            cellPadding: NOTES_CELL_PADDING,
          }
          : {},
      },
      circuitCell,
    ];
  });

const drawNotesCell = (doc, cell, noteSections = []) => {
  if (!noteSections.length) return;

  const padding = NOTES_CELL_PADDING;
  const maxWidth = cell.width - padding * 2;
  let y = cell.y + padding + 2;

  noteSections.forEach((section, index) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);
    doc.text(`${section.title}:`, cell.x + padding, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const lines = splitText(doc, section.text, maxWidth);
    doc.text(lines, cell.x + padding, y);
    y += lines.length * NOTES_LINE_HEIGHT + (index === noteSections.length - 1 ? 0 : NOTES_SECTION_GAP);
  });
};

const drawCircuitGridCell = (doc, cell, { day, details }) => {
  const layout = details?.layout;
  if (!layout) return;

  const padding = 3;
  const cols = layout.cols || 3;
  const rows = layout.rows || 6;
  const titleY = cell.y + padding + 3;
  const titleHeight = 9;
  const maxGridWidth = cell.width - padding * 2;
  const maxGridHeight = cell.height - titleHeight - padding * 2;
  const cellSize = Math.min(23, maxGridWidth / cols, maxGridHeight / rows);
  const gridWidth = cellSize * cols;
  const gridX = cell.x + (cell.width - gridWidth) / 2;
  const gridY = cell.y + padding + titleHeight;
  const circuitName = day.mainBlock?.gymLayoutName || layout.name || 'Circuito vinculado';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(17, 24, 39);
  doc.text(splitText(doc, circuitName, cell.width - padding * 2), cell.x + padding, titleY);

  drawGymLayoutGrid({
    doc,
    layout,
    exercises: details.exercises || details.stations || [],
    x: gridX,
    y: gridY,
    cellSize,
    fontSize: 6,
    reservedFontSize: 5.5,
    lineWidth: 0.25,
    textPadding: 2,
    textYOffset: 6,
  });
};

export const downloadCyclePdf = async (cycle, exercises, providedDays = null, providedCircuitDetails = null) => {
  const [{ default: jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF();
  const createdAt = normalizeFirestoreDate(cycle.createdAt);

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(12);
  doc.text(cycle.name || 'Ciclo de entrenamiento', 14, 12);

  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(
    `${CYCLE_LABELS[cycle.type] || cycle.type} · ${cycle.weeks || 1} microciclo${Number(cycle.weeks) === 1 ? '' : 's'} · Creado: ${createdAt?.isValid() ? createdAt.format('DD/MM/YYYY') : 'Sin fecha'}`,
    14,
    18
  );

  autoTable(doc, {
    startY: 22,
    theme: 'plain',
    body: [[cycle.description || 'Sin descripción']],
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [31, 41, 55] },
    bodyStyles: { fillColor: [249, 250, 251] },
  });

  const descriptionTable = doc.lastAutoTable;
  const days = providedDays || await TrainingService.getCycleDays(cycle.id, cycle.weeks);
  const circuitDetails = providedCircuitDetails || await loadCircuitDetails(days);
  let nextY = (descriptionTable?.finalY || 40) + 8;

  autoTable(doc, {
    startY: nextY,
    theme: 'grid',
    body: [[
      `${Object.keys(groupDaysByWeek(days)).length || 1}\nSemanas`,
      `${days.length}\nSesiones`,
      `${countNotes(days, circuitDetails)}\nNotas`,
      `${countLinkedLayouts(days)}\nCircuitos vinculados`,
    ]],
    styles: { fontSize: 7.5, cellPadding: 2, halign: 'center', valign: 'middle' },
    bodyStyles: { fillColor: [236, 253, 245], textColor: [6, 78, 59], fontStyle: 'bold' },
  });

  nextY = (doc.lastAutoTable?.finalY || nextY) + 7;

  if (days.length) {
    const groupedDays = groupDaysByWeek(days);
    const sessions = Object.entries(groupedDays).flatMap(([weekIndex, weekDays]) =>
      weekDays.map((day) => ({ weekIndex, day }))
    );

    sessions.forEach(({ weekIndex, day }, index) => {
      const sessionStartY = index === 0 ? nextY : 22;
      if (index > 0) {
        doc.addPage();
      }

      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(`Microciclo ${weekIndex} · ${day.name || `Día ${day.dayIndex}`} - dia ${day.dayOfWeek || day.dayIndex}`, 14, sessionStartY);

      autoTable(doc, {
        startY: sessionStartY + 6,
        theme: 'grid',
        head: [['Notas', 'Circuito']],
        body: buildWeekRows([day], circuitDetails, doc),
        rowPageBreak: 'avoid',
        pageBreak: 'auto',
        styles: { fontSize: 8.5, cellPadding: 3, valign: 'top', textColor: [31, 41, 55], lineColor: [226, 232, 240], overflow: 'linebreak' },
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: NOTES_COLUMN_WIDTH },
          1: { cellWidth: CIRCUIT_COLUMN_WIDTH, halign: 'center' },
        },
        didDrawCell: (data) => {
          if (data.cell.raw?.noteSections) {
            drawNotesCell(doc, data.cell, data.cell.raw.noteSections);
          }

          if (data.cell.raw?.circuitGrid) {
            drawCircuitGridCell(doc, data.cell, data.cell.raw.circuitGrid);
          }
        },
      });
    });

    nextY = doc.lastAutoTable?.finalY || 22;
  } else {
    doc.setFontSize(11);
    doc.text('Este ciclo no tiene días editables todavía.', 14, nextY);
    nextY += 10;
  }
  doc.save(`${sanitizeFileName(cycle.name)}.pdf`);
};
