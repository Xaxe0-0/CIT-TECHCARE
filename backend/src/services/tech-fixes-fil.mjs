// Filipino (Taglish) versions of the verified fixes, keyed by the English title. Written by hand
// because the local model's Filipino is unreliable. Menu paths, button names, and shortcuts stay
// in English exactly as they appear on screen; tests check every English path is kept and every
// fix has the same number of steps.
export const filipinoFixes = {
  'Wi-Fi connected but no internet': {
    title: 'Naka-connect sa Wi-Fi pero walang internet',
    steps: [
      'Tingnan kung wala ring internet ang ibang device sa parehong Wi-Fi. Kung wala rin, ang router o ang internet provider ang may problema.',
      'I-restart ang router: tanggalin sa saksakan nang 60 segundo, isaksak ulit, at maghintay ng 2 minuto.',
      'Sa device mo, i-off at i-on ang Wi-Fi, o i-forget ang network at mag-connect ulit.',
      'Windows 11: patakbuhin ang Settings > System > Troubleshoot > Other troubleshooters > Network and Internet.',
      'Huling paraan sa Windows 11: Settings > Network & internet > Advanced network settings > Network reset (kailangan mong i-type ulit ang mga Wi-Fi password).',
    ],
  },
  'Cannot connect to Wi-Fi or Wi-Fi is missing': {
    title: 'Hindi maka-connect sa Wi-Fi o nawawala ang Wi-Fi',
    steps: [
      'Siguraduhing naka-on ang Wi-Fi at naka-off ang airplane mode.',
      'I-forget ang network, tapos mag-connect ulit at i-type nang maingat ang password.',
      'I-restart ang device at ang router.',
      'Lumapit sa router para malaman kung mahina lang ang signal.',
      'Windows 11: patakbuhin ang Settings > System > Troubleshoot > Other troubleshooters > Network and Internet. Buksan lang ang Device Manager > Network adapters para i-update o i-enable ulit ang Wi-Fi adapter.',
    ],
  },
  'Slow computer': {
    title: 'Mabagal ang computer',
    steps: [
      'I-restart ang computer; maraming pagbagal ang nawawala pagkatapos ng buong restart.',
      'Buksan ang Task Manager gamit ang Ctrl + Shift + Esc at i-sort ayon sa CPU at Memory para makita ang mabibigat na app; isara ang mga hindi mo kailangan.',
      'I-off ang mga startup app na hindi kailangan sa Settings > Apps > Startup.',
      'Magbakante ng disk space sa Settings > System > Storage at i-on ang Storage Sense; panatilihing bakante ang hindi bababa sa 15 hanggang 20 porsiyento.',
      'Mag-install ng updates sa Settings > Windows Update, tapos magpatakbo ng full scan sa Windows Security.',
    ],
  },
  'Slow or misbehaving web browser': {
    title: 'Mabagal o nagloloko ang web browser',
    steps: [
      'Isara ang mga tab na hindi mo ginagamit; gumagamit ng memory ang bawat tab.',
      'Sa Chrome, pindutin ang Shift + Esc para buksan ang Chrome Task Manager at i-end ang mabibigat na tab o extension.',
      'I-off ang mga extension na hindi mo kailangan sa chrome://extensions.',
      'I-clear ang cached images and files gamit ang Ctrl + Shift + Delete (pumili ng time range, tapos i-clear).',
      'I-update ang browser mula sa menu nito sa Help > About, tapos i-restart ito.',
    ],
  },
  'No sound on a Windows computer': {
    title: 'Walang tunog sa Windows computer',
    steps: [
      'Tingnan na hindi naka-mute ang volume icon sa taskbar at nakataas ang volume.',
      'Sa Settings > System > Sound, piliin ang tamang output device (speakers o headphones).',
      'Tanggalin at ikabit ulit ang headphones o USB/Bluetooth audio device.',
      'Patakbuhin ang Settings > System > Troubleshoot > Other troubleshooters > Audio.',
      'I-restart ang computer at mag-install ng updates sa Settings > Windows Update.',
    ],
  },
  'Microphone or camera not working (Windows)': {
    title: 'Ayaw gumana ng microphone o camera (Windows)',
    steps: [
      'Isara ang ibang app na posibleng gumagamit ng camera o microphone.',
      'Payagan ang access sa Settings > Privacy & security > Camera o Microphone, pati para sa desktop apps.',
      'Piliin ang tamang input sa Settings > System > Sound > Input, at piliin din ang parehong device sa loob ng Zoom, Meet, o Teams.',
      'Tingnan kung may pisikal na takip ang camera o may mute key sa keyboard.',
      'I-restart ang computer at subukan ulit.',
    ],
  },
  'Printer shows offline (Windows 11)': {
    title: 'Offline ang printer (Windows 11)',
    steps: [
      'I-off at i-on ang printer, at tingnan ang cable nito o kung nasa parehong Wi-Fi network ito ng computer.',
      'Buksan ang Settings > Bluetooth & devices > Printers & scanners, piliin ang printer, at buksan ang print queue.',
      'Sa print queue, siguraduhing hindi naka-check ang "Use printer offline", at i-cancel ang mga naipit na print job.',
      'Gawin itong default printer o piliin ulit ito sa print window.',
      'Kung offline pa rin, tanggalin doon ang printer at i-add ulit.',
    ],
  },
  'Bluetooth device will not pair or connect': {
    title: 'Ayaw mag-pair o mag-connect ng Bluetooth device',
    steps: [
      'I-off at i-on ang Bluetooth sa phone o computer at sa accessory, at i-charge ang accessory.',
      'Ilagay ang accessory sa pairing mode (kadalasan, pindutin nang matagal ang power o pairing button hanggang kumislap ang ilaw).',
      'Tanggalin ang lumang pairing, tapos mag-pair ulit: iPhone Settings > Bluetooth > (i) > Forget This Device; Android Settings > Connected devices or Connections > Bluetooth; Windows Settings > Bluetooth & devices.',
      'I-disconnect ang accessory sa ibang phone o computer na malapit.',
      'I-restart ang phone o computer at subukan ulit.',
    ],
  },
  'Laptop not charging': {
    title: 'Ayaw mag-charge ng laptop',
    steps: [
      'Tingnan ang magkabilang dulo ng charger at sumubok ng ibang saksakan.',
      'Hanapin ang charging light; kung sira ang cable o plug, huwag na itong gamitin.',
      'I-shut down ang laptop, tanggalin sa saksakan, tapos i-charge nang 30 minuto bago i-on.',
      'Mag-install ng updates sa Settings > Windows Update at tingnan ang detalye ng battery sa Settings > System > Power & battery.',
      'Kung ayaw pa ring mag-charge, ipatingin ang charger o battery; gamitin lang ang original o aprubadong charger.',
    ],
  },
  'Laptop or computer will not turn on or has a black screen': {
    title: 'Ayaw mag-on o itim ang screen ng laptop o computer',
    steps: [
      'Isaksak ang charger at maghintay ng 15 hanggang 30 minuto kung sakaling ubos na ang battery.',
      'Pindutin nang matagal ang power button nang 15 hanggang 30 segundo, bitawan, tapos pindutin ulit nang isang beses.',
      'Tanggalin ang mga USB drive, dock, at iba pang accessory, tapos subukan ulit.',
      'Kung may naririnig kang fan o may ilaw pero walang display, lakasan ang brightness o mag-connect ng external monitor.',
      'Kung walang tumutugon, ipatingin ito sa qualified na technician.',
    ],
  },
  'App or computer frozen': {
    title: 'Nag-hang ang app o computer',
    steps: [
      'Maghintay ng isang minuto kung sakaling may tinatapos pa ang app.',
      'Windows: pindutin ang Ctrl + Shift + Esc, piliin ang app sa Task Manager, at piliin ang End task.',
      'Phone: isara ang app mula sa recent apps, tapos buksan ulit.',
      'I-restart ang device kung buong system ang naka-hang; pindutin nang matagal ang power button bilang huling paraan lang.',
      'I-update ang app at ang system, at i-reinstall ang app kung paulit-ulit itong nagka-crash.',
    ],
  },
  'Phone or computer storage full': {
    title: 'Puno na ang storage ng phone o computer',
    steps: [
      'iPhone: tingnan ang Settings > General > iPhone Storage at i-offload ang mga app na bihira mong gamitin.',
      'Android: buksan ang Settings > Storage, o gamitin ang Files app para linisin ang junk files.',
      'Windows: buksan ang Settings > System > Storage at i-on ang Storage Sense.',
      'Burahin o i-back up ang malalaking video at download, at i-empty ang trash o Recycle Bin.',
      'I-clear ang malalaking app cache, gaya ng messaging apps na kusang nagse-save ng media.',
    ],
  },
  'Windows Update stuck or failing': {
    title: 'Naiipit o pumapalya ang Windows Update',
    steps: [
      'Panatilihing nakasaksak ang computer at maghintay; puwedeng umabot ng isang oras ang malalaking update.',
      'I-restart ang computer at subukan ulit ang Settings > Windows Update.',
      'Patakbuhin ang Settings > System > Troubleshoot > Other troubleshooters > Windows Update.',
      'Magbakante ng disk space sa Settings > System > Storage.',
      'Kung paulit-ulit ang parehong error, isulat ang error code at humingi ng tulong.',
    ],
  },
  'Second screen or projector not showing': {
    title: 'Walang lumalabas sa second screen o projector',
    steps: [
      'Siguraduhing mahigpit ang pagkakakabit ng cable sa magkabilang dulo at nasa tamang input ang display.',
      'Pindutin ang Windows key + P at piliin ang Duplicate o Extend.',
      'Buksan ang Settings > System > Display, tapos sa ilalim ng Multiple displays, piliin ang Detect.',
      'Sumubok ng ibang cable o port, o ng adapter kung USB-C ang gamit ng laptop.',
      'I-restart ang computer habang naka-connect ang display.',
    ],
  },
  'Keyboard or mouse not working': {
    title: 'Ayaw gumana ng keyboard o mouse',
    steps: [
      'Para sa wireless device, palitan o i-charge ang battery at i-off at i-on ito.',
      'Ikabit ulit ang USB device o sumubok ng ibang USB port.',
      'Hanapin ang touchpad on/off key (kadalasang function key) at ang Settings > Bluetooth & devices > Touchpad sa Windows.',
      'I-pair ulit ang Bluetooth device sa Settings > Bluetooth & devices.',
      'Kung mali ang lumalabas na letra, pindutin ang Windows key + Space para magpalit ng keyboard layout, o tingnan ang Settings > Time & language > Language & region.',
      'I-restart ang computer.',
    ],
  },
  'Deleted file recovery': {
    title: 'Pagbawi ng nabura na file',
    steps: [
      'Tingnan ang Recycle Bin (Windows) o Trash (Mac), piliin ang file, at i-restore ito.',
      'Hanapin ang pangalan ng file sa File Explorer o Finder kung sakaling nailipat lang ito.',
      'Kung nasa OneDrive o Google Drive ito, tingnan ang recycle bin ng serbisyong iyon sa website nila.',
      'Huwag munang mag-save ng bagong file sa drive na iyon hangga’t hindi mo ito nakikita.',
      'Regular na i-back up ang mahahalagang file para hindi ito mawala.',
    ],
  },
  'Virus, malware, or unwanted pop-ups': {
    title: 'Virus, malware, o mga pop-up na hindi gusto',
    steps: [
      'Mag-disconnect sa internet kung may nakikita kang ransom message o kusang nagbabago ang mga file.',
      'Buksan ang Settings > Privacy & security > Windows Security > Virus & threat protection at i-update ang protection.',
      'Sa Scan options, magpatakbo ng Full scan at tanggalin ang anumang makita nito.',
      'Kung tuloy pa rin ang problema, patakbuhin ang Microsoft Defender Offline scan sa parehong Scan options page; magre-restart ang computer para mag-scan.',
      'I-uninstall ang mga program na hindi mo kilala sa Settings > Apps > Installed apps, at tanggalin ang mga hindi kilalang browser extension.',
      'Palitan ang mahahalagang password gamit ang malinis na device at i-on ang two-step verification.',
    ],
  },
  'Mouse scrolling or pointer jumps': {
    title: 'Tumatalon ang scroll o pointer ng mouse',
    steps: [
      'Gamitin ang mouse sa malinis at hindi makintab na surface o sa mouse pad, at dahan-dahang linisin ang sensor at wheel.',
      'Palitan o i-charge ang battery, o ilipat ang USB receiver sa ibang port na mas malapit sa mouse.',
      'I-adjust ang scroll amount sa Settings > Bluetooth & devices > Mouse ("Lines to scroll at a time").',
      'Subukan ang mouse sa ibang computer; kung doon din may problema, malamang luma na ang mouse.',
      'I-restart ang computer at mag-install ng updates sa Settings > Windows Update.',
    ],
  },
  'Phone running slow': {
    title: 'Mabagal ang phone',
    steps: [
      'I-restart ang phone.',
      'Siguraduhing bakante ang hindi bababa sa 10 porsiyento ng storage; burahin ang malalaking video o app na hindi ginagamit.',
      'I-install ang pinakabagong system update at i-update ang mga app mo.',
      'Isara ang mga app na hindi mo ginagamit, at i-off ang live wallpaper o widget na hindi mo kailangan.',
      'Kung isang app lang ang mabagal, i-clear ang cache nito (Android) o i-offload at i-reinstall ito (iPhone).',
    ],
  },
  'Slow internet speed': {
    title: 'Mabagal ang internet',
    steps: [
      'Magpatakbo ng speed test, tapos ikumpara sa ibang device sa parehong network.',
      'I-restart ang router: tanggalin sa saksakan nang 60 segundo, isaksak ulit, at maghintay ng 2 minuto.',
      'Lumapit sa router, o lumipat sa 5 GHz network nito kung mayroon para mas mabilis kapag malapit.',
      'I-pause ang malalaking download, update, at video streaming sa ibang device.',
      'Kung mabagal pa rin sa lahat ng device, tawagan ang internet provider mo.',
    ],
  },
  'How to take a screenshot': {
    title: 'Paano mag-screenshot',
    steps: [
      'Windows: pindutin ang Windows key + Shift + S para pumili ng bahagi gamit ang Snipping Tool, o Windows key + Print Screen para i-save ang buong screen sa Pictures > Screenshots.',
      'Mac: pindutin ang Shift + Command + 3 para sa buong screen, Shift + Command + 4 para sa isang bahagi, o Shift + Command + 5 para sa iba pang option.',
      'Android: sabay na pindutin ang Power + Volume Down.',
      'iPhone na may Face ID: pindutin ang side button + Volume Up. iPhone na may Home button: pindutin ang side o top button + Home.',
      'Itago ang mga password at personal na detalye bago i-share ang screenshot.',
    ],
  },
  'Screen flickering (Windows)': {
    title: 'Kumikislap ang screen (Windows)',
    steps: [
      'Buksan ang Task Manager gamit ang Ctrl + Shift + Esc. Kung kumikislap din ang Task Manager, malamang ang display driver ang dahilan; kung hindi, may app na dahilan.',
      'Kung display driver ang dahilan, mag-install ng updates sa Settings > Windows Update, pati ang optional driver updates.',
      'Kung app ang dahilan, i-update o i-uninstall ang mga bagong install na app sa Settings > Apps > Installed apps.',
      'Tingnan ang refresh rate sa Settings > System > Display > Advanced display, at ikabit ulit o palitan ang cable ng external monitor.',
      'Kung kumikislap ang screen kahit habang nag-i-startup, ipatingin ang display sa technician.',
    ],
  },
  'Phone restarting by itself': {
    title: 'Kusang nagre-restart ang phone',
    steps: [
      'I-install ang pinakabagong system update at i-update ang lahat ng app.',
      'Magbakante ng storage para may hindi bababa sa 10 porsiyentong libre.',
      'I-uninstall ang mga app na in-install mo bago nagsimula ang pag-restart.',
      'iPhone: tingnan ang Settings > Battery > Battery Health & Charging; puwedeng magdulot ng biglang pag-shutdown ang lumang battery. Android: tingnan ang battery health sa Settings > Battery kung ipinapakita ito ng phone mo.',
      'Kung patuloy pa ring nagre-restart, i-back up ang data mo at ipatingin sa technician bago subukan ang factory reset.',
    ],
  },
  'Laptop fan loud or running constantly': {
    title: 'Maingay o laging umaandar ang fan ng laptop',
    steps: [
      'Buksan ang Task Manager gamit ang Ctrl + Shift + Esc at isara ang mga app na malakas gumamit ng CPU.',
      'Gamitin ang laptop sa matigas at patag na surface para hindi matakpan ang mga vent.',
      'Habang naka-shut down at hindi nakasaksak ang laptop, dahan-dahang alisin ang alikabok sa mga vent sa labas.',
      'Mag-install ng updates sa Settings > Windows Update.',
      'Kung kumakalansing, gumagaralgal, o maingay pa rin ang fan kahit walang ginagawa, ipatingin ito sa technician.',
    ],
  },
  'Battery drains too fast': {
    title: 'Mabilis maubos ang battery',
    steps: [
      'Hinaan ang screen brightness at isara ang mga app na hindi mo ginagamit.',
      'Windows 11: tingnan kung aling app ang pinakamalakas sa battery sa Settings > System > Power & battery > Battery usage, at i-on doon ang Energy saver o Battery saver.',
      'Android: tingnan ang usage sa Settings > Battery at i-on ang power saving mode. iPhone: tingnan ang Settings > Battery at i-on ang Low Power Mode.',
      'I-off ang Bluetooth, location, at Wi-Fi kapag hindi mo kailangan.',
      'Mag-install ng system at app updates. Kung mabilis pa ring maubos ang battery o maagang namamatay ang device, ipatingin ang battery.',
    ],
  },
  'Device overheating': {
    title: 'Sobrang init ng device',
    steps: [
      'Kung namamaga ang battery, o may usok o amoy na nasusunog, itigil ang paggamit ng device at magpatingin sa qualified na technician.',
      'Huwag takpan ang mga vent: gamitin ang laptop sa matigas at patag na surface, hindi sa kama o unan.',
      'Isara ang mabibigat na app at game, at iwasang mag-charge habang gumagawa ng mabibigat na gawain.',
      'Ilayo ang device sa direktang sikat ng araw at sa mainit na sasakyan.',
      'Mag-install ng system updates; kung sobrang init pa rin sa normal na paggamit, ipatingin ito sa technician.',
    ],
  },
  'Word, Excel, or PowerPoint crashing or not opening': {
    title: 'Nagka-crash o ayaw bumukas ng Word, Excel, o PowerPoint',
    steps: [
      'I-save ang trabaho mo, isara nang tuluyan ang app, at buksan ulit.',
      'Buksan ang app sa safe mode: pindutin nang matagal ang Ctrl habang binubuksan ito at piliin ang Yes. Kung gumagana roon, malamang add-in ang dahilan.',
      'I-off ang mga add-in sa File > Options > Add-ins (piliin ang COM Add-ins > Go).',
      'I-update ang Office sa File > Account > Update Options > Update Now.',
      'I-repair ang Office sa Settings > Apps > Installed apps: piliin ang Microsoft 365 o Office > Modify > Quick Repair.',
    ],
  },
  'Suspicious email, message, or link': {
    title: 'Kahina-hinalang email, message, o link',
    steps: [
      'Huwag i-click ang mga link, huwag buksan ang attachment, at huwag sumagot.',
      'I-verify ang nagpadala sa opisyal na paraang pinagkakatiwalaan mo na, hindi sa contact details na nasa message.',
      'Kung nailagay mo ang password mo, palitan ito agad sa opisyal na website at i-on ang two-step verification.',
      'Magpatakbo ng full scan gamit ang Windows Security o ang built-in na proteksyon ng device mo.',
      'I-report ang message bilang phishing sa email app mo at burahin ito.',
    ],
  },
  'Forgot an account password': {
    title: 'Nakalimutan ang password ng account',
    steps: [
      'Gamitin ang opisyal na "Forgot password" link sa mismong website o app ng serbisyo.',
      'Tingnan ang email o phone mo para sa reset message, pati ang spam folder.',
      'Huwag kailanman ibigay ang verification code o password kahit kanino, pati sa mga nag-aalok ng tulong.',
      'Pumili ng bago at natatanging password at i-on ang two-step verification.',
      'Para sa school account, kontakin ang opisyal na IT help desk ng school mo.',
    ],
  },
};
