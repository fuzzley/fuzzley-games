import { Solitaire } from "./solitaire";

declare global {
  interface Window {
    solitaire: Solitaire;
  }
}

const solitaire = new Solitaire(window);
window.solitaire = solitaire;
solitaire.start();
