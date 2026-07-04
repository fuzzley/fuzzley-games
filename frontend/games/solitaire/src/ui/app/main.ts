import "zone.js";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app.component";
import "@/game/index";

bootstrapApplication(AppComponent).catch((err) => console.error(err));
