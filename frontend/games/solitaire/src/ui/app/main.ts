import "zone.js";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./component/app/app.component";
import "./styles.css";
import "@/game/index";

bootstrapApplication(AppComponent).catch((err) => console.error(err));
