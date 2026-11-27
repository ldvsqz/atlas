const getSafeFileName = (value) =>
  String(value || 'circuito-gimnasio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'circuito-gimnasio';

export const downloadGymLayoutImage = async ({ element, layoutName }) => {
  if (!element) {
    throw new Error('No hay contenido disponible para exportar.');
  }

  const { default: html2canvas } = await import('html2canvas');
  const gridBoard = element.querySelector('[data-gym-grid-board]');
  const gridWidth = gridBoard?.getBoundingClientRect().width || 0;
  const gridScale = 1.1;
  const captureWidth = Math.ceil(Math.max(element.scrollWidth, gridWidth * gridScale + 460));
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    ignoreElements: (node) => (
      node.classList?.contains('js-btn-eliminar')
      || node.classList?.contains('react-resizable-handle')
    ),
    logging: false,
    scale: 2,
    useCORS: true,
    width: captureWidth,
    windowWidth: captureWidth,
    onclone: (clonedDocument) => {
      const exportElement = clonedDocument.querySelector('[data-gym-layout-export]');
      if (exportElement) {
        exportElement.style.width = `${captureWidth}px`;
        exportElement.style.maxWidth = 'none';
      }

      const exercisePalette = clonedDocument.querySelector('[data-html2canvas-ignore]');
      if (exercisePalette) {
        exercisePalette.style.display = 'none';
      }

      const exportColumns = clonedDocument.querySelector('[data-gym-layout-export-columns]');
      if (exportColumns) {
        exportColumns.style.display = 'flex';
        exportColumns.style.flexDirection = 'row';
        exportColumns.style.alignItems = 'flex-start';
        exportColumns.style.gap = '20px';
        Array.from(exportColumns.children).forEach((child) => {
          child.style.margin = '0';
        });
      }

      const exportGrid = clonedDocument.querySelector('[data-gym-layout-export-grid]');
      if (exportGrid) {
        exportGrid.style.flex = '1 1 0';
        exportGrid.style.width = 'auto';
        exportGrid.style.minWidth = '0';
      }

      const exportList = clonedDocument.querySelector('[data-gym-layout-export-list]');
      if (exportList) {
        exportList.style.flex = '0 0 360px';
        exportList.style.width = '360px';
      }

      const gridScroll = clonedDocument.querySelector('[data-gym-grid-scroll]');
      if (gridScroll) {
        gridScroll.style.width = 'max-content';
        gridScroll.style.overflow = 'visible';
        const gridBoardElement = gridScroll.querySelector('[data-gym-grid-board]');
        if (gridBoardElement) {
          const gridHeight = gridBoardElement.getBoundingClientRect().height;
          gridBoardElement.style.transform = `scale(${gridScale})`;
          gridBoardElement.style.transformOrigin = 'top left';
          gridScroll.style.paddingBottom = `${gridHeight * (gridScale - 1)}px`;
          if (gridScroll.parentElement) {
            gridScroll.parentElement.style.overflow = 'visible';
          }
        }
      }

      clonedDocument.querySelectorAll('[data-gym-layout-exercise-image]').forEach((image) => {
        image.style.width = 'auto';
        image.style.height = 'auto';
        image.style.maxWidth = '100%';
        image.style.maxHeight = '100%';
        image.style.objectFit = 'contain';
        image.style.objectPosition = 'center';
      });

      clonedDocument.querySelectorAll('[data-gym-layout-description]').forEach((description) => {
        description.style.display = 'block';
        description.style.maxHeight = 'none';
        description.style.overflow = 'visible';
      });

      const exerciseList = clonedDocument.querySelector('[data-gym-layout-exercises]');
      if (exerciseList) {
        exerciseList.style.maxHeight = 'none';
        exerciseList.style.height = 'auto';
        exerciseList.style.overflow = 'visible';
      }

      const notesInput = clonedDocument.querySelector('[data-gym-layout-notes-input]');
      if (notesInput) {
        notesInput.style.display = 'none';
      }

      const notesPreview = clonedDocument.querySelector('[data-gym-layout-notes-preview]');
      if (notesPreview) {
        notesPreview.style.display = 'block';
      }
    },
  });
  const imageBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('No se pudo convertir el circuito a imagen.'));
      }
    }, 'image/png');
  });
  const imageUrl = URL.createObjectURL(imageBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = imageUrl;
  downloadLink.download = `${getSafeFileName(layoutName)}.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
};
