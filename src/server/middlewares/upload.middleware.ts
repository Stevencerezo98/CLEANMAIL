import multer from 'multer';

// Almacenamiento en memoria para procesamiento directo sin residuos temporales
const storage = multer.memoryStorage();

// Filtro de tipos de archivo admitidos
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.txt'];
  const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo "${ext}" no permitido. Formatos soportados: CSV, XLSX, XLS, TXT.`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB máximo por archivo
  },
});
