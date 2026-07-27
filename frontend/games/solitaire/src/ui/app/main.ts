import "zone.js";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./component/app/app.component";
import "./styles.css";

bootstrapApplication(AppComponent).catch((err: unknown) => {
  console.error(err);
});
