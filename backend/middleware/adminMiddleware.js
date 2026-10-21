function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required. Please log in.',
    });
  }

  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Administrator privileges are required.',
    });
  }

  next();
}

module.exports = adminMiddleware;
