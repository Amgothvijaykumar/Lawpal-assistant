const mongoose = require('mongoose');

/**
 * Middleware to validate MongoDB ObjectIDs in request parameters
 * @param {string[]} paramNames - Array of parameter names to validate
 */
const validateObjectId = (paramNames = ['id']) => {
    return (req, res, next) => {
        for (const param of paramNames) {
            const id = req.params[param] || req.query[param] || req.body[param];

            if (id && !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    error: `Invalid ID format: ${param}`,
                    details: `The provided value '${id}' is not a valid 24-character hexadecimal string.`
                });
            }
        }
        next();
    };
};

module.exports = {
    validateObjectId
};
