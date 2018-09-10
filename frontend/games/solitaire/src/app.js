System.register(["phaser"], function (exports_1, context_1) {
    "use strict";
    var phaser_1, App;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (phaser_1_1) {
                phaser_1 = phaser_1_1;
            }
        ],
        execute: function () {
            App = (function () {
                function App() {
                }
                App.run = function () {
                    new phaser_1.Game();
                    console.log('We created a new game!');
                };
                return App;
            }());
            App.run();
        }
    };
});
//# sourceMappingURL=app.js.map