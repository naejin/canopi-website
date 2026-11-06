// One language and theme of the home page's captures, from the live Canopi Web, in a clean browser.
// usage: PLAYWRIGHT=<dir>/node_modules/playwright node capture.cjs <workdir> <lang> <light|dark>
// Reads <workdir>/designs/<lang>.canopi (make-example.py); writes <workdir>/cap/<lang>-<theme>/*.png.
// crop.py turns those into public/home/. The rail coordinates below are for Canopi Web 2.0.3.
const {chromium}=require(process.env.PLAYWRIGHT);
const fs=require('fs');const [,,S,l,th]=process.argv;
const BCP={en:'en-US',fr:'fr-FR',es:'es-ES',pt:'pt-BR',it:'it-IT',zh:'zh-CN',de:'de-DE',ja:'ja-JP',ko:'ko-KR',nl:'nl-NL',ru:'ru-RU'};
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});

  const out=`${S}/cap/${l}-${th}`;fs.mkdirSync(out,{recursive:true});
  const c=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1.5,colorScheme:th,locale:BCP[l]});
  await c.addInitScript(([l,th])=>{localStorage.setItem('canopi:web-app-data:v3:settings',JSON.stringify({version:3,settings:{locale:l,theme:th}}))},[l,th]);
  const p=await c.newPage();
  await p.addInitScript(t=>{const k=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.type==='file'){const d=new DataTransfer();d.items.add(new File([t],'example.canopi'));this.files=d.files;this.dispatchEvent(new Event('change'));return;}return k.call(this)}},fs.readFileSync(`${S}/designs/${l}.canopi`,'utf8'));
  await p.goto('https://web.projectcanopi.com/');await p.waitForTimeout(2500);
  await p.locator('[data-web-command-id="file.openCanopi"]').first().click();await p.mouse.move(700,860);await p.waitForTimeout(8000);
  // The tool tip would be cut in half by the phone crop.
  await p.evaluate(()=>{for(const el of document.querySelectorAll('[role=status][aria-live=polite]')){const r=el.getBoundingClientRect();if(r.height>0&&r.left>200&&r.right<900&&r.top<170){el.parentElement.parentElement.style.display='none';return}}});await p.waitForTimeout(400);
  await p.screenshot({path:`${out}/map.png`});
  await p.mouse.click(1401,181);await p.mouse.move(700,860);
  let t=0;for(;t<90;t+=3){await p.waitForTimeout(3000);if(await p.evaluate(()=>/175[\s.,  ]?473/.test(document.body.innerText)))break;}
  await p.waitForTimeout(5000);await p.screenshot({path:`${out}/catalog.png`});
  await p.mouse.click(1401,181);await p.waitForTimeout(500);
  for(const [f,y] of [['calendar',273],['consortium',359]]){await p.mouse.click(1401,y);await p.mouse.move(700,860);await p.waitForTimeout(4000);await p.screenshot({path:`${out}/${f}.png`});await p.mouse.click(1401,y);await p.waitForTimeout(300);}
  console.log(l,th,'catalog wait',t);
 await b.close();
})().catch(e=>{console.error(l,th,e.message);process.exit(1)});
