/**
 * Sahana Eden Mobile - Form Validation
 *
 * Copyright (c) 2016-2019 Sahana Software Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function(EdenMobile) {

    "use strict";

    // ========================================================================
    // Validation rules
    // - translate rule+options into directives and error messages
    // - directives can be added as attributes to the HTML input element
    // - messages are to be rendered as optional elements in the form
    //   row to show if there is an error for any of the directives (||):
    //   => ng-show = 'wizard.<fieldName>.$error.<attr>'
    //
    var rules = {

        // --------------------------------------------------------------------
        isNotEmpty: function(options) {

            var errorMsg = options.error;
            if (!errorMsg) {
                errorMsg = 'Enter a value';
            }

            return {
                directives: {'ng-required': 'true'},
                errors: ['required'],
                message: errorMsg
            };

        },

        // --------------------------------------------------------------------
        /**
         * isIntInRange
         *
         * @param {object} options - the options for the rule
         *  @keyword {integer} options.min - the minimum value
         *  @keyword {integer} options.max - the maximum value
         *
         * @returns {object} - an object {directives: {'attr': 'value'}, error: 'message'}
         */
        isIntInRange: function(options) {

            var directives = {'ng-pattern': '/^[-+]?[0-9]*$/'},
                errors = ['number', 'pattern'],
                min = options.min,
                max = options.max;
            if (min !== undefined && !isNaN(min - 0)) {
                min = directives.min = '' + min;
            }
            if (max !== undefined && !isNaN(max - 0)) {
                max = directives.max = '' + max;
            }

            var errorMsg = options.error;
            if (!errorMsg) {
                if (min && max) {
                    errorMsg = 'Enter an integer between ' + min + ' and ' + max;
                    errors = errors.concat(['min', 'max']);
                } else if (min) {
                    errorMsg = 'Enter an integer >= ' + min;
                    errors.push('min');
                } else if (max) {
                    errorMsg = 'Enter an integer <= ' + max;
                    errors.push('max');
                } else {
                    errorMsg = 'Enter an integer';
                }
            }

            return {
                directives: directives,
                errors: errors,
                message: errorMsg,
            };
        },

        // --------------------------------------------------------------------
        /**
         * isFloatInRange
         *
         * @param {object} options - the options for the rule
         *  @keyword {integer} options.min - the minimum value
         *  @keyword {integer} options.max - the maximum value
         *
         * @returns {object} - an object {directives: {'attr': 'value'}, error: 'message'}
         */
        isFloatInRange: function(options) {

            var directives = {},
                errors = ['number'],
                min = options.min,
                max = options.max;
            if (min !== undefined && !isNaN(min - 0)) {
                min = directives.min = '' + min;
            }
            if (max !== undefined && !isNaN(max - 0)) {
                max = directives.max = '' + max;
            }

            var errorMsg = options.error;
            if (!errorMsg) {
                if (min && max) {
                    errorMsg = 'Enter a number between ' + min + ' and ' + max;
                    errors = errors.concat(['min', 'max']);
                } else if (min) {
                    errorMsg = 'Enter a number >= ' + min;
                    errors.push('min');
                } else if (max) {
                    errorMsg = 'Enter a number <= ' + max;
                    errors.push('max');
                } else {
                    errorMsg = 'Enter a number';
                }
            }

            return {
                directives: directives,
                errors: errors,
                message: errorMsg,
            };
        },

        // --------------------------------------------------------------------
        /**
         * isJson
         *
         * @returns {object} - an object {directives: {'attr': 'value'}, error: 'message'}
         */
        isJson: function(options) {

            var errorMsg = options.error;
            if (!errorMsg) {
                errorMsg = 'Enter a valid JSON expression';
            }

            return {
                directives: {'is-json': ''},
                errors: ['json', 'parse'],
                message: errorMsg
            };
        }
    };

    // ========================================================================
    /**
     * Service to produce validation directives for form inputs
     */
    EdenMobile.factory('emValidate', [

        function() {

            /**
             * Encode a validation rule as an array of validator directives
             * and error messages
             *
             * @param {string} name: the name of the validation rule
             * @param {object} options: options for the rule
             *
             * @returns {Array} - an object {directives: {'attr': 'value'}, error: 'message'},
             *
             * @example
             *   requires = encode('isIntInRange', {min: 1, max: 100});
             */
            var encode = function(name, options) {

                var rule = rules[name];
                if (rule) {
                    if (!options) {
                        options = {};
                    }
                    return rule(options);
                } else {
                    return null;
                }
            };

            // --------------------------------------------------------------------
            /**
             * Get validation directives for a field
             *
             * @param {Field} field - the field
             *
             * @returns: an array of validation directives:
             *           [{directives: {'attr': 'value'}, error: 'message'}, ...]
             *
             */
            var getDirectives = function(field) {

                var fieldDescription = field._description,
                    settings = fieldDescription.settings,
                    requires = fieldDescription.requires || (settings && settings.requires);

                if (!requires) {
                    // Fall back to default validators for the field type
                    requires = {};
                    switch(field.type) {
                        case 'double':
                            requires.isFloatInRange = {};
                            break;
                        case 'integer':
                            requires.isIntInRange = {};
                            break;
                        case 'json':
                            requires.isJson = null;
                            break;
                        default:
                            break;
                    }
                }

                // Add isNotEmpty to any field marked as required (unless already present):
                // - marks the field as invalid as long as it is not filled
                // - shows an error message if the field is left empty
                if (fieldDescription.required && requires.isNotEmpty === undefined) {
                    if (field.hasOptions()) {
                        // Typically using a selector, so adapt language of error message
                        if (field.type.slice(0, 5) == 'list:') {
                            requires.isNotEmpty = {error: 'Select at least one option'};
                        } else {
                            requires.isNotEmpty = {error: 'Select a value'};
                        }
                    } else {
                        requires.isNotEmpty = null;
                    }
                }

                var directives = [],
                    ruleName,
                    rule;
                if (requires) {
                    for (ruleName in requires) {
                        rule = encode(ruleName, requires[ruleName]);
                        if (rule) {
                            directives.push(rule);
                        }
                    }
                }
                return directives;
            };

            // --------------------------------------------------------------------
            // API
            //
            return {
                encode: encode,
                getDirectives: getDirectives
            };
        }
    ]);

})(EdenMobile);