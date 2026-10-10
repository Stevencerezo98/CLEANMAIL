import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  Sparkles,
  Cpu,
  Globe2,
  Key,
  HelpCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Categoria, UploadProcessSummary, ExternalValidationProvider } from '../server/db/schema.ts';
import { UpgradePlanModal } from './UpgradePlanModal.tsx';

interface FileUploaderProps {
  categories: Categoria[];
  selectedCategoryId: string;
  onUploadSuccess: (summary: UploadProcessSummary) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  categories,
  selectedCategoryId,
  onUploadSuccess,
}) => {
  const [targetCategory, setTargetCategory] = useState(selectedCategoryId || (categories[0]?.id ?? ''));
  const [checkDns, setCheckDns] = useState(true);
  const [autoCorrect, setAutoCorrect] = useState(true);

  // Verificación con API Externa (Puntuación de Confianza)
  const [verifyExternal, setVerifyExternal] = useState(true);
  const [externalProvider, setExternalProvider] = useState<ExternalValidationProvider>('debounce');
  const [apiKey, setApiKey] = useState('');
  const [showApiSettings, setShowApiSettings] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastSummary, setLastSummary] = useState<UploadProcessSummary | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (selectedCategoryId) {
      setTargetCategory(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!targetCategory) {
      setUploadError('Por favor selecciona una categoría antes de subir archivos.');
      return;
    }

    setUploadError('');
    setIsProcessing(true);
    setProgress(15);
    setStatusMessage(`Leyendo ${files.length} archivo(s)...`);
    setLastSummary(null);

    const formData = new FormData();
    formData.append('categoria_id', targetCategory);
    formData.append('check_dns', checkDns.toString());
    formData.append('auto_correct', autoCorrect.toString());

    // Parámetros de verificación externa
    formData.append('verify_external', verifyExternal.toString());
    formData.append('external_provider', externalProvider);
    if (apiKey.trim()) {
      formData.append('api_key', apiKey.trim());
    }

    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      setProgress(35);
      setStatusMessage(
        verifyExternal
          ? `Consultando ${
              externalProvider === 'debounce' ? 'Debounce Free API & SPF/DMARC' : externalProvider
            } y verificando MX...`
          : 'Validando sintaxis y registros DNS MX...'
      );

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 350);

      const response = await fetch('/api/emails/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(95);
      setStatusMessage('Calculando puntuaciones de confianza...');

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.quotaExceeded) {
          setUpgradeModalMessage(result.message);
          setIsUpgradeModalOpen(true);
        }
        throw new Error(result.message || 'Error al procesar los archivos.');
      }

      setProgress(100);
      setStatusMessage('¡Proceso completado con éxito!');
      setLastSummary(result.data);
      onUploadSuccess(result.data);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      setUploadError((err as Error).message || 'Ocurrió un error al subir los archivos.');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 1200);
    }
  };

  const handleLoadDemoBatch = async () => {
    if (!targetCategory) {
      alert('Selecciona una categoría primero.');
      return;
    }

    const demoEmails = [
      'carlos.mendoza@gmail.com', // 95+ score
      'lucia.hernandez@gmai.com', // Typo corregido -> gmail.com -> 95+ score
      'roberto.gomez@outlok.com', // Typo corregido -> outlook.com -> 95+ score
      'pedro.alvarez@hotmai.com', // Typo corregido -> hotmail.com -> 95+ score
      'ventas@solucionesb2b.com', // Rol departamental -> 65 score
      'contacto@tiendaonline.es', // Rol departamental -> 65 score
      'admin@servicioshn.net', // Rol departamental -> 65 score
      'info@constructora.com', // Rol departamental -> 65 score
      'usuario_falso_99@mailinator.com', // Desechable -> 5 score
      'temp_user_test@guerrillamail.com', // Desechable -> 5 score
      'sintaxis..invalida@gmail.com', // Sintaxis inválida -> 0 score
      'sin-arroba-en-email.com', // Sintaxis inválida -> 0 score
      'usuario@dominio-inexistente-123xyz998877.org', // Sin MX -> 0 score
      'director@microsoft.com', // Corporativo de alta reputación -> 95 score
      'carlos.mendoza@gmail.com', // Duplicado intencional (se omitirá)
    ];

    const blob = new Blob([demoEmails.join('\n')], { type: 'text/plain' });
    const demoFile = new File([blob], 'demo_lista_con_scores_externos.txt', { type: 'text/plain' });
    await uploadFiles([demoFile]);
  };

  return (
    <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 shadow-md backdrop-blur-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
        <div>
          <h2 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-sky-400" />
            Cargar y Depurar Bases de Datos
          </h2>
          <p className="text-xs text-slate-400">
            Limpieza con Regex, DNS MX, autocorrección y puntuación de confianza externa
          </p>
        </div>

        {/* Selector de categoría destino */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300 font-semibold whitespace-nowrap">
            Destino:
          </label>
          <select
            value={targetCategory}
            onChange={(e) => setTargetCategory(e.target.value)}
            disabled={isProcessing}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Switches de validación básica */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checkDns}
            onChange={(e) => setCheckDns(e.target.checked)}
            disabled={isProcessing}
            className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-slate-700 focus:ring-sky-500"
          />
          <div>
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              Verificación DNS MX Activa
            </span>
            <span className="text-[11px] text-slate-400 block">
              Consulta servidores MX reales usando el módulo nativo dns
            </span>
          </div>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoCorrect}
            onChange={(e) => setAutoCorrect(e.target.checked)}
            disabled={isProcessing}
            className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-slate-700 focus:ring-sky-500"
          />
          <div>
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Autocorrección de Dominios
            </span>
            <span className="text-[11px] text-slate-400 block">
              Repara errores tipográficos (gmai.com, outlok.com, hotmai.com)
            </span>
          </div>
        </label>
      </div>

      {/* Panel de Verificación Externa y Puntuación de Confianza */}
      <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verifyExternal}
              onChange={(e) => setVerifyExternal(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 rounded text-indigo-500 bg-slate-900 border-slate-700 focus:ring-indigo-500"
            />
            <div>
              <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-indigo-400" />
                Obtener Puntuación de Confianza Externa (0 - 100%)
              </span>
              <span className="text-[11px] text-slate-400 block">
                Envía cada correo a una API externa para calcular el score de entregabilidad
              </span>
            </div>
          </label>

          <button
            type="button"
            onClick={() => setShowApiSettings(!showApiSettings)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium underline flex items-center gap-1 shrink-0"
          >
            <span>{showApiSettings ? 'Ocultar Proveedor' : 'Configurar Proveedor'}</span>
          </button>
        </div>

        {/* Configuración de Proveedor */}
        {(verifyExternal || showApiSettings) && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-indigo-500/20 text-xs">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Servicio / API Externa:
              </label>
              <select
                value={externalProvider}
                onChange={(e) => setExternalProvider(e.target.value as ExternalValidationProvider)}
                disabled={isProcessing || !verifyExternal}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="debounce">Debounce Free API + SPF/DMARC (Gratuito, sin clave)</option>
                <option value="hunter">Hunter.io Email Verifier (Requiere API Key)</option>
                <option value="zerobounce">ZeroBounce API (Requiere API Key)</option>
                <option value="abstract">AbstractAPI Email Validation (Requiere API Key)</option>
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <Key className="w-3 h-3 text-slate-400" />
                <span>Clave API {externalProvider === 'debounce' ? '(Opcional / No requerida)' : '(Requerida)'}:</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  externalProvider === 'debounce'
                    ? 'No se requiere clave para Debounce Free'
                    : 'Ingresa tu clave API aquí...'
                }
                disabled={isProcessing || !verifyExternal || externalProvider === 'debounce'}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <div className="sm:col-span-12 flex items-center gap-1.5 text-[11px] text-slate-400">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                {externalProvider === 'debounce'
                  ? 'Debounce Free API evalúa temporalidad y el motor analiza registros SPF/DMARC y reputación para asignar un score del 0 al 100.'
                  : `Se conectará a los servidores de ${externalProvider} usando tu clave para consultar la entregabilidad en tiempo real.`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Zona de Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
          isDragging
            ? 'border-sky-400 bg-sky-500/10'
            : 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-600'
        } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.txt"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-inner">
          <UploadCloud className="w-6 h-6" />
        </div>

        <div>
          <p className="text-xs sm:text-sm font-bold text-slate-200">
            Arrastra tus archivos aquí o haz clic para examinarlos
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Soporta <span className="text-sky-300 font-semibold">.CSV</span>,{' '}
            <span className="text-emerald-300 font-semibold">.XLSX</span>,{' '}
            <span className="text-amber-300 font-semibold">.TXT</span> (Múltiples archivos a la vez)
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
          <span>• Aislamiento por categoría</span>
          <span>• Deduplicación instantánea</span>
          {verifyExternal && <span>• Puntuación de Confianza 0-100%</span>}
        </div>
      </div>

      {/* Botón de Demostración Rápida */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-slate-400 text-[11px]">¿Quieres probar el motor ahora mismo?</span>
        <button
          type="button"
          onClick={handleLoadDemoBatch}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Probar con Lista Sucia y Score de Confianza (15 correos)
        </button>
      </div>

      {/* Barra de progreso */}
      {isProcessing && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="text-sky-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
              {statusMessage}
            </span>
            <span className="font-mono font-bold text-slate-300">{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Resumen del último procesamiento */}
      {lastSummary && (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Procesamiento Finalizado con Éxito ({lastSummary.tiempo_procesamiento_ms} ms)
            </h4>
            <span className="text-[10px] text-slate-400">Total leídos: {lastSummary.total_leidos}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs pt-1">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <div className="text-[10px] text-emerald-400 uppercase font-bold">Válidos</div>
              <div className="text-base font-extrabold">{lastSummary.validos}</div>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <div className="text-[10px] text-amber-400 uppercase font-bold">De Rol</div>
              <div className="text-base font-extrabold">{lastSummary.genericos_rol}</div>
            </div>
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300">
              <div className="text-[10px] text-sky-400 uppercase font-bold">Corregidos</div>
              <div className="text-base font-extrabold">{lastSummary.corregidos}</div>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
              <div className="text-[10px] text-purple-400 uppercase font-bold">Duplicados</div>
              <div className="text-base font-extrabold">{lastSummary.duplicados_omitidos}</div>
            </div>
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <div className="text-[10px] text-rose-400 uppercase font-bold">Inválidos</div>
              <div className="text-base font-extrabold">{lastSummary.invalidos}</div>
            </div>
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              <div className="text-[10px] text-indigo-400 uppercase font-bold">Score Medio</div>
              <div className="text-base font-extrabold">{lastSummary.promedio_score || 0}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner with Upgrade Button */}
      {uploadError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2 font-medium flex-1">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(uploadError.toLowerCase().includes('límite') ||
              uploadError.toLowerCase().includes('plan') ||
              uploadError.toLowerCase().includes('crédito')) && (
              <button
                onClick={() => {
                  setUpgradeModalMessage(uploadError);
                  setIsUpgradeModalOpen(true);
                }}
                className="px-3 py-1 bg-[#00a2c7] hover:bg-[#0092b3] text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Actualizar Plan</span>
              </button>
            )}
            <button
              onClick={() => setUploadError('')}
              className="text-slate-400 hover:text-slate-200 font-bold px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentConfig={null}
        onPlanUpgraded={() => {
          setUploadError('');
        }}
        message={upgradeModalMessage}
      />
    </div>
  );
};
