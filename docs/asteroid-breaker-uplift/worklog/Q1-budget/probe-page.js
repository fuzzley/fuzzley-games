async (opts) => {
  // In-page probe: times each layer's render, each painter's draw, the scene's update, the shell's tick and the
  // whole step over a number of frames, counts the WebGL calls each layer makes, logs one frame's calls in order, and
  // counts what each layer holds and what of it would render. Options: frames, the frames it measures (240); logFrame,
  // the frame whose calls it logs (30); hide, layers it hides first; prune, layers it takes what wouldn't render out
  // of first, changing the scene. Needs build.sh's probe build, which hands it the scene (globalThis.__belt) and its
  // layers by name (globalThis.__beltLayers).
  const { frames: wanted = 240, hide = [], logFrame = 30 } = opts ?? {};
  // The field's layers by name, in their order, as the probe build hands them over.
  const named = globalThis.__beltLayers ?? {};
  const LAYERS = Object.keys(named);
  const scene = globalThis.__belt;
  const layers = Object.values(named);
  if (!scene || layers.length === 0)
    return { error: "the build hands the probe no scene" };
  const game = scene.game;
  for (const name of hide) layers[LAYERS.indexOf(name)].setVisible(false);
  const cam0 = scene.cameras.main;
  for (const name of opts?.prune ?? []) {
    const layer = layers[LAYERS.indexOf(name)];
    const hidden = layer.list.filter((child) => !child.willRender(cam0));
    layer.remove(hidden);
  }
  let label = "outside";
  let logging = false;
  const seq = [];
  const time = {};
  const add = (k, v) => (time[k] = (time[k] ?? 0) + v);
  const calls = {};
  const objects = {};
  layers.forEach((layer, i) => {
    const name = LAYERS[i];
    const step = layer._renderSteps[0];
    layer._renderSteps[0] = function (...args) {
      const prev = label;
      label = name;
      const s = performance.now();
      try {
        return step.apply(this, args);
      } finally {
        add(`layer:${name}`, performance.now() - s);
        label = prev;
      }
    };
  });
  // Painters by their kit names.
  const names = new Map(Object.entries(scene.kit).map(([k, v]) => [v, k]));
  for (const painter of scene.painters) {
    const name = names.get(painter) ?? "?";
    const draw = painter.draw;
    painter.draw = function (...args) {
      const s = performance.now();
      try {
        return draw.apply(this, args);
      } finally {
        add(`paint:${name}`, performance.now() - s);
      }
    };
  }
  const wrapTime = (obj, key, name) => {
    const fn = obj[key];
    obj[key] = function (...args) {
      const s = performance.now();
      try {
        return fn.apply(this, args);
      } finally {
        add(name, performance.now() - s);
      }
    };
  };
  wrapTime(scene.sys, "sceneUpdate", "update");
  wrapTime(scene.options, "tick", "tick");
  wrapTime(game.scene, "render", "render");
  wrapTime(game.renderer, "postRender", "postRender");
  wrapTime(game.renderer, "preRender", "preRender");
  // WebGL calls, by the layer rendering.
  const gl = game.renderer.gl;
  const programs = new Map();
  const textures = new Map();
  const id = (map, o) => {
    if (!o) return 0;
    if (!map.has(o)) map.set(o, map.size + 1);
    return map.get(o);
  };
  const glNames = [
    "drawElements",
    "drawArrays",
    "useProgram",
    "bindTexture",
    "activeTexture",
    "bufferSubData",
    "bufferData",
    "bindFramebuffer",
    "scissor",
    "uniform1f",
    "uniform1i",
    "uniform2f",
    "uniform3f",
    "uniform4f",
    "uniform1fv",
    "uniform1iv",
    "uniform2fv",
    "uniform3fv",
    "uniform4fv",
    "uniformMatrix4fv",
    "uniformMatrix3fv",
    "bindVertexArray",
    "bindBuffer",
    "vertexAttribPointer",
    "enableVertexAttribArray",
    "texSubImage2D",
    "texImage2D",
    "clear",
    "blendFunc",
    "blendFuncSeparate",
    "enable",
    "disable",
    "viewport",
  ];
  for (const name of glNames) {
    const fn = gl[name];
    if (typeof fn !== "function") continue;
    gl[name] = function (...args) {
      const c = (calls[label] ??= {});
      c[name] = (c[name] ?? 0) + 1;
      if (name === "drawElements") c.quads = (c.quads ?? 0) + args[1] / 6;
      if (logging) {
        let detail = "";
        if (name === "useProgram") detail = `p${id(programs, args[0])}`;
        else if (name === "bindTexture") detail = `t${id(textures, args[1])}`;
        else if (name === "activeTexture") detail = `u${args[0] - gl.TEXTURE0}`;
        else if (name === "drawElements") detail = `${args[1] / 6}q`;
        else if (name.startsWith("uniform")) detail = "";
        seq.push(`${label} ${name} ${detail}`);
      }
      return fn.apply(this, args);
    };
  }
  let frames = 0;
  const loop = game.loop;
  const callback = loop.callback;
  let stepTime = 0;
  await new Promise((resolve) => {
    loop.callback = function (...args) {
      if (frames === logFrame) logging = true;
      const s = performance.now();
      try {
        return callback.apply(this, args);
      } finally {
        stepTime += performance.now() - s;
        logging = false;
        frames++;
        if (frames === wanted) {
          loop.callback = callback;
          resolve();
        }
      }
    };
  });
  // Objects each layer would render now, by type and whether lit.
  layers.forEach((layer, i) => {
    const cam = scene.cameras.main;
    const counts = { all: layer.list.length };
    for (const child of layer.list) {
      if (!child.willRender(cam)) continue;
      const k = `${child.type}${child.lighting ? "*" : ""}:${child.texture?.key ?? ""}`;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    objects[LAYERS[i]] = counts;
  });
  const per = (v) => Number((v / frames).toFixed(4));
  return {
    frames,
    step: per(stepTime),
    time: Object.fromEntries(
      Object.entries(time)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, per(v)]),
    ),
    calls: Object.fromEntries(
      Object.entries(calls).map(([k, v]) => [
        k,
        Object.fromEntries(
          Object.entries(v).map(([n, c]) => [
            n,
            Number((c / frames).toFixed(2)),
          ]),
        ),
      ]),
    ),
    objects,
    seq,
  };
};
