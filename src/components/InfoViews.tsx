import React from 'react';
import { Info, HelpCircle, CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

export const TerminologyView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Terminology & Estados</h1>
        <p className="text-xs text-slate-500 mt-1">
          Guía de estados, clasificación y métricas del motor CleanMail.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Deliverable (Válido)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sintaxis RFC válida, servidor de correo DNS MX activo y sin indicios de ser desechable. Confiable para campañas de email marketing o transaccionales.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>Risky (Rol / Genérico)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Cuentas corporativas departamentales como <code>info@</code>, <code>ventas@</code> o <code>admin@</code>. Suelen ser buzones compartidos con mayor probabilidad de ignorar mensajes.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
            <XCircle className="w-5 h-5" />
            <span>Undeliverable (Inválido)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Correos con errores de sintaxis irrecuperables, dominios inexistentes o sin servidores MX activos, o buzones temporales (Mailinator, Yopmail, Guerrillamail).
          </p>
        </div>
      </div>
    </div>
  );
};

export const FaqView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Preguntas Frecuentes (FAQ)</h1>
        <p className="text-xs text-slate-500 mt-1">
          Respuestas sobre el funcionamiento de CleanMail y el aislamiento de bases de datos.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
        <div className="space-y-1 pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">¿Cómo garantiza CleanMail que no se mezclen mis listas?</h3>
          <p className="text-slate-600 leading-relaxed">
            Cada lista se asocia a un <code>categoria_id</code> único en la base de datos. La deduplicación y el filtrado se ejecutan de forma aislada por categoría.
          </p>
        </div>

        <div className="space-y-1 pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">¿Qué formatos de archivo puedo cargar?</h3>
          <p className="text-slate-600 leading-relaxed">
            CleanMail procesa archivos <code>.csv</code>, <code>.xlsx</code>, <code>.xls</code> y <code>.txt</code>. Detecta automáticamente la columna de correo o extrae los correos contenidos en el archivo.
          </p>
        </div>

        <div className="space-y-1 pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">¿Cómo funciona la verificación de registros DNS MX?</h3>
          <p className="text-slate-600 leading-relaxed">
            Utiliza el módulo nativo <code>dns.promises.resolveMx</code> de Node.js en el backend para consultar los servidores DNS globales autoritativos en tiempo real, con caché en memoria para alto rendimiento.
          </p>
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm">¿El archivo exportado incluye todos los correos o sólo los limpios?</h3>
          <p className="text-slate-600 leading-relaxed">
            Por defecto, el botón de exportación descarga únicamente los correos válidos y corregidos, con la opción de incluir o excluir cuentas de rol (info, ventas).
          </p>
        </div>
      </div>
    </div>
  );
};
