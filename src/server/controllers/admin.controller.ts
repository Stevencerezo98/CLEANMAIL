import { Request, Response } from 'express';
import { db } from '../db/database.ts';

export class AdminController {
  public static getConfig(_req: Request, res: Response) {
    try {
      const config = db.getSystemConfig();
      return res.status(200).json({ success: true, data: config });
    } catch (err) {
      return res.status(500).json({ success: false, message: (err as Error).message });
    }
  }

  public static updateConfig(req: Request, res: Response) {
    try {
      const {
        planName,
        planType,
        creditosDisponibles,
        limiteMensual,
        autoCleanDuplicates,
        strictMxChecking,
        alertaCreditosBajos,
        umbralAlerta,
      } = req.body;

      const updated = db.updateSystemConfig({
        planName: planName !== undefined ? String(planName).trim() : undefined,
        planType,
        creditosDisponibles:
          creditosDisponibles !== undefined ? parseInt(String(creditosDisponibles), 10) : undefined,
        limiteMensual: limiteMensual !== undefined ? parseInt(String(limiteMensual), 10) : undefined,
        autoCleanDuplicates: autoCleanDuplicates !== undefined ? Boolean(autoCleanDuplicates) : undefined,
        strictMxChecking: strictMxChecking !== undefined ? Boolean(strictMxChecking) : undefined,
        alertaCreditosBajos: alertaCreditosBajos !== undefined ? Boolean(alertaCreditosBajos) : undefined,
        umbralAlerta: umbralAlerta !== undefined ? parseInt(String(umbralAlerta), 10) : undefined,
      });

      return res.status(200).json({
        success: true,
        message: 'Configuración de plan y créditos actualizada correctamente.',
        data: updated,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: (err as Error).message });
    }
  }
}
