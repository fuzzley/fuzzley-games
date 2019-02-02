import 'phaser';

class App {
    public run() {
        console.log('Hello');
        new Phaser.Game();
        console.log('Bye');
    }
}

console.log('We at least got here..');
const app = new App();
app.run();