const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'eduGestion_s3cr3t_k3y_2026_CHANGE_IN_PRODUCTION';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';

/**
 * Genera un token JWT para el usuario autenticado
 */
function generarToken(usuario) {
    return jwt.sign(
        {
            id: usuario.id,
            cuenta: usuario.cuenta,
            rol: usuario.rol,
            level: usuario.level
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
    );
}

/**
 * Middleware que verifica el token JWT en el header Authorization.
 * Si el token es válido, agrega req.usuario con los datos decodificados.
 * Si no, retorna 401.
 */
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    // Formato: "Bearer <token>"
    const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Sesión expirada. Inicie sesión nuevamente.' });
        }
        return res.status(401).json({ error: 'Token inválido.' });
    }
}

/**
 * Middleware opcional: verifica token si existe, pero no bloquea si no hay.
 * Útil para rutas que pueden funcionar con o sin autenticación.
 */
function tokenOpcional(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return next();

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        // Token inválido, pero no bloqueamos
    }
    next();
}

module.exports = { generarToken, verificarToken, tokenOpcional, JWT_SECRET };
