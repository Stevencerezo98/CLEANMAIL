import { Request, Response } from 'express';
import crypto from 'crypto';
import { UserRole, UserSession } from '../db/schema.ts';

// Usuarios del sistema con sus roles y contraseñas
const USERS_REGISTRY: Record<string, { pass: string; role: UserRole; name: string }> = {
  admin: {
    pass: '06129812',
    role: 'admin',
    name: 'Administrador del Sistema',
  },
  digitalizador: {
    pass: '12345678',
    role: 'digitalizador',
    name: 'Operador Digitalizador',
  },
};

// Almacenamiento en memoria de tokens válidos de sesión
const ACTIVE_SESSIONS = new Map<string, UserSession>();

export class AuthController {
  public static login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Debe ingresar usuario y contraseña.',
        });
      }

      const normalizedUser = String(username).trim().toLowerCase();
      const account = USERS_REGISTRY[normalizedUser];

      if (!account || account.pass !== String(password).trim()) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas. Por favor verifique sus datos.',
        });
      }

      // Generar token criptográfico único
      const token = 'tok_' + crypto.randomBytes(24).toString('hex');
      const session: UserSession = {
        username: normalizedUser === 'admin' ? 'Admin' : 'Digitalizador',
        name: account.name,
        role: account.role,
        token,
      };

      ACTIVE_SESSIONS.set(token, session);

      return res.status(200).json({
        success: true,
        message: `Bienvenido, ${session.name}`,
        data: session,
      });
    } catch (err) {
      console.error('Error en login:', err);
      return res.status(500).json({ success: false, message: 'Error interno en autenticación.' });
    }
  }

  public static verifySession(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No autenticado.' });
    }

    const token = authHeader.substring(7);
    const session = ACTIVE_SESSIONS.get(token);

    if (!session) {
      return res.status(401).json({ success: false, message: 'Sesión expirada o inválida.' });
    }

    return res.status(200).json({
      success: true,
      data: session,
    });
  }

  public static logout(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      ACTIVE_SESSIONS.delete(token);
    }
    return res.status(200).json({ success: true, message: 'Sesión cerrada correctamente.' });
  }

  // Middleware para validar rol de administrador
  public static requireAdmin(req: Request, res: Response, next: () => void) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Acceso no autorizado.' });
    }

    const token = authHeader.substring(7);
    const session = ACTIVE_SESSIONS.get(token);

    if (!session || session.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: se requieren privilegios de Administrador.',
      });
    }

    next();
  }
}
