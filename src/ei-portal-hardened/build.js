// Build the hardened portal bundle. esbuild produces a single IIFE with NO global name, so
// nothing is attached to window; the bundle's only global contact is the self-removing
// 'ei:mount' listener in index.jsx. We then obfuscate the minified output when the obfuscator
// is available (control-flow flattening, string encryption, self-defending). Obfuscation is a
// deterrence layer, never a security guarantee, so if the tool is absent we ship the minified
// bundle and say so.
var esbuild = require('esbuild');
var fs = require('fs');

esbuild.build({
  entryPoints: ['src/index.jsx'],
  bundle: true,
  format: 'iife',          // no globalName: the IIFE returns nothing to the global scope
  minify: true,
  target: ['es2017'],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: 'bundle.min.js'
}).then(function () {
  var code = fs.readFileSync('bundle.min.js', 'utf8');
  var out = code;
  var mode = 'minified';
  try {
    var Obf = require('javascript-obfuscator');
    // Deliberately moderate: obfuscation is deterrence, not the guarantee, and React is public,
    // so we avoid the heavyweight transforms that bloat the bundle and slow reconciliation.
    var res = Obf.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.25,
      deadCodeInjection: false,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.5,
      splitStrings: false,
      // selfDefending is intentionally OFF: it overrides Function.prototype.toString, which we
      // freeze in freezeIntrinsics(); the two conflict. The intrinsic freeze is the stronger
      // protection, so obfuscation keeps string encryption + control-flow flattening + renaming.
      selfDefending: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'mangled',
      transformObjectKeys: false,
      numbersToExpressions: false,
      target: 'browser'
    });
    out = res.getObfuscatedCode();
    mode = 'obfuscated';
  } catch (e) {
    process.stderr.write('obfuscator unavailable, shipping minified: ' + e.message + '\n');
  }
  fs.writeFileSync('react-bundle.js', out);
  process.stdout.write('build ' + mode + ' bytes=' + out.length + '\n');
}).catch(function (e) {
  process.stderr.write('build failed: ' + (e && e.message) + '\n');
  process.exit(1);
});
