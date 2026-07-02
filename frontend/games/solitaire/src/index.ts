import { Solitaire } from "./solitaire";

const solitaire = new Solitaire(window);
(window as any).solitaire = solitaire;
solitaire.start();
