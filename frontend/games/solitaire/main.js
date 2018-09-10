requirejs.config({
    paths: {
        app:'../dist/app',
        Phaser: '/node_modules/phaser/dist/phaser.min',
    }
});

requirejs(['app', 'Phaser'], function(app, phaser) {
    console.log('starting application...');
    console.log(phaser);

    var myApp = new app.App();
    myApp.run();
});