const HttpError = require('../utils/HttpError');

// validate({ body, query, params }) -> parsed results on req.valid.{body,query,params}
module.exports = (schemas) => (req, res, next) => {
  req.valid = {};
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key]);
    if (!result.success) {
      return next(new HttpError(400, 'Validation failed', result.error.flatten().fieldErrors));
    }
    req.valid[key] = result.data;
  }
  next();
};
