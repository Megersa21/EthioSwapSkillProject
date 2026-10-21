function superAdminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required. Please log in.',
    });
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Super administrator privileges are required.',
    });
  }

  next();
}

module.exports = superAdminMiddleware;
