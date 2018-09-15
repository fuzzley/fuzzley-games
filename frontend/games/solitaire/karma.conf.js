module.exports = function(config) {
    config.set({
        frameworks: ['jasmine', 'karma-typescript'],
        plugins: [
          'karma-jasmine',
          'karma-chrome-launcher',
          'karma-typescript',
          'karma-coverage'
        ],
        files: [
            { pattern: 'src/**/*.ts' },
            { pattern: 'test/**/*.ts' }
        ],
        preprocessors: {
            'src/**/*.ts': ['karma-typescript', 'coverage'],
            'test/**/*.ts': ['karma-typescript']
        },
        reporters: ['progress', 'coverage', 'karma-typescript'],
        browsers: ['Chrome']
    });
};