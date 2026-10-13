// Verified fixes for the most common problems. The assistant model is told to base its answer on
// the matching entries and keep their menu paths, which keeps a small local model accurate.
// Keep steps standard and safe; check menu paths against current Windows/Android/iPhone builds.
export const techFixes = [
  {
    title: 'Wi-Fi connected but no internet',
    keywords: [
      'no internet',
      'connected but',
      'no connection',
      'walang internet',
      'internet not working',
      'cannot browse',
      'dns',
    ],
    steps: [
      'Check whether other devices on the same Wi-Fi also have no internet. If they do, the problem is the router or provider.',
      'Restart the router: unplug it for 60 seconds, plug it back in, and wait 2 minutes.',
      'On the device, turn Wi-Fi off and on, or forget the network and reconnect.',
      'Windows 11: run Settings > System > Troubleshoot > Other troubleshooters > Network and Internet.',
      'Windows 11 last resort: Settings > Network & internet > Advanced network settings > Network reset (you will need to re-enter Wi-Fi passwords).',
    ],
  },
  {
    title: 'Cannot connect to Wi-Fi or Wi-Fi is missing',
    keywords: ['wifi', 'wi-fi', 'wireless', 'cant connect', 'wrong password'],
    steps: [
      'Make sure Wi-Fi is on and airplane mode is off.',
      'Forget the network, then reconnect and type the password carefully.',
      'Restart the device and the router.',
      'Move closer to the router to rule out weak signal.',
      'Windows 11: run Settings > System > Troubleshoot > Other troubleshooters > Network and Internet. Check Device Manager > Network adapters only to update or re-enable the Wi-Fi adapter.',
    ],
  },
  {
    title: 'Slow computer',
    keywords: [
      'slow',
      'mabagal',
      'lag',
      'lagging',
      'sluggish',
      'hang',
      'takes long',
      'performance',
    ],
    steps: [
      'Restart the computer; many slowdowns clear after a full restart.',
      'Open Task Manager with Ctrl + Shift + Esc and sort by CPU and Memory to find heavy apps; close the ones you do not need.',
      'Turn off unneeded startup apps in Settings > Apps > Startup.',
      'Free disk space in Settings > System > Storage and turn on Storage Sense; keep at least 15 to 20 percent free.',
      'Install updates in Settings > Windows Update, then run a full scan in Windows Security.',
    ],
  },
  {
    title: 'Slow or misbehaving web browser',
    keywords: ['chrome', 'browser', 'edge', 'firefox', 'website', 'tabs', 'extension'],
    steps: [
      'Close tabs you are not using; each tab uses memory.',
      'In Chrome, press Shift + Esc to open Chrome Task Manager and end heavy tabs or extensions.',
      'Turn off extensions you do not need at chrome://extensions.',
      'Clear cached images and files with Ctrl + Shift + Delete (choose a time range, then clear).',
      'Update the browser from its menu under Help > About, then restart it.',
    ],
  },
  {
    title: 'No sound on a Windows computer',
    keywords: [
      'no sound',
      'sound',
      'audio',
      'speaker',
      'speakers',
      'walang tunog',
      'volume',
      'headphones not working',
    ],
    steps: [
      'Check the volume icon on the taskbar is not muted and the volume is up.',
      'In Settings > System > Sound, choose the correct output device (speakers or headphones).',
      'Unplug and reconnect headphones or USB/Bluetooth audio devices.',
      'Run Settings > System > Troubleshoot > Other troubleshooters > Audio.',
      'Restart the computer and install updates in Settings > Windows Update.',
    ],
  },
  {
    title: 'Microphone or camera not working (Windows)',
    keywords: [
      'microphone',
      'mic',
      'camera',
      'webcam',
      'zoom',
      'google meet',
      'teams',
      'cannot hear me',
    ],
    steps: [
      'Close other apps that might be using the camera or microphone.',
      'Allow access in Settings > Privacy & security > Camera or Microphone, including for desktop apps.',
      'Choose the right input in Settings > System > Sound > Input, and select the same device inside Zoom, Meet, or Teams.',
      'Check for a physical camera shutter or a mute key on the keyboard.',
      'Restart the computer and try again.',
    ],
  },
  {
    title: 'Printer shows offline (Windows 11)',
    keywords: ['printer', 'print', 'printing', 'offline', 'mag-print'],
    excludes: ['blank', 'jam', 'jammed', 'streaks', 'faded', 'smudge', 'ink', 'toner'],
    steps: [
      'Turn the printer off and on, and check its cable or that it is on the same Wi-Fi network as the computer.',
      'Open Settings > Bluetooth & devices > Printers & scanners, select the printer, and open the print queue.',
      'In the print queue, make sure "Use printer offline" is not ticked, and cancel stuck print jobs.',
      'Set it as the default printer or select it again in the print window.',
      'If it still shows offline, remove the printer there and add it again.',
    ],
  },
  {
    title: 'Bluetooth device will not pair or connect',
    keywords: ['bluetooth', 'pair', 'pairing', 'earbuds', 'headset', 'airpods', 'speaker connect'],
    steps: [
      'Turn Bluetooth off and on on both the phone or computer and the accessory, and charge the accessory.',
      'Put the accessory in pairing mode (usually holding its power or pairing button until a light flashes).',
      'Remove the old pairing, then pair again: iPhone Settings > Bluetooth > (i) > Forget This Device; Android Settings > Connected devices or Connections > Bluetooth; Windows Settings > Bluetooth & devices.',
      'Disconnect the accessory from other phones or computers nearby.',
      'Restart the phone or computer and try again.',
    ],
  },
  {
    title: 'Laptop not charging',
    keywords: [
      'laptop not charging',
      'plugged in not charging',
      'battery',
      'charger',
      'charging',
      'ayaw mag-charge',
    ],
    steps: [
      'Check both ends of the charger and try another wall outlet.',
      'Look for a charging light; if the cable or plug is damaged, stop using it.',
      'Shut the laptop down, unplug it, then plug the charger in for 30 minutes before turning it on.',
      'Install updates in Settings > Windows Update and check battery details in Settings > System > Power & battery.',
      'If it still will not charge, have the charger or battery checked; use only the original or an approved charger.',
    ],
  },
  {
    title: 'Laptop or computer will not turn on or has a black screen',
    keywords: [
      'will not start',
      'wont start',
      'won t start',
      'not starting',
      'will not turn on',
      'wont turn on',
      'won t turn on',
      'black screen',
      'no display',
      'dead',
      'ayaw mag-on',
      'blank screen',
    ],
    steps: [
      'Plug in the charger and wait 15 to 30 minutes in case the battery is fully drained.',
      'Hold the power button for 15 to 30 seconds, release, then press it once.',
      'Unplug USB drives, docks, and other accessories, then try again.',
      'If you hear fans or see lights but no picture, raise the brightness or connect an external monitor.',
      'If nothing responds, have it checked by a qualified technician.',
    ],
  },
  {
    title: 'App or computer frozen',
    keywords: ['frozen', 'freeze', 'not responding', 'stuck', 'crash', 'crashing', 'nag-hang'],
    steps: [
      'Wait a minute in case the app is finishing a task.',
      'Windows: press Ctrl + Shift + Esc, select the app in Task Manager, and choose End task.',
      'Phone: close the app from the recent apps view, then open it again.',
      'Restart the device if the whole system is frozen; hold the power button only as a last resort.',
      'Update the app and the system, and reinstall the app if it keeps crashing.',
    ],
  },
  {
    title: 'Phone or computer storage full',
    keywords: ['storage', 'full', 'space', 'memory full', 'puno'],
    steps: [
      'iPhone: check Settings > General > iPhone Storage and offload apps you rarely use.',
      'Android: open Settings > Storage, or use the Files app to clean up junk files.',
      'Windows: open Settings > System > Storage and turn on Storage Sense.',
      'Delete or back up large videos and downloads, and empty the trash or Recycle Bin.',
      'Clear large app caches, such as messaging apps that save media automatically.',
    ],
  },
  {
    title: 'Windows Update stuck or failing',
    keywords: ['windows update', 'update stuck', 'update failed', 'updating', 'update error'],
    steps: [
      'Keep the computer plugged in and wait; large updates can take an hour.',
      'Restart the computer and try Settings > Windows Update again.',
      'Run Settings > System > Troubleshoot > Other troubleshooters > Windows Update.',
      'Free disk space in Settings > System > Storage.',
      'If the same error repeats, note the error code and ask for help.',
    ],
  },
  {
    title: 'Second screen or projector not showing',
    keywords: ['projector', 'monitor', 'second screen', 'external display', 'hdmi', 'tv'],
    steps: [
      'Check the cable is firmly connected at both ends and the display is on the correct input.',
      'Press Windows key + P and choose Duplicate or Extend.',
      'Open Settings > System > Display, then under Multiple displays select Detect.',
      'Try another cable or port, or an adapter if the laptop uses USB-C.',
      'Restart the computer with the display connected.',
    ],
  },
  {
    title: 'Keyboard or mouse not working',
    keywords: ['keyboard', 'mouse', 'touchpad', 'trackpad', 'keys', 'wrong letters', 'typing'],
    steps: [
      'For wireless devices, replace or charge the batteries and switch them off and on.',
      'Reconnect USB devices or try another USB port.',
      'Check for a touchpad on/off key (often a function key) and Settings > Bluetooth & devices > Touchpad on Windows.',
      'Re-pair Bluetooth devices in Settings > Bluetooth & devices.',
      'If keys type the wrong characters, press Windows key + Space to switch keyboard layout, or check Settings > Time & language > Language & region.',
      'Restart the computer.',
    ],
  },
  {
    title: 'Deleted file recovery',
    keywords: ['deleted', 'recover', 'lost file', 'recycle bin', 'nabura'],
    steps: [
      'Check the Recycle Bin (Windows) or Trash (Mac), select the file, and restore it.',
      'Search File Explorer or Finder for the file name in case it was moved.',
      'If it was in OneDrive or Google Drive, check that service’s recycle bin on the website.',
      'Stop saving new files to that drive until you find it.',
      'Back up important files regularly to avoid losing them.',
    ],
  },
  {
    title: 'Virus, malware, or unwanted pop-ups',
    keywords: [
      'virus',
      'malware',
      'infected',
      'spyware',
      'pop-ups',
      'popups',
      'adware',
      'may virus',
    ],
    steps: [
      'Disconnect from the internet if you see ransom messages or files changing on their own.',
      'Open Settings > Privacy & security > Windows Security > Virus & threat protection and update protection.',
      'Under Scan options, run a Full scan, and remove anything it finds.',
      'If problems continue, run Microsoft Defender Offline scan from the same Scan options page; the computer restarts to scan.',
      'Uninstall programs you do not recognise in Settings > Apps > Installed apps, and remove unknown browser extensions.',
      'Change important passwords from a clean device and turn on two-step verification.',
    ],
  },
  {
    title: 'Mouse scrolling or pointer jumps',
    keywords: [
      'scroll',
      'scrolling',
      'scroll wheel',
      'jumps',
      'jumpy',
      'cursor',
      'pointer',
      'mouse',
    ],
    steps: [
      'Use the mouse on a clean, non-shiny surface or a mouse pad, and clean the sensor and wheel gently.',
      'Replace or charge the batteries, or plug a USB receiver into another port closer to the mouse.',
      'Adjust the scroll amount in Settings > Bluetooth & devices > Mouse ("Lines to scroll at a time").',
      'Try the mouse on another computer; if the problem follows the mouse, the mouse is likely worn out.',
      'Restart the computer and install updates in Settings > Windows Update.',
    ],
  },
  {
    title: 'Phone running slow',
    keywords: [
      'phone slow',
      'slow phone',
      'cellphone',
      'android slow',
      'iphone slow',
      'mabagal phone',
      'phone lag',
    ],
    steps: [
      'Restart the phone.',
      'Make sure at least 10 percent of storage is free; delete large videos or unused apps.',
      'Install the latest system update and update your apps.',
      'Close apps you are not using, and turn off live wallpapers or widgets you do not need.',
      'If one app is slow, clear its cache (Android) or offload and reinstall it (iPhone).',
    ],
  },
  {
    title: 'Slow internet speed',
    keywords: [
      'slow internet',
      'slow wifi',
      'internet slow',
      'buffering',
      'mabagal internet',
      'mabagal wifi',
      'speed',
    ],
    steps: [
      'Run a speed test, then compare with another device on the same network.',
      'Restart the router: unplug it for 60 seconds, plug it back in, and wait 2 minutes.',
      'Move closer to the router, or switch to its 5 GHz network if available for better speed nearby.',
      'Pause large downloads, updates, and video streaming on other devices.',
      'If speeds stay low on every device, contact your internet provider.',
    ],
  },
  {
    title: 'How to take a screenshot',
    keywords: [
      'screenshot',
      'screen shot',
      'screen capture',
      'snip',
      'print screen',
      'printscreen',
    ],
    steps: [
      'Windows: press Windows key + Shift + S to select an area with Snipping Tool, or Windows key + Print Screen to save the whole screen to Pictures > Screenshots.',
      'Mac: press Shift + Command + 3 for the whole screen, Shift + Command + 4 for an area, or Shift + Command + 5 for more options.',
      'Android: press Power + Volume Down together.',
      'iPhone with Face ID: press the side button + Volume Up. iPhone with a Home button: press the side or top button + Home.',
      'Hide passwords and personal details before sharing a screenshot.',
    ],
  },
  {
    title: 'Screen flickering (Windows)',
    keywords: ['flicker', 'flickering', 'flashing screen', 'screen flashes', 'screen blinking'],
    steps: [
      'Open Task Manager with Ctrl + Shift + Esc. If Task Manager flickers too, the display driver is the likely cause; if it does not, an app is.',
      'For a display driver cause, install updates in Settings > Windows Update, including optional driver updates.',
      'For an app cause, update or uninstall recently installed apps in Settings > Apps > Installed apps.',
      'Check the refresh rate in Settings > System > Display > Advanced display, and reseat or replace the cable on an external monitor.',
      'If the screen flickers even during startup, have the display checked by a technician.',
    ],
  },
  {
    title: 'Phone restarting by itself',
    keywords: [
      'restarting',
      'restarts',
      'reboots',
      'rebooting',
      'keeps restarting',
      'turns off by itself',
    ],
    steps: [
      'Install the latest system update and update all apps.',
      'Free up storage so at least 10 percent is available.',
      'Uninstall apps you installed just before the restarts began.',
      'iPhone: check Settings > Battery > Battery Health & Charging; a worn battery can cause sudden shutdowns. Android: check battery health in Settings > Battery if your phone shows it.',
      'If it keeps restarting, back up your data and have it checked by a technician before trying a factory reset.',
    ],
  },
  {
    title: 'Laptop fan loud or running constantly',
    keywords: ['fan', 'fans', 'loud', 'noisy', 'noise'],
    excludes: ['printer', 'scanner'],
    steps: [
      'Open Task Manager with Ctrl + Shift + Esc and close apps using a lot of CPU.',
      'Use the laptop on a hard, flat surface so the vents are not blocked.',
      'With the laptop shut down and unplugged, gently clear dust from the outside vents.',
      'Install updates in Settings > Windows Update.',
      'If the fan grinds, rattles, or stays loud when idle, have it checked by a technician.',
    ],
  },
  {
    title: 'Battery drains too fast',
    keywords: [
      'battery drains',
      'battery drain',
      'drains',
      'draining',
      'battery life',
      'lowbat',
      'malowbat',
    ],
    steps: [
      'Lower screen brightness and close apps you are not using.',
      'Windows 11: check which apps use the most battery in Settings > System > Power & battery > Battery usage, and turn on Energy saver or Battery saver there.',
      'Android: check usage in Settings > Battery and turn on power saving mode. iPhone: check Settings > Battery and turn on Low Power Mode.',
      'Turn off Bluetooth, location, and Wi-Fi when you do not need them.',
      'Install system and app updates. If the battery still drains quickly or the device shuts down early, have the battery checked.',
    ],
  },
  {
    title: 'Device overheating',
    keywords: ['overheating', 'overheat', 'too hot', 'mainit', 'heats up', 'hot'],
    steps: [
      'If the battery is swollen, or you notice smoke or a burning smell, stop using the device and get qualified help.',
      'Keep vents clear: use laptops on a hard, flat surface, not on beds or pillows.',
      'Close heavy apps and games, and avoid charging while doing demanding tasks.',
      'Keep the device out of direct sunlight and hot cars.',
      'Install system updates; if it still overheats in normal use, have it checked by a technician.',
    ],
  },
  {
    title: 'Word, Excel, or PowerPoint crashing or not opening',
    keywords: ['excel', 'word', 'powerpoint', 'office', 'microsoft 365', 'outlook'],
    // How-to questions about documents are not crashes.
    excludes: [
      'pivot',
      'formula',
      'table',
      'chart',
      'format',
      'font',
      'make',
      'create',
      'write',
      'count',
    ],
    steps: [
      'Save your work, close the app completely, and open it again.',
      'Open the app in safe mode: hold Ctrl while starting it and choose Yes. If it works there, an add-in is likely the cause.',
      'Turn off add-ins in File > Options > Add-ins (choose COM Add-ins > Go).',
      'Update Office in File > Account > Update Options > Update Now.',
      'Repair Office in Settings > Apps > Installed apps: select Microsoft 365 or Office > Modify > Quick Repair.',
    ],
  },
  {
    title: 'Suspicious email, message, or link',
    keywords: ['phishing', 'scam', 'suspicious', 'hacked', 'link', 'fake', 'email', 'message'],
    steps: [
      'Do not click links, open attachments, or reply.',
      'Check the sender through an official channel you already trust, not the contact details in the message.',
      'If you entered a password, change it right away from the official website and turn on two-step verification.',
      'Run a full scan with Windows Security or your device’s built-in protection.',
      'Report the message as phishing in your email app and delete it.',
    ],
  },
  {
    title: 'Forgot an account password',
    keywords: [
      'forgot password',
      'reset password',
      'locked out',
      'cannot log in',
      'cant login',
      'nakalimutan',
    ],
    steps: [
      'Use the official "Forgot password" link on the service’s own website or app.',
      'Check your email or phone for the reset message, including the spam folder.',
      'Never share verification codes or passwords with anyone, including people offering help.',
      'Choose a new, unique password and turn on two-step verification.',
      'For school accounts, contact your school’s official IT help desk.',
    ],
  },
];

