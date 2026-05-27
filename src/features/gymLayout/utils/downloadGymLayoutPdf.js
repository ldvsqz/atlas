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

export const splitText = (doc, text, maxWidth) => doc.splitTextToSize(String(text || ''), maxWidth);

const hexToRgb = (hex) => {
  const normalized = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [191, 219, 254];

  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
};

export const softenColor = (hex) => {
  const [red, green, blue] = hexToRgb(hex);
  const mix = 0.76;
  return [
    Math.round(red * (1 - mix) + 255 * mix),
    Math.round(green * (1 - mix) + 255 * mix),
    Math.round(blue * (1 - mix) + 255 * mix),
  ];
};

export const drawGymLayoutGrid = ({
  doc,
  layout,
  exercises = [],
  x,
  y,
  cellSize,
  fontSize = 9,
  reservedFontSize = fontSize,
  lineWidth = 0.8,
  textPadding = 6,
  textYOffset = 18,
}) => {
  const rows = layout?.rows || DEFAULT_GRID_ROWS;
  const cols = layout?.cols || DEFAULT_GRID_COLS;
  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;
  const reservedCells = getReservedCellsForGrid(rows, cols);
  const exercisesById = new Map(exercises.map((exercise) => [String(exercise.id), exercise]));

  doc.setDrawColor(190, 196, 207);
  doc.setLineWidth(lineWidth);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      doc.rect(x + col * cellSize, y + row * cellSize, cellSize, cellSize);
    }
  }

  reservedCells.forEach((cell) => {
    const cellX = x + cell.x * cellSize;
    const cellY = y + cell.y * cellSize;
    doc.setFillColor(229, 231, 235);
    doc.rect(cellX, cellY, cellSize * cell.w, cellSize * cell.h, 'F');
    doc.setDrawColor(120, 130, 145);
    doc.rect(cellX, cellY, cellSize * cell.w, cellSize * cell.h);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(reservedFontSize);
    doc.setTextColor(55, 65, 81);
    doc.text(
      splitText(doc, cell.label, cellSize * cell.w - textPadding * 2),
      cellX + textPadding,
      cellY + textYOffset
    );
  });

  (layout?.items || []).forEach((item) => {
    const exercise = exercisesById.get(String(item.exerciseId));
    if (!exercise) return;

    const itemX = x + item.x * cellSize;
    const itemY = y + item.y * cellSize;
    const width = item.w * cellSize;
    const height = item.h * cellSize;
    const color = softenColor(exercise.color);

    doc.setFillColor(...color);
    doc.setDrawColor(148, 163, 184);
    doc.rect(itemX, itemY, width, height, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(31, 41, 55);
    doc.text(
      splitText(doc, exercise.name, width - textPadding * 2),
      itemX + textPadding,
      itemY + textYOffset
    );
  });

  return { width: gridWidth, height: gridHeight };
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

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(layout.name || 'Circuito del gimnasio', margin, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Grid fijo ${DEFAULT_GRID_COLS} x ${DEFAULT_GRID_ROWS}`, margin, 66);

  drawGymLayoutGrid({ doc, layout, exercises, x: gridX, y: gridY, cellSize: gridCell });

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
