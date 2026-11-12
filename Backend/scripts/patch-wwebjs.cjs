// Runs after `npm install` (package.json "postinstall"). whatsapp-web.js 1.34.7 can't send media on current WhatsApp Web:
// the media data it spreads into the outgoing message carries its own `__x_id`, which replaces the message id, and
// WhatsApp throws "Data passed to getter must include an id property (it's how we memoize) but got undefined".
// Text is unaffected. Fixed upstream (wwebjs/whatsapp-web.js#201922, PR #201923) but not released on npm yet:
// this applies the same one-line fix. It does nothing once the installed version already has it.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'whatsapp-web.js', 'src', 'util', 'Injected', 'Utils.js');
if (!fs.existsSync(file)) {
    console.log('patch-wwebjs: whatsapp-web.js not installed, nothing to patch');
    process.exit(0);
}
const src = fs.readFileSync(file, 'utf8');
if (src.includes('message.__x_id')) {
    console.log('patch-wwebjs: media id fix already present');
    process.exit(0);
}
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const anchor = `            ...extraOptions,${eol}        };${eol}`;
if (!src.includes(anchor)) {
    console.warn('patch-wwebjs: whatsapp-web.js changed shape, media id fix NOT applied - check that media sends still work');
    process.exit(0);
}
const fix = `${eol}        // media data carries its own __x_id, which replaced the message id (wwebjs#201922)${eol}        delete message.__x_id;${eol}`;
fs.writeFileSync(file, src.replace(anchor, anchor + fix));
console.log('patch-wwebjs: applied media id fix');
