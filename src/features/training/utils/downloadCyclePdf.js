import { CYCLE_LABELS, TRAINING_WEEK_DAYS, normalizeFirestoreDate } from '../models/trainingModels';
import { formatTrainingTotal, getMicrocycleDayTotals, getMicrocycleTotal } from './microcycleWorksheet';
import { getMicrocycleDate } from '../public/publicCycleUtils';

const sanitizeFileName = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ciclo';

export const downloadCyclePdf = async (cycle) => {
  const [{ default: jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF();
  const weekCount = Math.max(Number(cycle.weeks) || 1, 1);
  const createdAt = normalizeFirestoreDate(cycle.createdAt);

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(cycle.name || 'Ciclo de entrenamiento', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(
    `${CYCLE_LABELS[cycle.type] || cycle.type || 'Ciclo'} · ${weekCount} microciclo${weekCount === 1 ? '' : 's'} · Fecha: ${createdAt?.isValid() ? createdAt.format('DD/MM/YYYY') : 'Sin fecha'}`,
    14,
    22
  );

  let nextY = 29;
  if (cycle.description) {
    autoTable(doc, {
      startY: nextY,
      theme: 'plain',
      body: [[cycle.description]],
      styles: { fontSize: 8, cellPadding: 2, textColor: [31, 41, 55] },
      bodyStyles: { fillColor: [249, 250, 251] },
    });
    nextY = (doc.lastAutoTable?.finalY || nextY) + 5;
  }

  for (let index = 0; index < weekCount; index += 1) {
    const weekIndex = index + 1;
    const plan = cycle.microcyclePlans?.[String(weekIndex)] || {};
    const rows = Array.isArray(plan.rows) ? plan.rows : [];
    const dayTotals = getMicrocycleDayTotals(rows);
    const weeklyTotal = getMicrocycleTotal(rows);
    const cycleDate = getMicrocycleDate(cycle, weekIndex);
    const pageHeight = doc.internal.pageSize.getHeight();

    if (nextY > pageHeight - 45) {
      doc.addPage();
      nextY = 16;
    }

    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(
      `Microciclo ${weekIndex}${cycleDate?.isValid() ? ` · ${cycleDate.format('DD/MM/YYYY')}` : ''}`,
      14,
      nextY
    );
    nextY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(8);
    doc.text(
      `Ciclo: ${cycle.name || 'Ciclo de entrenamiento'} · ${CYCLE_LABELS[cycle.type] || cycle.type || 'Ciclo'}`,
      14,
      nextY
    );
    nextY += 5;

    if (plan.description) {
      const descriptionLines = doc.splitTextToSize(plan.description, 180);
      doc.text(descriptionLines, 14, nextY);
      nextY += descriptionLines.length * 4 + 2;
    }

    const body = rows.length
      ? rows.map((row) => [
        row.exercise || '—',
        ...TRAINING_WEEK_DAYS.map((_, dayIndex) => row.cells?.[dayIndex + 1] || '—'),
      ])
      : [['Sin ejercicios registrados.', ...TRAINING_WEEK_DAYS.map(() => '')]];
    const totalsRow = [
      `Total: ${formatTrainingTotal(weeklyTotal)}`,
      ...dayTotals.map((total) => formatTrainingTotal(total)),
    ];

    autoTable(doc, {
      startY: nextY,
      theme: 'grid',
      head: [['Ejercicio', ...TRAINING_WEEK_DAYS]],
      body,
      foot: [totalsRow],
      rowPageBreak: 'avoid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'middle',
        overflow: 'linebreak',
        textColor: [31, 41, 55],
        lineColor: [203, 213, 225],
      },
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [239, 246, 255], textColor: [30, 41, 59], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 34, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 24 },
        3: { cellWidth: 24 },
        4: { cellWidth: 24 },
        5: { cellWidth: 24 },
        6: { cellWidth: 24 },
      },
    });
    nextY = (doc.lastAutoTable?.finalY || nextY) + 8;
  }

  doc.save(`${sanitizeFileName(cycle.name || 'ciclo')}.pdf`);
};
