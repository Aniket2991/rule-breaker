const $=id=>document.getElementById(id);
const screens={home:$("home"),game:$("game"),over:$("over")};
const rules=[
 {text:"TAP BLUE",type:"color",value:"blue"},{text:"TAP RED",type:"color",value:"red"},
 {text:"TAP GREEN",type:"color",value:"green"},{text:"TAP YELLOW",type:"color",value:"yellow"},
 {text:"TAP PURPLE",type:"color",value:"purple"},{text:"TAP THE CIRCLE",type:"shape",value:"circle"},
 {text:"TAP THE SQUARE",type:"shape",value:"square"},{text:"TAP THE TRIANGLE",type:"shape",value:"triangle"},
 {text:"TAP THE SMALLEST",type:"size",value:"small"},{text:"AVOID RED",type:"avoid",value:"red"}
];
let score=0,best=Number(localStorage.rbBest||0),lives=3,round=0,timer=null,nextTimer=null,locked=false,difficulty=1900,roundToken=0;
const colors=["blue","red","green","yellow","purple"],shapes=["circle","square","triangle"];
function show(name){Object.values(screens).forEach(s=>s.classList.remove("active"));screens[name].classList.add("active")}
function start(){clearTimeout(timer);clearTimeout(nextTimer);score=0;lives=3;round=0;difficulty=1900;locked=false;roundToken++;updateHUD();show("game");nextRound()}
function updateHUD(){$("score").textContent=score;$('ruleNo').textContent=`${(round%rules.length)+1}/${rules.length}`;$('lives').textContent="♥ ".repeat(lives).trim()}
function loseLife(token){if(locked||token!==roundToken)return;locked=true;clearTimeout(timer);lives--;updateHUD();$('arena').classList.remove("shake");void $('arena').offsetWidth;$('arena').classList.add("shake");if(lives<=0){endGame();return}nextTimer=setTimeout(()=>{locked=false;nextRound()},180)}
function makeShapes(rule){
 const arena=$('arena');arena.innerHTML="";const count=5+Math.min(3,Math.floor(round/2));
 let targetIndex=Math.floor(Math.random()*count);
 if(rule.type==="avoid")targetIndex=-1;
 for(let i=0;i<count;i++){
  const el=document.createElement("div");el.className="shape";
  let color=colors[Math.floor(Math.random()*colors.length)],shape=shapes[Math.floor(Math.random()*shapes.length)],size=54+Math.random()*28;
  if(rule.type==="color"&&i===targetIndex)color=rule.value;
  if(rule.type==="shape"&&i===targetIndex)shape=rule.value;
  if(rule.type==="size"&&i===targetIndex)size=42;
  if(rule.type==="avoid"&&i===0)color="red";
  if(rule.type==="color"&&i!==targetIndex&&color===rule.value)color=colors.filter(c=>c!==rule.value)[Math.floor(Math.random()*4)];
  if(rule.type==="shape"&&i!==targetIndex&&shape===rule.value)shape=shapes.filter(s=>s!==rule.value)[Math.floor(Math.random()*2)];
  if(rule.type==="size"&&i!==targetIndex)size=54+Math.random()*28;
  el.classList.add(color,shape);
  if(shape==="triangle")el.style.borderBottomColor=getComputedStyle(el).backgroundColor;else{el.style.width=size+"px";el.style.height=size+"px"}
  el.dataset.color=color;el.dataset.shape=shape;el.dataset.size=String(size);
  const w=shape==="triangle"?68:size,h=shape==="triangle"?68:size;
  el.style.left=Math.random()*Math.max(4,arena.clientWidth-w-4)+"px";el.style.top=Math.random()*Math.max(4,arena.clientHeight-h-4)+"px";
  el.addEventListener("pointerdown",e=>{e.preventDefault();tap(el,rule)}, {passive:false});
  arena.appendChild(el);
 }
}
function correct(el,rule){
 if(rule.type==="avoid")return el.dataset.color!=="red";
 if(rule.type==="color")return el.dataset.color===rule.value;
 if(rule.type==="shape")return el.dataset.shape===rule.value;
 if(rule.type==="size"){const min=Math.min(...[...document.querySelectorAll('.shape')].map(x=>Number(x.dataset.size)));return Math.abs(Number(el.dataset.size)-min)<.01}
 return false;
}
function tap(el,rule){
 if(locked)return;
 if(correct(el,rule)){locked=true;clearTimeout(timer);score++;round++;difficulty=Math.max(700,difficulty-45);updateHUD();el.style.transform="scale(1.25)";const token=roundToken;nextTimer=setTimeout(()=>{locked=false;if(token===roundToken)nextRound()},130)}
 else loseLife(roundToken)
}
function nextRound(){
 clearTimeout(timer);clearTimeout(nextTimer);locked=false;roundToken++;
 const token=roundToken,rule=rules[round%rules.length];$('ruleText').textContent=rule.text;$('ruleNo').textContent=`${(round%rules.length)+1}/${rules.length}`;
 makeShapes(rule);const duration=difficulty;$('timerBar').style.transition="none";$('timerBar').style.width="100%";
 requestAnimationFrame(()=>{$('timerBar').style.transition=`width ${duration}ms linear`;$('timerBar').style.width="0%"});
 timer=setTimeout(()=>loseLife(token),duration);
}
function endGame(){clearTimeout(timer);clearTimeout(nextTimer);locked=true;best=Math.max(best,score);localStorage.rbBest=best;$('finalScore').textContent=score;$('bestScore').textContent=best;show("over")}
$('playBtn').onclick=start;$('againBtn').onclick=start;$('homeBtn').onclick=()=>{clearTimeout(timer);clearTimeout(nextTimer);locked=true;show("home")};show("home");