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

  // Métodos de Planes de Depuración (Landing)
  public static getPlans(_req: Request, res: Response) {
    try {
      const plans = db.getLandingPlans();
      return res.status(200).json({ success: true, data: plans });
    } catch (err) {
      return res.status(500).json({ success: false, message: (err as Error).message });
    }
  }

  public static getPublicPlans(_req: Request, res: Response) {
    try {
      const plans = db.getLandingPlans().filter((p) => p.active);
      return res.status(200).json({ success: true, data: plans });
    } catch (err) {
      return res.status(500).json({ success: false, message: (err as Error).message });
    }
  }

  public static updatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = db.updateLandingPlan(id, updates);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
      }
      return res.status(200).json({
        success: true,
        message: 'Plan de depuración actualizado exitosamente.',
        data: updated,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: (err as Error).message });
    }
  }

  public static createPlan(req: Request, res: Response) {
    try {
      const { name, credits, price, currency, period, description, features, badge, popular, active } = req.body;
      if (!name || price === undefined || !credits) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, créditos y precio son obligatorios para crear el plan.',
        });
      }

      const newPlan = db.createLandingPlan({
        name: String(name).trim(),
        credits: Number(credits),
        price: Number(price),
        currency: currency || 'USD',
        period: period || 'pago único',
        description: description || '',
        features: Array.isArray(features) ? features : [],
        badge: badge || undefined,
        popular: Boolean(popular),
        active: active !== undefined ? Boolean(active) : true,
      });

      return res.status(201).json({
        success: true,
        message: 'Nuevo plan creado exitosamente.',
        data: newPlan,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: (err as Error).message });
    }
  }

  public static deletePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = db.deleteLandingPlan(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
      }
      return res.status(200).json({ success: true, message: 'Plan eliminado.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: (err as Error).message });
    }
  }

  public static resetPlans(_req: Request, res: Response) {
    try {
      const plans = db.resetLandingPlans();
      return res.status(200).json({
        success: true,
        message: 'Planes restaurados a los valores por defecto.',
        data: plans,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: (err as Error).message });
    }
  }
}
