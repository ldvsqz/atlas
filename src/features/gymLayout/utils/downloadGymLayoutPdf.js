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

const getImageFormat = (dataUrl = '') => {
  const match = String(dataUrl).match(/^data:image\/([^;]+);/i);
  const format = match?.[1]?.toUpperCase();
  return format === 'JPG' ? 'JPEG' : format;
};

const drawContainedImage = ({ doc, dataUrl, x, y, width, height }) => {
  if (!dataUrl || width <= 0 || height <= 0) return false;

  try {
    const props = doc.getImageProperties(dataUrl);
    const imageRatio = props.width / props.height;
    const boxRatio = width / height;
    const drawWidth = imageRatio > boxRatio ? width : height * imageRatio;
    const drawHeight = imageRatio > boxRatio ? width / imageRatio : height;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;

    doc.addImage(dataUrl, getImageFormat(dataUrl), drawX, drawY, drawWidth, drawHeight);
    return true;
  } catch (error) {
    return false;
  }
};

const getFittedLines = (doc, text, maxWidth, maxLines = 2) => {
  const lines = splitText(doc, text, maxWidth);
  if (lines.length <= maxLines) return lines;

  const nextLines = lines.slice(0, maxLines);
  const lastIndex = nextLines.length - 1;
  let lastLine = String(nextLines[lastIndex] || '');

  while (lastLine.length > 1 && doc.getTextWidth(`${lastLine}...`) > maxWidth) {
    lastLine = lastLine.slice(0, -1).trimEnd();
  }

  nextLines[lastIndex] = `${lastLine || String(lines[lastIndex] || '').slice(0, 1)}...`;
  return nextLines;
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
    const hasImage = Boolean(exercise.imageDataUrl);
    const imagePadding = Math.max(1, textPadding * 0.5);
    const labelHeight = hasImage
      ? Math.min(height * 0.42, Math.max(fontSize * 2.15, height * 0.28))
      : 0;
    const labelPadding = Math.max(1, textPadding * 0.8);
    const labelY = hasImage ? itemY + height - labelHeight : itemY;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(148, 163, 184);
    doc.rect(itemX, itemY, width, height, 'FD');
    if (hasImage) {
      doc.setFillColor(255, 255, 255);
      doc.rect(
        itemX + imagePadding,
        itemY + imagePadding,
        width - imagePadding * 2,
        Math.max(1, height - labelHeight - imagePadding * 2),
        'F'
      );

      const imageDrawn = drawContainedImage({
        doc,
        dataUrl: exercise.imageDataUrl,
        x: itemX + imagePadding,
        y: itemY + imagePadding,
        width: width - imagePadding * 2,
        height: Math.max(1, height - labelHeight - imagePadding * 2),
      });

      if (imageDrawn) {
        doc.setFillColor(255, 255, 255);
        doc.rect(itemX + 1, labelY - 1, width - 2, labelHeight, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.line(itemX + 1, labelY - 1, itemX + width - 1, labelY - 1);
      }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(31, 41, 55);
    const textLines = getFittedLines(doc, exercise.name, width - labelPadding * 2, hasImage ? 2 : 3);
    const lineHeight = fontSize * 1.12;
    const textHeight = (textLines.length - 1) * lineHeight;
    const textY = hasImage
      ? labelY + (labelHeight - textHeight) / 2 + fontSize * 0.34
      : itemY + textYOffset;

    doc.text(textLines, itemX + width / 2, textY, {
      align: 'center',
      lineHeightFactor: 1.12,
      maxWidth: width - labelPadding * 2,
    });
  });

  return { width: gridWidth, height: gridHeight };
};

export const downloadGymLayoutPdf = async ({ layout, exercises = [], orderedExercises = [] }) => {
  const [{ default: jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
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
