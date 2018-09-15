requirejs.config({
    paths: {
        app:'../dist/app',
        Phaser: '/node_modules/phaser/dist/phaser.min',
    }
});

requirejs(['app'], function(app) {
    new app.App().run();
});