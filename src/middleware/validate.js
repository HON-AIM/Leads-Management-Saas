function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error?.issues || result.error?.errors || [];
      const message = issues.map((e) => e.message).join('; ') || 'Validation failed';
      return res.status(400).json({ success: false, error: message });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