const words = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9+\- ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

// Candidates for a question: every word of a keyword must appear anywhere in it ("wifi is slow"
// matches "slow wifi"), and none of the fix's excluded symptom words may appear.
export function findFixes(question, limit = 3) {
  const text = new Set(words(question));
  return techFixes
    .filter((fix) => !(fix.excludes || []).some((word) => text.has(word)))
    .map((fix) => ({
      fix,
      score: fix.keywords.reduce((total, keyword) => {
        const parts = words(keyword);
        return total + (parts.every((part) => text.has(part)) ? parts.length : 0);
      }, 0),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// A question with none of these words is not a tech problem, so it goes to Discussion without
// asking the model (which sometimes answers trivia despite its instructions).
const techWords = new Set(
  `computer laptop pc desktop phone cellphone tablet ipad iphone android windows mac macos linux chromebook
  wifi wi-fi internet network router modem bluetooth hotspot data signal connect connection connected
  app apps application software program browser chrome edge firefox safari website site email gmail outlook
  account password login log sign printer print scanner monitor screen display projector hdmi usb cable port
  keyboard mouse touchpad speaker speakers sound audio mic microphone camera webcam headphones earbuds headset
  battery charger charge charging power boot startup restart update updates install download upload file files
  folder storage drive disk memory ram cpu virus malware hacked scam phishing error crash crashing freeze frozen
  slow lag hang zoom teams meet word excel powerpoint office pdf device devices settings driver drivers
  turn reset reboot tunog mabagal ayaw nag-hang nabura sira gamit cellphone selpon lowbat malowbat`
    .split(/\s+/)
    .filter(Boolean),
);
// Distinctive words from the verified fixes' keywords count too, so the two lists stay in sync.
const generic = new Set([
  'will',
  'cannot',
  'takes',
  'long',
  'itself',
  'turns',
  'fake',
  'full',
  'space',
  'link',
  'keeps',
]);
for (const fix of techFixes)
  for (const keyword of fix.keywords)
    for (const word of words(keyword))
      if (word.length >= 4 && !generic.has(word)) techWords.add(word);
export const looksTechnical = (question) => words(question).some((word) => techWords.has(word));
