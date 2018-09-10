define(["require", "exports", "phaser"], function (require, exports, phaser_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var App = (function () {
        function App() {
        }
        App.run = function () {
            new phaser_1.Game();
            console.log('We created a new game!');
        };
        return App;
    }());
    App.run();
});
//# sourceMappingURL=app.js.map