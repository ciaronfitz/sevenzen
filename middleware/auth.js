
//check user is logged in
exports.isAuthenticated = (req, res, next) => {
    const { isloggedin } = req.session;

    if (!isloggedin) {
        req.session.route = req.originalUrl;
        console.log('User is not logged in');
        return res.redirect('/login');
      }

      next();
  };