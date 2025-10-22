export const isAdmin = (req, res, next) => {
  const userEmail = req.user?.email;

  if (!userEmail) {
    return res.status(401).json({ error: "Unauthorized. No user email found." });
  }

  if (userEmail !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  next();
};
