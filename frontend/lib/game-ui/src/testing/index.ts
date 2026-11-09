// @fz/ui holds the fake, since its ThemeService asks the color scheme; a
// game's specs take it here, beside the viewport service it answers.
export { type FakeViewport, installFakeViewport } from "@fz/ui/testing";
export { barChoice, chooseInBar, openBarMenu } from "./bar_menus";
