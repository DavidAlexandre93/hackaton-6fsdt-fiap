import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errors.js';

const SECRET = 'professor-plus-secret';

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    SECRET,
    { expiresIn: '8h' }
  );
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Token não informado.' });
  }

  const [, token] = header.split(' ');
  if (!token) {
    return res.status(401).json({ message: 'Formato de token inválido.' });
  }

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

export function authorize(...allowedRoles) {
  const roles = new Set(allowedRoles.filter(Boolean));

  return (req, _res, next) => {
    if (!req.user?.role) {
      return next(new UnauthorizedError('Perfil de usuário não identificado.'));
    }

    if (roles.size && !roles.has(req.user.role)) {
      return next(new UnauthorizedError('Você não tem permissão para acessar este recurso.'));
    }

    return next();
  };
}
