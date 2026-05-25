import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import {
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  getReservedCellsForGrid,
} from '../models/gymLayoutModels';

const getSafeFileName = (value) =>
  String(value || 'circuito-gimnasio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const splitText = (doc, text, maxWidth) => doc.splitTextToSize(String(text || ''), maxWidth);

const hexToRgb = (hex) => {
  const normalized = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [191, 219, 254];

  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
};

const softenColor = (hex) => {
  const [red, green, blue] = hexToRgb(hex);
  const mix = 0.76;
  return [
    Math.round(red * (1 - mix) + 255 * mix),
    Math.round(green * (1 - mix) + 255 * mix),
    Math.round(blue * (1 - mix) + 255 * mix),
  ];
};

export const downloadGymLayoutPdf = ({ layout, exercises = [], orderedExercises = [] }) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  const gridCell = 74;
  const gridX = margin;
  const gridY = 96;
  const gridWidth = DEFAULT_GRID_COLS * gridCell;
  const gridHeight = DEFAULT_GRID_ROWS * gridCell;
  const notesX = gridX + gridWidth + 28;
  const notesWidth = pageWidth - margin - notesX;
  const reservedCells = getReservedCellsForGrid(DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS);
  const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(layout.name || 'Circuito del gimnasio', margin, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Grid fijo ${DEFAULT_GRID_COLS} x ${DEFAULT_GRID_ROWS}`, margin, 66);

  doc.setDrawColor(190, 196, 207);
  doc.setLineWidth(0.8);

  for (let row = 0; row < DEFAULT_GRID_ROWS; row += 1) {
    for (let col = 0; col < DEFAULT_GRID_COLS; col += 1) {
      doc.rect(gridX + col * gridCell, gridY + row * gridCell, gridCell, gridCell);
    }
  }

  reservedCells.forEach((cell) => {
    const x = gridX + cell.x * gridCell;
    const y = gridY + cell.y * gridCell;
    doc.setFillColor(229, 231, 235);
    doc.rect(x, y, gridCell * cell.w, gridCell * cell.h, 'F');
    doc.setDrawColor(120, 130, 145);
    doc.rect(x, y, gridCell * cell.w, gridCell * cell.h);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(splitText(doc, cell.label, gridCell - 12), x + 6, y + 20);
  });

  layout.items.forEach((item) => {
    const exercise = exercisesById.get(item.exerciseId);
    if (!exercise) return;

    const x = gridX + item.x * gridCell;
    const y = gridY + item.y * gridCell;
    const width = item.w * gridCell;
    const height = item.h * gridCell;
    const color = softenColor(exercise.color);

    doc.setFillColor(...color);
    doc.setDrawColor(148, 163, 184);
    doc.rect(x, y, width, height, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text(splitText(doc, exercise.name, width - 12), x + 6, y + 18);
  });

  doc.setTextColor(20, 20, 20);
  doc.setDrawColor(190, 196, 207);
  doc.setFillColor(248, 250, 252);
  doc.rect(notesX, gridY, notesWidth, gridHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Notas de la lista', notesX + 10, gridY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    splitText(doc, layout.listNotes || 'Sin notas.', notesWidth - 20),
    notesX + 10,
    gridY + 38
  );

  doc.setTextColor(20, 20, 20);
  autoTable(doc, {
    startY: gridY + gridHeight + 34,
    head: [['#', 'Ejercicio', 'Descripcion']],
    body: orderedExercises.map((exercise, index) => [
      index + 1,
      exercise.name,
      exercise.description || '',
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 5,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: [40, 46, 56],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 120 },
      2: { cellWidth: (pageWidth - margin * 2 - 28 - 120) },
    },
    margin: { left: margin, right: margin },
  });

  doc.save(`${getSafeFileName(layout.name)}.pdf`);
};
