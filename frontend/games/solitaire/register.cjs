const util = require("util");
if (!util.styleText) {
  const codes = {
    bold: [1, 22],
    italic: [3, 23],
    underline: [4, 24],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    gray: [90, 39],
    grey: [90, 39],
  };
  util.styleText = function (format, text) {
    const formats = Array.isArray(format) ? format : [format];
    let result = text;
    for (const f of formats) {
      const code = codes[f];
      if (code) {
        result = `\u001b[${code[0]}m${result}\u001b[${code[1]}m`;
      }
    }
    return result;
  };
}
