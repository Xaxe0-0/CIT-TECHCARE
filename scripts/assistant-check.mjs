// Checks the assistant's fix matching against a running Ollama with the configured models.
// Run after changing tech-fixes.mjs or the models: npm run test:assistant
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd(), true);
const { matchFix } = await import('../backend/src/services/assistant.mjs');
// [question, expected fix title or null when the model should write or decline instead]
const cases = [
  ['My laptop battery drains fast', 'Battery drains too fast'],
  ['My laptop is plugged in but not charging', 'Laptop not charging'],
  [
    'Ayaw mag-connect ng bluetooth headphones ko sa phone',
    'Bluetooth device will not pair or connect',
  ],
  ['My wifi is really slow at night', 'Slow internet speed'],
  ['no internet but wifi connected', 'Wi-Fi connected but no internet'],
  ['how do I get rid of a virus', 'Virus, malware, or unwanted pop-ups'],
  ['Excel keeps crashing when I open a file', 'Word, Excel, or PowerPoint crashing or not opening'],
  ['Printer says offline on Windows 11', 'Printer shows offline (Windows 11)'],
  ['My laptop is very slow when I open Chrome', 'Slow or misbehaving web browser'],
  ['walang tunog laptop ko', 'No sound on a Windows computer'],
  ['my phone gets really hot when charging', 'Device overheating'],
  ['projector not detected', 'Second screen or projector not showing'],
  ['I clicked a link in a weird email', 'Suspicious email, message, or link'],
  ['zoom cant hear me', 'Microphone or camera not working (Windows)'],
  ['mabagal ang phone ko', 'Phone running slow'],
  ['my laptop wont turn on', 'Laptop or computer will not turn on or has a black screen'],
  ['i forgot my gmail password', 'Forgot an account password'],
  ['phone storage full', 'Phone or computer storage full'],
  ['my keyboard types wrong letters', 'Keyboard or mouse not working'],
  ['how do I take a screenshot on my laptop', 'How to take a screenshot'],
  ['my screen is flickering', 'Screen flickering (Windows)'],
  ['my phone keeps restarting by itself', 'Phone restarting by itself'],
  ['my laptop fan is very loud', 'Laptop fan loud or running constantly'],
  ['My printer prints blank pages', null],
  ['my printer is jammed', null],
  ['word count of my essay', null],
  ['How do I make a pivot table in Excel', null],
  ['how do I share my screen in zoom', null],
  ['how to fix blue screen of death', null],
  ['What is the capital of France?', null],
];
let failures = 0;
for (const [question, expected] of cases) {
  const fix = await matchFix(question, new AbortController().signal);
  const ok = (fix?.title || null) === expected;
  failures += !ok;
  console.log(ok ? 'PASS' : 'FAIL', question, '=>', fix?.title || 'model answers or declines');
}
console.log(
  failures ? `${failures} of ${cases.length} failed` : `All ${cases.length} matched as expected.`,
);
process.exitCode = failures ? 1 : 0;
