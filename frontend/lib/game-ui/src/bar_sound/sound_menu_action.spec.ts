import { soundMenuAction } from "./sound_menu_action";

describe("soundMenuAction", () => {
  it("offers to turn the sound off while it is on", () => {
    expect(soundMenuAction(true)).toEqual({
      id: "sound",
      label: "Turn sound off",
      icon: "sound-off",
    });
  });

  it("offers to turn the sound on while it is off", () => {
    expect(soundMenuAction(false)).toEqual({
      id: "sound",
      label: "Turn sound on",
      icon: "sound",
    });
  });
});
