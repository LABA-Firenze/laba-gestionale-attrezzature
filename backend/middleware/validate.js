import { z } from 'zod';

function flattenErrors(error) {
  const { fieldErrors, formErrors } = error.flatten();
  return {
    fields: fieldErrors,
    form: formErrors,
  };
}

export function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (body) {
        const parsedBody = body.safeParse(req.body ?? {});
        if (!parsedBody.success) {
          return res.status(400).json({
            error: 'Body richiesta non valido',
            details: flattenErrors(parsedBody.error),
          });
        }
        req.body = parsedBody.data;
      }

      if (params) {
        const parsedParams = params.safeParse(req.params ?? {});
        if (!parsedParams.success) {
          return res.status(400).json({
            error: 'Parametri URL non validi',
            details: flattenErrors(parsedParams.error),
          });
        }
        req.params = parsedParams.data;
      }

      if (query) {
        const parsedQuery = query.safeParse(req.query ?? {});
        if (!parsedQuery.success) {
          return res.status(400).json({
            error: 'Query string non valida',
            details: flattenErrors(parsedQuery.error),
          });
        }
        req.query = parsedQuery.data;
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export { z };
