// Build the faithful hardened portal. esbuild -> single IIFE (no global name), minified, with
// the stylesheet imported as text. Then moderate obfuscation (string encryption + control-flow
// flattening + renaming; selfDefending off, it conflicts with the intrinsic freeze).
var esbuild = require('esbuild');
var fs = require('fs');

esbuild.build({
  entryPoints: ['src/index.jsx'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2017'],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  legalComments: 'none',
  loader: { '.css': 'text' },
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: 'bundle.min.js'
}).then(function () {
  var code = fs.readFileSync('bundle.min.js', 'utf8');
  var out = code, mode = 'minified';
  try {
    var Obf = require('javascript-obfuscator');
    out = Obf.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.2,
      deadCodeInjection: false,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.5,
      splitStrings: false,
      selfDefending: false,
      identifierNamesGenerator: 'mangled',
      transformObjectKeys: false,
      numbersToExpressions: false,
      target: 'browser'
    }).getObfuscatedCode();
    mode = 'obfuscated';
  } catch (e) { process.stderr.write('obfuscator unavailable: ' + e.message + '\n'); }
  fs.writeFileSync('react-bundle.js', out);
  process.stdout.write('build ' + mode + ' bytes=' + out.length + '\n');
}).catch(function (e) {
  process.stderr.write('build failed: ' + (e && e.message) + '\n'); process.exit(1);
});
