import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { downloadCyclePdf } from '../utils/downloadCyclePdf';

function PdfDownloadButton({ cycle, exercises = [], days = [], circuitDetails = null, disabled = false, onError, compact = false }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cycle) return;

    try {
      setDownloading(true);
      await downloadCyclePdf(cycle, exercises, days, circuitDetails);
    } catch (error) {
      console.error('Error downloading public cycle PDF:', error);
      onError?.('No pudimos descargar el PDF del ciclo.');
    } finally {
      setDownloading(false);
    }
  };

  const isDisabled = disabled || downloading || !cycle;

  return (
    <Button
      size={compact ? 'small' : 'medium'}
      variant={compact ? 'outlined' : 'contained'}
      startIcon={isDisabled && downloading ? <CircularProgress color="inherit" size={16} /> : <DownloadIcon />}
      onClick={handleDownload}
      disabled={isDisabled}
      sx={compact ? { minWidth: 0 } : undefined}
    >
      {downloading ? 'PDF...' : compact ? 'PDF' : 'Descargar PDF'}
    </Button>
  );
}

export default PdfDownloadButton;
