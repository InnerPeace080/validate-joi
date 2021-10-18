/* eslint comma-dangle: 0, object-shorthand: 0, prefer-arrow-callback: 0*/ /* ES5 code */
const errors = require('@feathersjs/errors');
const utils = require('feathers-hooks-common/lib/services');
const joiErrorsForForms = require('joi-errors-for-forms');

// We only directly need the convert option. The others are listed for convenience.
// See defaults at https://hapi.dev/family/joi/api/?v=17.1.0#anyvalidatevalue-options
const joiDefaults = {
  abortEarly: true,
  allowUnknown: false,
  cache: true,
  convert: true,
  debug: false,
  externals: true,
  noDefaults: false,
  nonEnumerables: false,
  presence: 'optional',
  skipFunctions: false,
  stripUnknown: false
};

function setupValidateWithJoi(joiSchema, joiOptions, translator, ifTest) {
  if (!['undefined', 'object'].includes(typeof joiOptions)) {
    throw new errors.GeneralError('joiOptions must be a valid object.');
  }

  const mergedOptions = Object.assign({}, joiDefaults, joiOptions);

  return async function validateWithJoi(context) {
    utils.checkContext(context, 'before', ['create', 'update', 'patch'], 'validate-joi');
    const values = utils.getItems(context);


    try {
      const convertedValues = await joiSchema.validateAsync(values, mergedOptions);

      if (mergedOptions.convert === true) {
        utils.replaceItems(context, convertedValues);
      }

      return context;
    } catch (error) {
      const formErrors = translator(error);
      if (formErrors) {
        // Hacky, but how else without a custom assert?
        const msg = ifTest ? JSON.stringify(formErrors) : 'Invalid data';
        throw new errors.BadRequest(msg, { errors: formErrors });
      }
      return formErrors || error;
    }
  };
}

module.exports = {
  form: function (joiSchema, joiOptions, translations, ifTest) {
    const translator = joiErrorsForForms.form(translations);
    return setupValidateWithJoi(joiSchema, joiOptions, translator, ifTest);
  },
  mongoose: function (joiSchema, joiOptions, translations, ifTest) {
    const translator = joiErrorsForForms.mongoose(translations);
    return setupValidateWithJoi(joiSchema, joiOptions, translator, ifTest);
  }
};
